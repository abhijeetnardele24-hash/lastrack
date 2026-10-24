import { z } from "zod";

export const SourceModeSchema = z.enum([
  "LIVE_QLOO",
  "CACHED_QLOO",
  "DEMO_FIXTURE",
  "DEGRADED",
  "ERROR",
]);
export type SourceMode = z.infer<typeof SourceModeSchema>;

export const EvidenceClassSchema = z.enum([
  "QLOO_EVIDENCE",
  "MERCHANT_INPUT",
  "DETERMINISTIC_DERIVATION",
  "AUTHORED_HYPOTHESIS",
  "DEMO_FIXTURE",
]);
export type EvidenceClass = z.infer<typeof EvidenceClassSchema>;

export const AnchorInputSchema = z.object({
  name: z.string().min(1, "Anchor name is required"),
  expectedType: z.string().optional(),
});
export type AnchorInput = z.infer<typeof AnchorInputSchema>;

export const InventoryBriefSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  category: z.string().min(1, "Category is required"),
  colorMaterials: z.array(z.string()).default([]),
  unitsOnHand: z.number().int().min(1, "Units must be at least 1"),
  daysSlow: z.number().int().min(1, "Days slow must be at least 1"),
  city: z.string().min(1, "City is required"),
  currency: z.string().default("USD"),
  budgetCap: z.number().positive("Budget cap must be positive"),
  maxMarkdownPercent: z.number().min(0).max(100).default(10),
  testWindowDays: z.number().int().min(1).max(90).default(14),
  anchorNames: z.array(AnchorInputSchema).min(1, "At least one anchor is required"),
  forbiddenTactics: z.array(z.string()).default([]),
  isSyntheticDemo: z.boolean().default(false),
});
export type InventoryBrief = z.infer<typeof InventoryBriefSchema>;

export const DisambiguationCandidateSchema = z.object({
  qlooEntityId: z.string(),
  name: z.string(),
  entityType: z.string(),
  description: z.string().optional(),
});
export type DisambiguationCandidate = z.infer<typeof DisambiguationCandidateSchema>;

export const ResolvedAnchorSchema = z.object({
  inputName: z.string(),
  qlooEntityId: z.string(),
  name: z.string(),
  entityType: z.string(),
  confidenceState: z.enum(["CONFIRMED", "AMBIGUOUS", "NOT_FOUND"]),
  disambiguationCandidates: z.array(DisambiguationCandidateSchema).optional(),
  provenanceId: z.string(),
});
export type ResolvedAnchor = z.infer<typeof ResolvedAnchorSchema>;

export const EvidenceNodeSchema = z.object({
  id: z.string(),
  evidenceClass: EvidenceClassSchema,
  statement: z.string(),
  qlooTool: z.string().optional(),
  requestId: z.string().optional(),
  entityIds: z.array(z.string()).optional(),
  entityNames: z.array(z.string()).optional(),
  createdAt: z.string(),
  sourceMode: SourceModeSchema,
});
export type EvidenceNode = z.infer<typeof EvidenceNodeSchema>;

export const ActivationMechanismSchema = z.enum([
  "DISPLAY",
  "BUNDLE",
  "LOCAL_ACTIVATION",
]);
export type ActivationMechanism = z.infer<typeof ActivationMechanismSchema>;

export const ConstraintCheckSchema = z.object({
  rule: z.string(),
  status: z.enum(["PASS", "FAIL", "UNKNOWN"]),
  detail: z.string().optional(),
});
export type ConstraintCheck = z.infer<typeof ConstraintCheckSchema>;

export const ActivationPlanSchema = z.object({
  id: z.string(),
  mechanism: ActivationMechanismSchema,
  title: z.string(),
  hypothesis: z.string(),
  actions: z.array(z.string()),
  estimatedCost: z.number().nonnegative(),
  experimentMetric: z.string(),
  stopCondition: z.string(),
  evidenceNodeIds: z.array(z.string()),
  culturalEntityNames: z.array(z.string()),
  constraintChecks: z.array(ConstraintCheckSchema),
  scoreContext: z.object({
    withinQueryRank: z.number().optional(),
    totalRankedInBatch: z.number().optional(),
    batchRankCallId: z.string().optional(),
    rankDigest: z.string().optional(),
  }).optional(),
});
export type ActivationPlan = z.infer<typeof ActivationPlanSchema>;

export const AgentStateSchema = z.enum([
  "IDLE",
  "VALIDATING_BRIEF",
  "RESOLVING_ANCHORS",
  "MAPPING_TASTE",
  "GENERATING_CANDIDATES",
  "RANKING_CANDIDATES",
  "CONSTRAINT_CHECK",
  "CRITIQUE",
  "READY",
  "NEEDS_INPUT",
  "EMPTY",
  "PARTIAL",
  "DEGRADED",
  "ERROR",
]);
export type AgentState = z.infer<typeof AgentStateSchema>;

export const AgentEventSchema = z.object({
  timestamp: z.string(),
  state: AgentStateSchema,
  message: z.string(),
  toolName: z.string().optional(),
  data: z.record(z.any()).optional(),
});
export type AgentEvent = z.infer<typeof AgentEventSchema>;

export const AgentRunSchema = z.object({
  id: z.string(),
  state: AgentStateSchema,
  sourceMode: SourceModeSchema,
  brief: InventoryBriefSchema,
  resolvedAnchors: z.array(ResolvedAnchorSchema),
  evidence: z.array(EvidenceNodeSchema),
  plans: z.array(ActivationPlanSchema),
  ablationBaseline: z.object({
    plans: z.array(ActivationPlanSchema),
    reason: z.string(),
  }).optional(),
  events: z.array(AgentEventSchema),
  warnings: z.array(z.string()),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  qlooCallCount: z.number().int().default(0),
  maxCallBudget: z.number().int().default(15),
});
export type AgentRun = z.infer<typeof AgentRunSchema>;

export const MANDATORY_DISCLAIMER =
  "Planning hypothesis—not a sales forecast or endorsement by the named entities.";

export const DecisionReceiptSchema = z.object({
  runId: z.string(),
  selectedPlanId: z.string(),
  brief: InventoryBriefSchema,
  selectedPlan: ActivationPlanSchema,
  evidenceTrail: z.array(EvidenceNodeSchema),
  disclaimer: z.string(),
  exportedAt: z.string(),
  sourceMode: SourceModeSchema,
  isSyntheticDemo: z.boolean(),
  receiptDigest: z.string().optional(),
});
export type DecisionReceipt = z.infer<typeof DecisionReceiptSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  qlooConfigured: z.boolean(),
  mcpReady: z.boolean(),
  sourceMode: SourceModeSchema,
  uptimeSeconds: z.number(),
  version: z.string(),
  contractChecksum: z.string().optional(),
  commitSha: z.string().optional(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
