import { createHash } from "crypto";
import { ActivationPlan } from "@lastrack/contracts";

export interface RankedCandidate<T = any> {
  entityId: string;
  name: string;
  category: string;
  affinityScore: number;
  rank: number;
  metadata?: T;
}

export interface BatchRankingResult {
  batchId: string;
  optionType: string;
  querySignalEntityIds: string[];
  rankedCandidates: RankedCandidate[];
  rankDigest: string;
  executedAt: string;
}

export interface RankDigestInput {
  domain: string;
  orderedInputOptions: string[];
  signals: string[];
  orderedRankResults: string[];
  scores?: number[];
  requestId: string;
}

/**
 * Computes a deterministic canonical integrity digest from:
 * 1. domain / option type
 * 2. ordered input options
 * 3. input signals
 * 4. returned ordered rank results
 * 5. returned scores when supplied
 * 6. canonical request / correlation identifier
 *
 * NOTE: Never uses Date.now() or nondeterministic inputs.
 * This is an integrity checksum/digest, not a cryptographic signature.
 */
export function computeRankDigest(input: RankDigestInput): string {
  const canonicalPayload = JSON.stringify({
    domain: String(input.domain || "").toLowerCase().trim(),
    inputOptions: Array.isArray(input.orderedInputOptions) ? [...input.orderedInputOptions] : [],
    signals: Array.isArray(input.signals) ? [...input.signals] : [],
    rankedResults: Array.isArray(input.orderedRankResults) ? [...input.orderedRankResults] : [],
    scores: Array.isArray(input.scores) && input.scores.length > 0
      ? input.scores.map((s) => (typeof s === "number" && !isNaN(s) ? Number(s.toFixed(4)) : 0))
      : [],
    requestId: String(input.requestId || "").trim(),
  });

  return `sha256:${createHash("sha256").update(canonicalPayload).digest("hex")}`;
}

/**
 * Infers the entity domain for an activation plan from scoreContext or plan mechanism.
 */
export function inferPlanDomain(plan: ActivationPlan): string {
  if (plan.scoreContext?.domain) {
    return plan.scoreContext.domain.toLowerCase().trim();
  }
  const batchId = plan.scoreContext?.batchRankCallId || "";
  const match = batchId.match(/^batch_([a-zA-Z0-9]+)_/);
  if (match && match[1]) {
    return match[1].toLowerCase().trim();
  }
  if (plan.mechanism === "DISPLAY") return "movie";
  if (plan.mechanism === "BUNDLE") return "brand";
  if (plan.mechanism === "LOCAL_ACTIVATION") return "place";
  return "general";
}

/**
 * Validates that all candidate options within a comparable entity domain were evaluated
 * in a single Qloo batch call ("one qloo_rank batch per comparable entity domain").
 *
 * Rules:
 * 1. Multiple domains may correctly use different batch IDs.
 * 2. Plans in the same entity domain must share one batch ID.
 * 3. Cross-domain scores are never directly compared.
 * 4. Multiple batch IDs inside one domain fail the invariant.
 * 5. Missing rank evidence is accepted only when unranked/degraded.
 */
export function validateSingleQueryRankingInvariant(
  plans: ActivationPlan[]
): {
  valid: boolean;
  batchIds: string[];
  batchIdsByDomain: Record<string, string[]>;
  error?: string;
} {
  const batchIdsByDomain: Record<string, Set<string>> = {};
  const allBatchIds = new Set<string>();

  for (const plan of plans) {
    // Missing rank evidence is accepted when unranked/degraded
    if (!plan.scoreContext?.batchRankCallId) {
      continue;
    }

    const domain = inferPlanDomain(plan);
    const batchId = plan.scoreContext.batchRankCallId;
    allBatchIds.add(batchId);

    if (!batchIdsByDomain[domain]) {
      batchIdsByDomain[domain] = new Set<string>();
    }
    batchIdsByDomain[domain].add(batchId);
  }

  // Check each domain: all plans inside the same domain MUST share one single batch ID
  for (const [domain, domainBatchIds] of Object.entries(batchIdsByDomain)) {
    if (domainBatchIds.size > 1) {
      return {
        valid: false,
        batchIds: Array.from(allBatchIds),
        batchIdsByDomain: Object.fromEntries(
          Object.entries(batchIdsByDomain).map(([d, set]) => [d, Array.from(set)])
        ),
        error: `Cross-request comparison detected within domain "${domain}"! Plans in the same entity domain reference multiple distinct batch IDs: ${Array.from(domainBatchIds).join(", ")}. Invariant requires one qloo_rank batch per comparable entity domain.`,
      };
    }
  }

  return {
    valid: true,
    batchIds: Array.from(allBatchIds),
    batchIdsByDomain: Object.fromEntries(
      Object.entries(batchIdsByDomain).map(([d, set]) => [d, Array.from(set)])
    ),
  };
}
