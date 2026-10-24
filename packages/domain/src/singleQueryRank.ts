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
  querySignalEntityIds: string[];
  rankedCandidates: RankedCandidate[];
  executedAt: string;
}

/**
 * Validates that all candidate options within a category were evaluated in the same single Qloo batch call.
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
