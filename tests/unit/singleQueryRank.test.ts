import { describe, it, expect } from "vitest";
import { validateSingleQueryRankingInvariant, computeRankDigest } from "@lastrack/domain";
import { DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { ActivationPlan } from "@lastrack/contracts";

describe("singleQueryRank invariant", () => {
  it("passes when all plans are grounded in the same batch rank call", () => {
    const plans: ActivationPlan[] = DEMO_AGENT_RUN.plans.map((p) => ({
      ...p,
      scoreContext: {
        domain: "curated",
        batchRankCallId: "qloo-batch-req-001",
        withinQueryRank: 1,
      },
    }));

    const result = validateSingleQueryRankingInvariant(plans);
    expect(result.valid).toBe(true);
    expect(result.batchIds).toEqual(["qloo-batch-req-001"]);
    expect(result.error).toBeUndefined();
  });

  it("passes when multiple domains correctly use different batch IDs (simultaneous movie, brand, and place plans)", () => {
    const multiDomainPlans: ActivationPlan[] = [
      {
        ...DEMO_AGENT_RUN.plans[0],
        mechanism: "DISPLAY",
        scoreContext: {
          domain: "movie",
          batchRankCallId: "batch_movie_001",
          withinQueryRank: 1,
        },
      },
      {
        ...DEMO_AGENT_RUN.plans[1],
        mechanism: "BUNDLE",
        scoreContext: {
          domain: "brand",
          batchRankCallId: "batch_brand_002",
          withinQueryRank: 1,
        },
      },
      {
        ...DEMO_AGENT_RUN.plans[2],
        mechanism: "LOCAL_ACTIVATION",
        scoreContext: {
          domain: "place",
          batchRankCallId: "batch_place_003",
          withinQueryRank: 1,
        },
      },
    ];

    const result = validateSingleQueryRankingInvariant(multiDomainPlans);
    expect(result.valid).toBe(true);
    expect(result.batchIds).toHaveLength(3);
    expect(result.batchIdsByDomain.movie).toEqual(["batch_movie_001"]);
    expect(result.batchIdsByDomain.brand).toEqual(["batch_brand_002"]);
    expect(result.batchIdsByDomain.place).toEqual(["batch_place_003"]);
    expect(result.error).toBeUndefined();
  });

  it("fails invariant when plans in the same entity domain reference distinct batch IDs", () => {
    const mixedSameDomainPlans: ActivationPlan[] = [
      {
        ...DEMO_AGENT_RUN.plans[0],
        mechanism: "DISPLAY",
        scoreContext: {
          domain: "movie",
          batchRankCallId: "batch_movie_call_A",
          withinQueryRank: 1,
        },
      },
      {
        ...DEMO_AGENT_RUN.plans[1],
        mechanism: "DISPLAY",
        scoreContext: {
          domain: "movie",
          batchRankCallId: "batch_movie_call_B",
          withinQueryRank: 2,
        },
      },
    ];

    const result = validateSingleQueryRankingInvariant(mixedSameDomainPlans);
    expect(result.valid).toBe(false);
    expect(result.batchIds.length).toBe(2);
    expect(result.error).toContain('Cross-request comparison detected within domain "movie"');
  });

  it("passes when plans omit scoreContext or share zero batch IDs (accepted when unranked/degraded)", () => {
    const plansWithoutScores: ActivationPlan[] = DEMO_AGENT_RUN.plans.map((p) => ({
      ...p,
      scoreContext: undefined,
    }));

    const result = validateSingleQueryRankingInvariant(plansWithoutScores);
    expect(result.valid).toBe(true);
    expect(result.batchIds).toEqual([]);
  });

  describe("computeRankDigest integrity checksum", () => {
    const baseInput = {
      domain: "film",
      orderedInputOptions: ["opt-1", "opt-2"],
      signals: ["sig-a", "sig-b"],
      orderedRankResults: ["opt-2", "opt-1"],
      scores: [0.95, 0.82],
      requestId: "req-fixed-uuid-1234",
    };

    it("produces identical SHA-256 digest on repeated calls with identical inputs (determinism)", () => {
      const digest1 = computeRankDigest(baseInput);
      const digest2 = computeRankDigest({ ...baseInput });
      expect(digest1).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(digest1).toBe(digest2);
    });

    it("changes digest when domain changes", () => {
      const digest1 = computeRankDigest(baseInput);
      const digest2 = computeRankDigest({ ...baseInput, domain: "music" });
      expect(digest1).not.toBe(digest2);
    });

    it("changes digest when input options order changes", () => {
      const digest1 = computeRankDigest(baseInput);
      const digest2 = computeRankDigest({
        ...baseInput,
        orderedInputOptions: ["opt-2", "opt-1"],
      });
      expect(digest1).not.toBe(digest2);
    });

    it("changes digest when signals change", () => {
      const digest1 = computeRankDigest(baseInput);
      const digest2 = computeRankDigest({
        ...baseInput,
        signals: ["sig-a", "sig-c"],
      });
      expect(digest1).not.toBe(digest2);
    });

    it("changes digest when ordered results change", () => {
      const digest1 = computeRankDigest(baseInput);
      const digest2 = computeRankDigest({
        ...baseInput,
        orderedRankResults: ["opt-1", "opt-2"],
      });
      expect(digest1).not.toBe(digest2);
    });

    it("changes digest when scores change", () => {
      const digest1 = computeRankDigest(baseInput);
      const digest2 = computeRankDigest({
        ...baseInput,
        scores: [0.96, 0.82],
      });
      expect(digest1).not.toBe(digest2);
    });

    it("changes digest when correlation/request ID changes", () => {
      const digest1 = computeRankDigest(baseInput);
      const digest2 = computeRankDigest({
        ...baseInput,
        requestId: "req-fixed-uuid-5678",
      });
      expect(digest1).not.toBe(digest2);
    });

    it("does not embed Date.now or timestamp randomness", () => {
      const originalNow = Date.now;
      try {
        Date.now = () => 1000000;
        const d1 = computeRankDigest(baseInput);
        Date.now = () => 99999999;
        const d2 = computeRankDigest(baseInput);
        expect(d1).toBe(d2);
      } finally {
        Date.now = originalNow;
      }
    });
  });
});

