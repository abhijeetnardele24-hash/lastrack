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
 * Validates that all candidate options within a domain or category were evaluated in a single Qloo batch call.
 * Comparing scores across different request IDs is an invalid operation under Qloo's ranking model.
 */
export function validateSingleQueryRankingInvariant(
  plans: ActivationPlan[]
): { valid: boolean; batchIds: string[]; error?: string } {
  const batchIds = new Set<string>();

  for (const plan of plans) {
    if (plan.scoreContext?.batchRankCallId) {
      batchIds.add(plan.scoreContext.batchRankCallId);
    }
  }

  // All plans generated from the same run batch should reference consistent single-batch context
  if (batchIds.size > 1) {
    return {
      valid: false,
      batchIds: Array.from(batchIds),
      error: `Cross-request comparison detected! Plans reference multiple distinct batch IDs: ${Array.from(batchIds).join(", ")}. Invariant requires a single batch call for comparable rankings.`,
    };
  }

  return {
    valid: true,
    batchIds: Array.from(batchIds),
  };
}
