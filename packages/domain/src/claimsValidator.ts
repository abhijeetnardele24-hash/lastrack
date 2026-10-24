import { EvidenceNode, ActivationPlan } from "@lastrack/contracts";

export interface ClaimValidationViolation {
  code: string;
  message: string;
  target: string;
}

const FORBIDDEN_SALES_PATTERNS = [
  /guarantee(d)?\s+(sales|revenue|uplift|profit)/i,
  /will\s+(definitely\s+)?increase\s+sales/i,
  /\b\d+(\.\d+)?(x|%)\s+more\s+likely\s+to\s+buy\b/i,
  /proven\s+(to\s+boost|roi|conversion)/i,
  /predict(s|ed|ing)?\s+(exact\s+)?revenue/i,
];

const FORBIDDEN_CAUSALITY_PATTERNS = [
  /qloo\s+proves\s+causation/i,
  /affinity\s+causes\s+(demand|sales|traffic)/i,
];

const FORBIDDEN_ENDORSEMENT_PATTERNS = [
  /official\s+(partnership|endorsement|collaboration)\s+with/i,
  /has\s+signed\s+on\s+to\s+promote/i,
  /endorsed\s+by\s+[A-Z]/,
];

const FORBIDDEN_SENSITIVE_TRAITS = [
  /\b(race|ethnicity|religion|political\s+party|sexual\s+orientation|health\s+condition)\b/i,
  /\b(individual|personal)\s+tracking\s+data\b/i,
];

export function validateClaims(
  plans: ActivationPlan[],
  evidenceNodes: EvidenceNode[]
): ClaimValidationViolation[] {
  const violations: ClaimValidationViolation[] = [];
  const evidenceMap = new Map(evidenceNodes.map((n) => [n.id, n]));

  for (const plan of plans) {
    // 1. Check hypothesis and title text for forbidden promises
    const textToCheck = `${plan.title} ${plan.hypothesis} ${plan.actions.join(" ")}`;

    for (const pattern of FORBIDDEN_SALES_PATTERNS) {
      if (pattern.test(textToCheck)) {
        violations.push({
          code: "FORBIDDEN_SALES_PROMISE",
          message: `Plan "${plan.title}" contains forbidden sales guarantee or unsupported uplift phrasing.`,
          target: plan.id,
        });
      }
    }

    for (const pattern of FORBIDDEN_CAUSALITY_PATTERNS) {
      if (pattern.test(textToCheck)) {
        violations.push({
          code: "FORBIDDEN_CAUSAL_CLAIM",
          message: `Plan "${plan.title}" falsely equates cultural affinity with causal demand.`,
          target: plan.id,
        });
      }
    }

    for (const pattern of FORBIDDEN_ENDORSEMENT_PATTERNS) {
      if (pattern.test(textToCheck)) {
        violations.push({
          code: "UNSUPPORTED_ENDORSEMENT_CLAIM",
          message: `Plan "${plan.title}" claims an endorsement or commercial partnership not verified by Qloo data.`,
          target: plan.id,
        });
      }
    }

    for (const pattern of FORBIDDEN_SENSITIVE_TRAITS) {
      if (pattern.test(textToCheck)) {
        violations.push({
          code: "SENSITIVE_TRAIT_VIOLATION",
          message: `Plan "${plan.title}" references prohibited sensitive demographic or individual tracking traits.`,
          target: plan.id,
        });
      }
    }

    // 2. Check evidence node linkage
    if (!plan.evidenceNodeIds || plan.evidenceNodeIds.length === 0) {
      violations.push({
        code: "UNGROUNDED_PLAN",
        message: `Plan "${plan.title}" does not reference any evidence nodes in the evidence ledger.`,
        target: plan.id,
      });
    } else {
      for (const eId of plan.evidenceNodeIds) {
        if (!evidenceMap.has(eId)) {
          violations.push({
            code: "DANGLING_EVIDENCE_LINK",
            message: `Plan "${plan.title}" references non-existent evidence node id "${eId}".`,
            target: plan.id,
          });
        }
      }
    }

    // 3. Cultural entity mentions must have supporting evidence
    for (const entityName of plan.culturalEntityNames) {
      const hasSupportingEvidence = plan.evidenceNodeIds.some((eId) => {
        const node = evidenceMap.get(eId);
        if (!node) return false;
        return (
          node.statement.toLowerCase().includes(entityName.toLowerCase()) ||
          node.entityNames?.some((en) => en.toLowerCase() === entityName.toLowerCase())
        );
      });

      if (!hasSupportingEvidence) {
        violations.push({
          code: "UNGROUNDED_CULTURAL_ENTITY",
          message: `Plan "${plan.title}" mentions entity "${entityName}" without supporting evidence in its linked ledger nodes.`,
          target: plan.id,
        });
      }
    }
  }

  return violations;
}
