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
  name: z.string().min(1, "Anchor name is required").max(150, "Anchor name cannot exceed 150 characters"),
  expectedType: z.string().max(50, "Expected type cannot exceed 50 characters").optional(),
});
export type AnchorInput = z.infer<typeof AnchorInputSchema>;

export const InventoryBriefSchema = z.object({
  itemName: z.string().min(1, "Item name is required").max(200, "Item name cannot exceed 200 characters"),
  category: z.string().min(1, "Category is required").max(100, "Category cannot exceed 100 characters"),
  colorMaterials: z.array(z.string().max(100, "Color/material string cannot exceed 100 characters")).max(20, "Cannot specify more than 20 colors/materials").default([]),
  unitsOnHand: z.number().int().min(1, "Units must be at least 1").max(1000000, "Units cannot exceed 1,000,000"),
  daysSlow: z.number().int().min(1, "Days slow must be at least 1").max(3650, "Days slow cannot exceed 3,650"),
  city: z.string().min(1, "City is required").max(100, "City cannot exceed 100 characters"),
  currency: z.string().max(10).default("USD"),
  budgetCap: z.number().positive("Budget cap must be positive").max(1000000, "Budget cap cannot exceed 1,000,000"),
  maxMarkdownPercent: z.number().min(0).max(100).default(10),
  testWindowDays: z.number().int().min(1).max(90).default(14),
  anchorNames: z.array(AnchorInputSchema).min(1, "At least one anchor is required").max(10, "Cannot specify more than 10 anchors"),
  forbiddenTactics: z.array(z.string().max(200, "Forbidden tactic string cannot exceed 200 characters")).max(30, "Cannot specify more than 30 forbidden tactics").default([]),
  isSyntheticDemo: z.boolean().default(false),
});
export type InventoryBrief = z.infer<typeof InventoryBriefSchema>;

export const DisambiguationCandidateSchema = z.object({
  qlooEntityId: z.string().max(100),
  name: z.string().max(150),
  entityType: z.string().max(50),
  description: z.string().max(500).optional(),
});
export type DisambiguationCandidate = z.infer<typeof DisambiguationCandidateSchema>;

export const ResolvedAnchorSchema = z.object({
  inputName: z.string().max(150),
  qlooEntityId: z.string().max(100),
  name: z.string().max(150),
  entityType: z.string().max(50),
  confidenceState: z.enum(["CONFIRMED", "AMBIGUOUS", "NOT_FOUND"]),
  disambiguationCandidates: z.array(DisambiguationCandidateSchema).max(20).optional(),
  provenanceId: z.string().max(100),
});
export type ResolvedAnchor = z.infer<typeof ResolvedAnchorSchema>;

export const EvidenceNodeSchema = z.object({
  id: z.string().max(100),
  evidenceClass: EvidenceClassSchema,
  statement: z.string().max(2000),
  qlooTool: z.string().max(100).optional(),
  requestId: z.string().max(100).optional(),
  entityIds: z.array(z.string().max(100)).max(50).optional(),
  entityNames: z.array(z.string().max(150)).max(50).optional(),
  createdAt: z.string().max(50),
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
  rule: z.string().max(100),
  status: z.enum(["PASS", "FAIL", "UNKNOWN"]),
  detail: z.string().max(500).optional(),
});
export type ConstraintCheck = z.infer<typeof ConstraintCheckSchema>;

export const ActivationPlanSchema = z.object({
  id: z.string().max(100),
  mechanism: ActivationMechanismSchema,
  title: z.string().max(200),
  hypothesis: z.string().max(1000),
  actions: z.array(z.string().max(500)).max(20),
  estimatedCost: z.number().nonnegative().max(1000000),
  experimentMetric: z.string().max(500),
  stopCondition: z.string().max(500),
  evidenceNodeIds: z.array(z.string().max(100)).max(50),
  culturalEntityNames: z.array(z.string().max(150)).max(50),
  constraintChecks: z.array(ConstraintCheckSchema).max(20),
  scoreContext: z.object({
    domain: z.string().max(50).optional(),
    withinQueryRank: z.number().int().min(1).max(1000).optional(),
    totalRankedInBatch: z.number().int().min(1).max(1000).optional(),
    batchRankCallId: z.string().max(100).optional(),
    rankDigest: z.string().max(128).optional(),
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
