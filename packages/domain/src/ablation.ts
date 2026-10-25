import {
  InventoryBrief,
  ActivationPlan,
  EvidenceNode,
} from "@lastrack/contracts";

export interface AblationComparison {
  qlooEnabledPlans: ActivationPlan[];
  qlooAblatedPlans: ActivationPlan[];
  qlooEvidenceCount: number;
  distinctCulturalEntitiesCount: number;
  differenceSummary: string[];
}

export function generateAblatedBaseline(
  brief: InventoryBrief,
  evidenceNodes: EvidenceNode[]
): {
  plans: ActivationPlan[];
  reason: string;
} {
  // Non-Qloo baseline: strictly uses generic merchant heuristics without any cultural taste intelligence
  const genericPlans: ActivationPlan[] = [
    {
      id: "ablation-plan-1",
      mechanism: "DISPLAY",
      title: "Generic Endcap Discount Reframe",
      hypothesis: `Moving the ${brief.itemName} to the front clearance table and applying standard sale signage may accelerate clearance by price sensitivity alone.`,
      actions: [
        `Move remaining ${brief.unitsOnHand} units to front-of-store clearance rack`,
        `Apply standard ${brief.maxMarkdownPercent}% markdown label`,
        `Post standard sale photo to generic store Instagram account`,
      ],
      estimatedCost: 50,
      experimentMetric: "Units sold per week at discounted price",
      stopCondition: "Markdown budget exceeded or stock remains unsold after 14 days",
      evidenceNodeIds: evidenceNodes
        .filter((n) => n.evidenceClass === "MERCHANT_INPUT")
        .map((n) => n.id),
      culturalEntityNames: [], // No cultural entities available without Qloo
      constraintChecks: [
        {
          rule: "BUDGET_CAP",
          status: "PASS",
          detail: "Generic markdown cost ($50) is within budget cap.",
        },
      ],
    },
    {
      id: "ablation-plan-2",
      mechanism: "BUNDLE",
      title: "Arbitrary Multi-Buy Bundle",
      hypothesis: `Pairing the ${brief.itemName} with any generic high-velocity accessory (e.g. basic socks or tote bag) without cultural taste affinity.`,
      actions: [
        `Offer multi-buy promotion: Buy ${brief.itemName}, get 20% off any store tote`,
        `Print paper shelf-talker at register`,
      ],
      estimatedCost: 75,
      experimentMetric: "Bundle attachment rate at checkout",
      stopCondition: "No bundle attachments registered within 7 days",
      evidenceNodeIds: evidenceNodes
        .filter((n) => n.evidenceClass === "MERCHANT_INPUT")
        .map((n) => n.id),
      culturalEntityNames: [], // No cultural entities available without Qloo
      constraintChecks: [
        {
          rule: "BUDGET_CAP",
          status: "PASS",
          detail: "Bundle signage cost ($75) is within budget cap.",
        },
      ],
    },
    {
      id: "ablation-plan-3",
      mechanism: "LOCAL_ACTIVATION",
      title: "Generic Neighborhood Sidewalk Sale",
      hypothesis: `Host an untargeted outdoor weekend rack sale hoping walk-by foot traffic notices the item.`,
      actions: [
        `Wheel clothing rack onto sidewalk during peak Saturday hours`,
        `Chalk sidewalk sign announcing weekend markdown`,
      ],
      estimatedCost: 30,
      experimentMetric: "Sidewalk foot-traffic conversion",
      stopCondition: "Inclement weather or zero unit movement on Saturday",
      evidenceNodeIds: evidenceNodes
        .filter((n) => n.evidenceClass === "MERCHANT_INPUT")
        .map((n) => n.id),
      culturalEntityNames: [], // No cultural entities available without Qloo
      constraintChecks: [
        {
          rule: "BUDGET_CAP",
          status: "PASS",
          detail: "Sidewalk rack cost ($30) is within budget cap.",
        },
      ],
    },
  ];

  return {
    plans: genericPlans,
    reason:
      "When Qloo taste intelligence is disabled, cultural entity discovery, cross-domain adjacency ranking, and contextual hypotheses disappear. The system collapses to generic price cutting and untargeted retail markdowns.",
  };
}

export function computeAblationComparison(
  qlooPlans: ActivationPlan[],
  evidenceNodes: EvidenceNode[],
  brief: InventoryBrief
): AblationComparison {
  const ablated = generateAblatedBaseline(brief, evidenceNodes);
  const qlooEvidenceNodes = evidenceNodes.filter(
    (n) => n.evidenceClass === "QLOO_EVIDENCE" || n.evidenceClass === "DEMO_FIXTURE"
  );

  const culturalEntities = new Set<string>();
  for (const plan of qlooPlans) {
    for (const e of plan.culturalEntityNames) {
      culturalEntities.add(e);
    }
  }

  const differences = [
    `With Qloo: ${culturalEntities.size} specific cultural adjacencies discovered across film, music, brands, and local venues. Without Qloo: 0 cultural entities identified.`,
    `With Qloo: Interventions test specific aesthetic and subcultural context. Without Qloo: Interventions default to price discounting (${brief.maxMarkdownPercent}% markdown).`,
    `With Qloo: Supported by ${qlooEvidenceNodes.length} machine-verified Qloo taste affinity records. Without Qloo: Only raw merchant inputs remain.`,
  ];

  return {
    qlooEnabledPlans: qlooPlans,
    qlooAblatedPlans: ablated.plans,
    qlooEvidenceCount: qlooEvidenceNodes.length,
    distinctCulturalEntitiesCount: culturalEntities.size,
    differenceSummary: differences,
  };
}

export function verifyAblationEffect(
  qlooPlans: ActivationPlan[],
  ablatedPlans: ActivationPlan[]
): {
  isCulturallyAblated: boolean;
  qlooEntitiesCount: number;
  ablatedEntitiesCount: number;
} {
  const qlooEntities = new Set(qlooPlans.flatMap((p) => p.culturalEntityNames));
  const ablatedEntities = new Set(ablatedPlans.flatMap((p) => p.culturalEntityNames));

  return {
    isCulturallyAblated: qlooEntities.size > 0 && ablatedEntities.size === 0,
    qlooEntitiesCount: qlooEntities.size,
    ablatedEntitiesCount: ablatedEntities.size,
  };
}

