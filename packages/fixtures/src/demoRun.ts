import {
  AgentRun,
  EvidenceNode,
  ActivationPlan,
  ResolvedAnchor,
} from "@lastrack/contracts";
import { SYNTHETIC_JUDGE_BRIEF } from "./demoBrief.js";

export const DEMO_RESOLVED_ANCHORS: ResolvedAnchor[] = [
  {
    inputName: "A24",
    qlooEntityId: "ent_a24_film_001",
    name: "A24",
    entityType: "brand",
    confidenceState: "CONFIRMED",
    provenanceId: "qloo_req_resolve_001",
  },
  {
    inputName: "Phoebe Bridgers",
    qlooEntityId: "ent_phoebe_bridgers_002",
    name: "Phoebe Bridgers",
    entityType: "person",
    confidenceState: "CONFIRMED",
    provenanceId: "qloo_req_resolve_002",
  },
  {
    inputName: "Bode",
    qlooEntityId: "ent_bode_fashion_003",
    name: "Bode",
    entityType: "brand",
    confidenceState: "CONFIRMED",
    provenanceId: "qloo_req_resolve_003",
  },
];

export const DEMO_EVIDENCE_NODES: EvidenceNode[] = [
  {
    id: "ev-input-001",
    evidenceClass: "MERCHANT_INPUT",
    statement: "Merchant inventory brief: 42 units of Olive Linen Overshirt sitting slow for 28 days in Brooklyn, NY. Budget cap: $600.",
    createdAt: "2026-10-25T01:00:00Z",
    sourceMode: "DEMO_FIXTURE",
  },
  {
    id: "ev-qloo-001",
    evidenceClass: "DEMO_FIXTURE",
    statement: "Qloo Entity Resolution: Confirmed 'A24' (Film Studio / Media Brand), 'Phoebe Bridgers' (Musician / Songwriter), and 'Bode' (Artisanal Menswear Brand).",
    qlooTool: "qloo_describe",
    requestId: "qloo_req_resolve_001",
    entityIds: ["ent_a24_film_001", "ent_phoebe_bridgers_002", "ent_bode_fashion_003"],
    entityNames: ["A24", "Phoebe Bridgers", "Bode"],
    createdAt: "2026-10-25T01:00:01Z",
    sourceMode: "DEMO_FIXTURE",
  },
  {
    id: "ev-qloo-002",
    evidenceClass: "DEMO_FIXTURE",
    statement: "Qloo Tag Mapping: Co-occurring aesthetic tags across anchors: 'archive fashion', 'cinematic nostalgia', 'folk melancholia', 'mid-century workwear'.",
    qlooTool: "qloo_find_tags",
    requestId: "qloo_req_tags_002",
    createdAt: "2026-10-25T01:00:02Z",
    sourceMode: "DEMO_FIXTURE",
  },
  {
    id: "ev-qloo-003",
    evidenceClass: "DEMO_FIXTURE",
    statement: "Qloo Cross-Domain Discovery: Top adjacent film affinity discovered: 'Past Lives' (dir. Celine Song, A24 release) with high cross-taste affinity to Phoebe Bridgers listeners.",
    qlooTool: "qloo_recommend",
    requestId: "qloo_req_rec_film_003",
    entityIds: ["ent_past_lives_film_010"],
    entityNames: ["Past Lives"],
    createdAt: "2026-10-25T01:00:03Z",
    sourceMode: "DEMO_FIXTURE",
  },
  {
    id: "ev-qloo-004",
    evidenceClass: "DEMO_FIXTURE",
    statement: "Qloo Cross-Domain Discovery: Top adjacent brand affinity: 'Toast UK' & 'Margaret Howell' (heritage utilitarian tailoring).",
    qlooTool: "qloo_recommend",
    requestId: "qloo_req_rec_brand_004",
    entityIds: ["ent_toast_brand_011", "ent_margaret_howell_012"],
    entityNames: ["Toast UK", "Margaret Howell"],
    createdAt: "2026-10-25T01:00:04Z",
    sourceMode: "DEMO_FIXTURE",
  },
  {
    id: "ev-qloo-005",
    evidenceClass: "DEMO_FIXTURE",
    statement: "Qloo Local Culture / Place Discovery in Brooklyn, NY: Highest cultural taste overlap centered around Greenpoint/Williamsburg independent bookshop cafes: 'Word Bookstore' & 'Nitehawk Cinema'.",
    qlooTool: "qloo_where_popular",
    requestId: "qloo_req_places_005",
    entityIds: ["ent_nitehawk_cinema_020", "ent_word_books_021"],
    entityNames: ["Nitehawk Cinema", "Word Bookstore"],
    createdAt: "2026-10-25T01:00:05Z",
    sourceMode: "DEMO_FIXTURE",
  },
  {
    id: "ev-qloo-006",
    evidenceClass: "DEMO_FIXTURE",
    statement: "Qloo Single-Query Batch Ranking (Batch #rank_batch_9921): Ranked 6 candidate intervention concepts against composite anchor signal in one unified call. Rank 1: 'Cinematic Workwear Editorial' (score: 0.912); Rank 2: 'Literary & Audio Bundle Pairing' (score: 0.884); Rank 3: 'Independent Cinema Screening Pop-Up Display' (score: 0.841).",
    qlooTool: "qloo_rank",
    requestId: "qloo_req_rank_batch_9921",
    createdAt: "2026-10-25T01:00:06Z",
    sourceMode: "DEMO_FIXTURE",
  },
  {
    id: "ev-det-001",
    evidenceClass: "DETERMINISTIC_DERIVATION",
    statement: "Deterministic Budget & Policy Verification: Display reframe ($180), Bundle pairing ($250), and Local Screening Pop-Up ($420) all pass the $600 merchant budget cap and respect the 0% paid influencer constraint.",
    createdAt: "2026-10-25T01:00:07Z",
    sourceMode: "DEMO_FIXTURE",
  },
];

export const DEMO_ACTIVATION_PLANS: ActivationPlan[] = [
  {
    id: "plan-display-01",
    mechanism: "DISPLAY",
    title: "Cinematic Workwear: 'Past Lives' Editorial Reframe",
    hypothesis: "Reframing the Olive Linen Overshirt through the muted, introspective lens of 'Past Lives' and A24 cinematic workwear transforms it from generic surplus to an intentional wardrobe centerpiece for indie cinema enthusiasts.",
    actions: [
      "Re-style the front window display pairing the Olive Linen Overshirt with muted cream trousers and canvas tote",
      "Feature a printed editorial lookbook card highlighting mid-century natural textiles and cinematic stills palette",
      "Curate store background music featuring Phoebe Bridgers, Boygenius, and Sharon Van Etten during peak afternoon browsing hours"
    ],
    estimatedCost: 180,
    experimentMetric: "Weekly sell-through velocity of Olive Linen Overshirt (target: 12 units/week)",
    stopCondition: "If fewer than 3 units sell within the first 7 days, rotate window mannequin display",
    evidenceNodeIds: ["ev-input-001", "ev-qloo-001", "ev-qloo-002", "ev-qloo-003", "ev-qloo-006", "ev-det-001"],
    culturalEntityNames: ["A24", "Past Lives", "Phoebe Bridgers"],
    constraintChecks: [
      { rule: "BUDGET_CAP", status: "PASS", detail: "Estimated cost $180 <= $600 cap" },
      { rule: "FORBIDDEN_TACTICS", status: "PASS", detail: "Zero paid influencer spend" },
      { rule: "EXECUTION_WINDOW", status: "PASS", detail: "14-day observation window" }
    ],
    scoreContext: {
      withinQueryRank: 1,
      totalRankedInBatch: 6,
      batchRankCallId: "qloo_req_rank_batch_9921",
      rankDigest: "sha256:9fa418a3a5662384ed77327abd27ac7c412b4c7585e606b4d1ea7f208ab664a0",
    },
  },
  {
    id: "plan-bundle-02",
    mechanism: "BUNDLE",
    title: "The Sunday Reader: Literary & Linen Capsule Bundle",
    hypothesis: "Pairing the linen overshirt with artisanal stationery or independent literature evokes the tactile, slow-craft lifestyle favored by Bode and Toast UK patrons.",
    actions: [
      "Create a 'Sunday Reader' in-store vignette near fitting rooms",
      "Package the Olive Linen Overshirt with an exclusive natural beeswax garment wash and bookmark",
      "Offer a modest 10% bundle concession when purchased alongside an indie art magazine or essay collection"
    ],
    estimatedCost: 240,
    experimentMetric: "Bundle conversion rate and cross-merchandised attachment frequency",
    stopCondition: "Cease bundle packaging if accessories inventory depletes before 10 units sell",
    evidenceNodeIds: ["ev-input-001", "ev-qloo-001", "ev-qloo-004", "ev-qloo-006", "ev-det-001"],
    culturalEntityNames: ["Bode", "Toast UK", "Margaret Howell"],
    constraintChecks: [
      { rule: "BUDGET_CAP", status: "PASS", detail: "Estimated cost $240 <= $600 cap" },
      { rule: "FORBIDDEN_TACTICS", status: "PASS", detail: "Within 10% maximum markdown ceiling" },
      { rule: "EXECUTION_WINDOW", status: "PASS", detail: "14-day observation window" }
    ],
    scoreContext: {
      withinQueryRank: 2,
      totalRankedInBatch: 6,
      batchRankCallId: "qloo_req_rank_batch_9921",
      rankDigest: "sha256:bf3165a0a09d2d0c8090245736ab94c1eaba2dafc0bc8c743d6922c96523ccad",
    },
  },
  {
    id: "plan-local-03",
    mechanism: "LOCAL_ACTIVATION",
    title: "Independent Cinema Night: Community Pop-Up Rail",
    hypothesis: "Positioning a curated rail during indie screening nights near Nitehawk Cinema engages culturally aligned filmgoers during peak evening cultural leisure.",
    actions: [
      "Place an evening sidewalk sidewalk lookbook rail outside boutique on Thursday and Friday film screening evenings",
      "Provide a postcard ticket offer: show a local indie cinema stub for a complimentary linen maintenance guide",
      "Host a 2-hour pre-show sidewalk acoustic listening hour"
    ],
    estimatedCost: 350,
    experimentMetric: "Evening foot traffic conversion between 6 PM and 9 PM",
    stopCondition: "Halt sidewalk presence in event of rain or low street pedestrian density",
    evidenceNodeIds: ["ev-input-001", "ev-qloo-001", "ev-qloo-005", "ev-qloo-006", "ev-det-001"],
    culturalEntityNames: ["A24", "Nitehawk Cinema", "Word Bookstore"],
    constraintChecks: [
      { rule: "BUDGET_CAP", status: "PASS", detail: "Estimated cost $350 <= $600 cap" },
      { rule: "FORBIDDEN_TACTICS", status: "PASS", detail: "100% merchant-supervised local community activation" },
      { rule: "EXECUTION_WINDOW", status: "PASS", detail: "14-day observation window" }
    ],
    scoreContext: {
      withinQueryRank: 3,
      totalRankedInBatch: 6,
      batchRankCallId: "qloo_req_rank_batch_9921",
      rankDigest: "sha256:e3bdcf4d8b50edc593603bd19afcd0d7008918c00dd3f7971e85497d58f2088d",
    },
  },
];

export const DEMO_AGENT_RUN: AgentRun = {
  id: "run-demo-synthetic-001",
  state: "READY",
  sourceMode: "DEMO_FIXTURE",
  brief: SYNTHETIC_JUDGE_BRIEF,
  resolvedAnchors: DEMO_RESOLVED_ANCHORS,
  evidence: DEMO_EVIDENCE_NODES,
  plans: DEMO_ACTIVATION_PLANS,
  ablationBaseline: {
    plans: [
      {
        id: "ablation-plan-1",
        mechanism: "DISPLAY",
        title: "Generic Endcap Discount Reframe",
        hypothesis: "Moving the Olive Linen Overshirt to the front clearance table and applying standard sale signage may accelerate clearance by price sensitivity alone.",
        actions: [
          "Move remaining 42 units to front-of-store clearance rack",
          "Apply standard 10% markdown label",
          "Post standard sale photo to generic store Instagram account"
        ],
        estimatedCost: 50,
        experimentMetric: "Units sold per week at discounted price",
        stopCondition: "Markdown budget exceeded or stock remains unsold after 14 days",
        evidenceNodeIds: ["ev-input-001"],
        culturalEntityNames: [],
        constraintChecks: [{ rule: "BUDGET_CAP", status: "PASS", detail: "Generic markdown cost ($50) within budget cap." }]
      },
      {
        id: "ablation-plan-2",
        mechanism: "BUNDLE",
        title: "Arbitrary Multi-Buy Bundle",
        hypothesis: "Pairing the overshirt with any generic accessory (basic canvas tote) without cultural taste affinity.",
        actions: [
          "Offer multi-buy promotion: Buy overshirt, get 20% off canvas tote",
          "Print paper shelf-talker at register"
        ],
        estimatedCost: 75,
        experimentMetric: "Bundle attachment rate at checkout",
        stopCondition: "No bundle attachments registered within 7 days",
        evidenceNodeIds: ["ev-input-001"],
        culturalEntityNames: [],
        constraintChecks: [{ rule: "BUDGET_CAP", status: "PASS", detail: "Signage cost ($75) within budget cap." }]
      },
      {
        id: "ablation-plan-3",
        mechanism: "LOCAL_ACTIVATION",
        title: "Generic Neighborhood Sidewalk Sale",
        hypothesis: "Host an untargeted outdoor weekend rack sale hoping walk-by foot traffic notices the item.",
        actions: [
          "Wheel clothing rack onto sidewalk during peak Saturday hours",
          "Chalk sidewalk sign announcing weekend markdown"
        ],
        estimatedCost: 30,
        experimentMetric: "Sidewalk foot-traffic conversion",
        stopCondition: "Inclement weather or zero unit movement on Saturday",
        evidenceNodeIds: ["ev-input-001"],
        culturalEntityNames: [],
        constraintChecks: [{ rule: "BUDGET_CAP", status: "PASS", detail: "Sidewalk rack cost ($30) within budget cap." }]
      }
    ],
    reason: "When Qloo taste intelligence is disabled, cultural entity discovery, cross-domain adjacency ranking, and contextual hypotheses disappear. The system collapses to generic price cutting and untargeted retail markdowns."
  },
  events: [
    { timestamp: "2026-10-25T01:00:00Z", state: "VALIDATING_BRIEF", message: "Validated merchant brief: 42 units of Olive Linen Overshirt, $600 budget cap." },
    { timestamp: "2026-10-25T01:00:01Z", state: "RESOLVING_ANCHORS", message: "Resolved 3 cultural anchors: A24, Phoebe Bridgers, Bode.", toolName: "qloo_describe" },
    { timestamp: "2026-10-25T01:00:02Z", state: "MAPPING_TASTE", message: "Mapped 4 aesthetic tags across anchors: 'archive fashion', 'cinematic nostalgia', 'folk melancholia', 'mid-century workwear'.", toolName: "qloo_find_tags" },
    { timestamp: "2026-10-25T01:00:04Z", state: "GENERATING_CANDIDATES", message: "Discovered cross-domain candidates in Film, Fashion Brands, and Brooklyn Cultural Places.", toolName: "qloo_recommend" },
    { timestamp: "2026-10-25T01:00:06Z", state: "RANKING_CANDIDATES", message: "Ranked 6 candidates in one batch call (Batch #rank_batch_9921).", toolName: "qloo_rank" },
    { timestamp: "2026-10-25T01:00:07Z", state: "CONSTRAINT_CHECK", message: "Enforced commercial budget cap ($600) and 0% paid influencer constraint. All 3 plans passed." },
    { timestamp: "2026-10-25T01:00:08Z", state: "CRITIQUE", message: "Critique complete: 0 unsupported sales claims, 100% evidence linkage, zero cross-query score comparisons." },
    { timestamp: "2026-10-25T01:00:09Z", state: "READY", message: "3 bounded inventory rescue experiments generated and ready for merchant review." }
  ],
  warnings: [],
  startedAt: "2026-10-25T01:00:00Z",
  completedAt: "2026-10-25T01:00:09Z",
  qlooCallCount: 6,
  maxCallBudget: 15,
};
