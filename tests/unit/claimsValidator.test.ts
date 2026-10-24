import { describe, it, expect } from "vitest";
import { validateClaims } from "@lastrack/domain";
import { DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { ActivationPlan } from "@lastrack/contracts";

describe("claimsValidator", () => {
  const validPlans = DEMO_AGENT_RUN.plans;
  const validEvidence = DEMO_AGENT_RUN.evidence;

  it("passes clean plans with no violations", () => {
    const violations = validateClaims(validPlans, validEvidence);
    expect(violations).toEqual([]);
  });

  it("rejects sales guarantees and uplift promises", () => {
    const badPlan: ActivationPlan = {
      ...validPlans[0],
      title: "Guaranteed Sales Booster",
      hypothesis: "This campaign will definitely increase sales by 50% guaranteed revenue.",
    };

    const violations = validateClaims([badPlan], validEvidence);
    expect(violations.some((v) => v.code === "FORBIDDEN_SALES_PROMISE")).toBe(true);
  });

  it("rejects false causal claims", () => {
    const badPlan: ActivationPlan = {
      ...validPlans[0],
      hypothesis: "Qloo proves causation between indie cinema affinity and linen jacket purchases.",
    };

    const violations = validateClaims([badPlan], validEvidence);
    expect(violations.some((v) => v.code === "FORBIDDEN_CAUSAL_CLAIM")).toBe(true);
  });

  it("rejects unsupported endorsement claims", () => {
    const badPlan: ActivationPlan = {
      ...validPlans[0],
      actions: ["Announce official partnership with A24 for this item launch"],
    };

    const violations = validateClaims([badPlan], validEvidence);
    expect(violations.some((v) => v.code === "UNSUPPORTED_ENDORSEMENT_CLAIM")).toBe(true);
  });

  it("rejects prohibited sensitive demographic profiling", () => {
    const badPlan: ActivationPlan = {
      ...validPlans[0],
      hypothesis: "Target customers based on religion and political party affiliation.",
    };

    const violations = validateClaims([badPlan], validEvidence);
    expect(violations.some((v) => v.code === "SENSITIVE_TRAIT_VIOLATION")).toBe(true);
  });

  it("flags plans that lack any linked evidence nodes", () => {
    const ungroundedPlan: ActivationPlan = {
      ...validPlans[0],
      evidenceNodeIds: [],
    };

    const violations = validateClaims([ungroundedPlan], validEvidence);
    expect(violations.some((v) => v.code === "UNGROUNDED_PLAN")).toBe(true);
  });

  it("flags dangling evidence references", () => {
    const danglingPlan: ActivationPlan = {
      ...validPlans[0],
      evidenceNodeIds: ["non-existent-node-999"],
    };

    const violations = validateClaims([danglingPlan], validEvidence);
    expect(violations.some((v) => v.code === "DANGLING_EVIDENCE_LINK")).toBe(true);
  });

  it("flags cultural entities mentioned in plan without supporting evidence", () => {
    const ungroundedEntityPlan: ActivationPlan = {
      ...validPlans[0],
      culturalEntityNames: ["Completely Unrelated Band XYZ"],
    };

    const violations = validateClaims([ungroundedEntityPlan], validEvidence);
    expect(violations.some((v) => v.code === "UNGROUNDED_CULTURAL_ENTITY")).toBe(true);
  });
});
