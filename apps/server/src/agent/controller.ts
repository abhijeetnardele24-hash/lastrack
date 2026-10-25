import {
  AgentRun,
  AgentState,
  AgentEvent,
  InventoryBrief,
  ResolvedAnchor,
  EvidenceNode,
  ActivationPlan,
  SourceMode,
  EvidenceClass,
} from "@lastrack/contracts";
import {
  validateClaims,
  evaluateConstraints,
  generateAblatedBaseline,
  computeRankDigest,
} from "@lastrack/domain";
import { QlooMcpClient } from "../qloo/mcpClient.js";

export type EventListener = (event: AgentEvent) => void;

interface DiscoveredEntity {
  id: string;
  name: string;
  category: "movie" | "brand" | "place" | "artist" | "book";
  score?: number;
  rank?: number;
  location?: string;
  summary?: string;
  provenanceRequestId?: string;
}

export class BoundedAgentController {
  private run: AgentRun;
  private qlooClient: QlooMcpClient;
  private listeners: EventListener[] = [];
  private cancelled = false;
  private readonly isExplicitFixture: boolean;

  constructor(
    brief: InventoryBrief,
    qlooClient: QlooMcpClient,
    options: { explicitFixture?: boolean } = {}
  ) {
    this.qlooClient = qlooClient;
    this.isExplicitFixture = options.explicitFixture || brief.isSyntheticDemo || !qlooClient.isConfigured();

    const initialMode: SourceMode = this.isExplicitFixture
      ? "DEMO_FIXTURE"
      : "LIVE_QLOO";

    this.run = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      state: "IDLE",
      sourceMode: initialMode,
      brief,
      resolvedAnchors: [],
      evidence: [],
      plans: [],
      events: [],
      warnings: [],
      startedAt: new Date().toISOString(),
      qlooCallCount: 0,
      maxCallBudget: 15,
    };
  }

  public getRun(): AgentRun {
    return this.run;
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public cancel() {
    this.cancelled = true;
    this.transition("ERROR", "Agent run was cancelled by merchant.");
  }

  public async execute(): Promise<AgentRun> {
    if (this.cancelled) {
      this.transition("ERROR", "Agent run was cancelled by merchant.");
      return this.run;
    }

    try {
      // 1. VALIDATING_BRIEF
      this.transition(
        "VALIDATING_BRIEF",
        `Validating merchant inventory brief for "${this.run.brief.itemName}".`
      );
      this.addEvidence({
        evidenceClass: "MERCHANT_INPUT",
        statement: `Merchant Brief: ${this.run.brief.unitsOnHand} units of ${this.run.brief.itemName} (${this.run.brief.daysSlow} days slow) in ${this.run.brief.city}. Budget cap: $${this.run.brief.budgetCap}.`,
      });

      if (this.cancelled) {
        this.transition("ERROR", "Agent run was cancelled by merchant.");
        return this.run;
      }

      // 2. RESOLVING_ANCHORS
      this.transition(
        "RESOLVING_ANCHORS",
        `Resolving ${this.run.brief.anchorNames.length} cultural anchors via Qloo canonical describe workflow.`,
        "qloo_describe"
      );
      const resolvedAnchors = await this.resolveAnchors();
      this.run.resolvedAnchors = resolvedAnchors;

      // Handle unconfirmed or ambiguous anchors honestly
      const confirmedAnchors = resolvedAnchors.filter((a) => a.confidenceState === "CONFIRMED");
      const ambiguous = resolvedAnchors.filter((a) => a.confidenceState === "AMBIGUOUS");
      const notFound = resolvedAnchors.filter((a) => a.confidenceState === "NOT_FOUND");

      if (confirmedAnchors.length === 0) {
        if (ambiguous.length > 0) {
          this.transition(
            "NEEDS_INPUT",
            `Anchor ambiguity detected for "${ambiguous.map((a) => a.inputName).join(", ")}". Merchant clarification required.`
          );
        } else {
          this.transition(
            "EMPTY",
            `None of the provided anchors (${this.run.brief.anchorNames.map((a) => a.name).join(", ")}) could be resolved in Qloo.`
          );
        }
        return this.run;
      }

      if (ambiguous.length > 0 || notFound.length > 0) {
        this.run.warnings.push(
          `Proceeding with ${confirmedAnchors.length} confirmed anchors (${confirmedAnchors.map((a) => a.name).join(", ")}). Unresolved: ${[...ambiguous, ...notFound].map((a) => a.inputName).join(", ")}.`
        );
      }

      if (this.cancelled) return this.run;

      // 3. MAPPING_TASTE
      this.transition(
        "MAPPING_TASTE",
        "Searching Qloo tag ontology for aesthetic concepts aligned with item description.",
        "qloo_find_tags"
      );
      const mappedTags = await this.mapTasteTags();

      if (this.cancelled) return this.run;

      // 4. GENERATING_CANDIDATES
      this.transition(
        "GENERATING_CANDIDATES",
        "Discovering cross-domain candidates in film, complementary brands, and local places.",
        "qloo_recommend"
      );
      const candidatesByDomain = await this.discoverCandidates(confirmedAnchors, mappedTags);

      if (this.cancelled) return this.run;

      // 5. RANKING_CANDIDATES (single-batch query invariant per domain)
      this.transition(
        "RANKING_CANDIDATES",
        "Executing single-query batch rankings on comparable candidates per domain.",
        "qloo_rank"
      );
      const rankedEntities = await this.rankCandidatesByDomain(confirmedAnchors, candidatesByDomain);

      if (this.cancelled) return this.run;

      // 6. CONSTRAINT_CHECK
      this.transition(
        "CONSTRAINT_CHECK",
        "Evaluating commercial budget limits, markdown boundaries, and forbidden tactics."
      );
      const candidatePlans = this.composeActivationPlans(confirmedAnchors, rankedEntities);

      // Evaluate constraints for each plan
      const feasiblePlans: ActivationPlan[] = [];
      for (const plan of candidatePlans) {
        plan.constraintChecks = evaluateConstraints(plan, this.run.brief);
        const hasBudgetFail = plan.constraintChecks.some(
          (c) => c.rule === "BUDGET_CAP" && c.status === "FAIL"
        );
        const hasTacticFail = plan.constraintChecks.some(
          (c) => c.rule === "FORBIDDEN_TACTICS" && c.status === "FAIL"
        );
        if (!hasBudgetFail && !hasTacticFail) {
          feasiblePlans.push(plan);
        } else {
          this.run.warnings.push(
            `Plan "${plan.title}" excluded because it violated merchant constraints.`
          );
        }
      }

      this.run.plans = feasiblePlans;

      if (this.cancelled) return this.run;

      // 7. CRITIQUE (one bounded revision pass)
      this.transition(
        "CRITIQUE",
        "Running automated claims validation: checking for ungrounded entities, sales promises, and sensitive traits."
      );
      const violations = validateClaims(this.run.plans, this.run.evidence);

      if (violations.length > 0) {
        this.run.warnings.push(...violations.map((v) => `${v.code}: ${v.message}`));
        this.sanitizePlans(this.run.plans);
        // Re-check after bounded sanitization
        const remainingViolations = validateClaims(this.run.plans, this.run.evidence);
        if (remainingViolations.length > 0) {
          // Remove non-compliant plans rather than presenting invalid claims
          this.run.plans = this.run.plans.filter((p) =>
            !remainingViolations.some((v) => v.target === p.id)
          );
        }
      }

      // 8. Generate Qloo-off ablation baseline
      this.run.ablationBaseline = generateAblatedBaseline(this.run.brief, this.run.evidence);

      // 9. Final state resolution
      this.run.completedAt = new Date().toISOString();

      if (this.run.plans.length === 0) {
        this.transition(
          "EMPTY",
          "No feasible merchandising rescue plans could be constructed within the specified budget and policy constraints."
        );
      } else if (this.run.plans.length < 3) {
        this.transition(
          "PARTIAL",
          `Generated ${this.run.plans.length} feasible experiment(s) backed by ${this.run.evidence.length} evidence nodes.`
        );
      } else {
        this.transition(
          "READY",
          `Generated 3 feasible inventory rescue experiments backed by ${this.run.evidence.length} evidence nodes.`
        );
      }

      return this.run;
    } catch (err: any) {
      console.error("[Agent Controller Execution Error]:", err);
      this.run.sourceMode = "ERROR";
      this.transition("ERROR", `Controller error: ${err.message}`);
      return this.run;
    }
  }

  private transition(state: AgentState, message: string, toolName?: string, data?: any) {
    this.run.state = state;
    const event: AgentEvent = {
      timestamp: new Date().toISOString(),
      state,
      message,
      toolName,
      data,
    };
    this.run.events.push(event);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Listener error:", err);
      }
    }
  }

  private addEvidence(
    partial: Omit<EvidenceNode, "id" | "createdAt" | "sourceMode"> & { sourceMode?: SourceMode }
  ): EvidenceNode {
    // If running in explicit fixture mode, force DEMO_FIXTURE class for truthfulness
    const finalEvidenceClass: EvidenceClass =
      this.isExplicitFixture && partial.evidenceClass === "QLOO_EVIDENCE"
        ? "DEMO_FIXTURE"
        : partial.evidenceClass;

    const node: EvidenceNode = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      sourceMode: partial.sourceMode || this.run.sourceMode,
      ...partial,
      evidenceClass: finalEvidenceClass,
    };
    this.run.evidence.push(node);
    return node;
  }

  private checkBudget(): boolean {
    if (this.run.qlooCallCount >= this.run.maxCallBudget) {
      this.run.warnings.push(
        `MCP call budget exhausted (${this.run.qlooCallCount}/${this.run.maxCallBudget}). Halting further Qloo queries.`
      );
      return false;
    }
    return true;
  }

  private async resolveAnchors(): Promise<ResolvedAnchor[]> {
    const results: ResolvedAnchor[] = [];

    for (const anchor of this.run.brief.anchorNames) {
      if (!this.checkBudget()) break;

      this.run.qlooCallCount++;
      const res = await this.qlooClient.callTool(
        "qloo_describe",
        {
          entity: anchor.name,
          ...(anchor.expectedType ? { type: anchor.expectedType } : {}),
        },
        { allowFixture: this.isExplicitFixture }
      );

      if (res.status === "error") {
        if (!this.isExplicitFixture) {
          throw new Error(`Anchor resolution failed: ${res.error?.code || res.summary || "Unknown Qloo error"}`);
        }
      }

      // Check results
      const entityData = res.results?.[0] || res.data;
      if (!entityData || res.status === "empty") {
        results.push({
          inputName: anchor.name,
          qlooEntityId: "",
          name: anchor.name,
          entityType: anchor.expectedType || "brand",
          confidenceState: "NOT_FOUND",
          provenanceId: res.provenance.requestId,
        });
        continue;
      }

      const entityId = entityData.entity_id || entityData.entityId || `ent_${anchor.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const resolvedName = entityData.name || anchor.name;
      const entityType = entityData.type || entityData.entityType || anchor.expectedType || "brand";

      results.push({
        inputName: anchor.name,
        qlooEntityId: entityId,
        name: resolvedName,
        entityType,
        confidenceState: "CONFIRMED",
        provenanceId: res.provenance.requestId,
      });

      this.addEvidence({
        evidenceClass: "QLOO_EVIDENCE",
        statement: `Qloo Entity Resolution: Confirmed "${resolvedName}" (${entityType}) from input "${anchor.name}".`,
        qlooTool: "qloo_describe",
        requestId: res.provenance.requestId,
        entityIds: [entityId],
        entityNames: [resolvedName],
        sourceMode: res.provenance.sourceMode,
      });
    }

    return results;
  }

  private async mapTasteTags(): Promise<string[]> {
    if (!this.checkBudget()) return [];

    this.run.qlooCallCount++;
    const query = `${this.run.brief.itemName} ${this.run.brief.colorMaterials.join(" ")} ${this.run.brief.category}`.trim();

    const res = await this.qlooClient.callTool(
      "qloo_find_tags",
      {
        query,
        semantic: true,
        limit: 10,
      },
      { allowFixture: this.isExplicitFixture }
    );

    if (res.status === "error" && !this.isExplicitFixture) {
      this.run.warnings.push(`Tag search failed: ${res.error?.code || res.summary}. Proceeding with entity signals only.`);
      return [];
    }

    // Extract tags from canonical results
    const returnedTags: string[] = [];
    if (Array.isArray(res.results)) {
      for (const item of res.results) {
        if (typeof item === "string") {
          returnedTags.push(item);
        } else if (item?.name) {
          returnedTags.push(item.name);
        } else if (item?.tag_urn) {
          returnedTags.push(item.tag_urn.split(":").pop()?.replace(/_/g, " ") || item.tag_urn);
        }
      }
    }

    const tags = returnedTags.slice(0, 6);

    if (tags.length > 0) {
      this.addEvidence({
        evidenceClass: "QLOO_EVIDENCE",
        statement: `Qloo Tag Mapping: Discovered aesthetic tags for "${this.run.brief.itemName}": ${tags.map((t) => `'${t}'`).join(", ")}.`,
        qlooTool: "qloo_find_tags",
        requestId: res.provenance.requestId,
        sourceMode: res.provenance.sourceMode,
      });
    }

    return tags;
  }

  private async discoverCandidates(
    anchors: ResolvedAnchor[],
    tags: string[]
  ): Promise<Record<string, DiscoveredEntity[]>> {
    const candidatesByDomain: Record<string, DiscoveredEntity[]> = {
      movie: [],
      brand: [],
      place: [],
      artist: [],
    };

    const signalEntities = anchors.map((a) => a.name);
    const targetTypes: ("movie" | "brand" | "place" | "artist")[] = [
      "movie",
      "brand",
      "place",
    ];

    for (const targetType of targetTypes) {
      if (!this.checkBudget()) break;

      this.run.qlooCallCount++;
      const res = await this.qlooClient.callTool(
        "qloo_recommend",
        {
          target_type: targetType,
          signals: signalEntities,
          ...(tags.length > 0 ? { signal_tags: tags.slice(0, 4) } : {}),
          ...(targetType === "place" ? { signal_location: this.run.brief.city } : {}),
          limit: 5,
        },
        { allowFixture: this.isExplicitFixture }
      );

      if (res.status === "error") {
        if (!this.isExplicitFixture) {
          this.run.warnings.push(`Recommendation for ${targetType} failed: ${res.error?.code || res.summary}.`);
        }
        continue;
      }

      const domainCandidates: DiscoveredEntity[] = [];
      if (Array.isArray(res.results)) {
        for (const raw of res.results) {
          const name = raw.name || raw.title;
          if (name && !signalEntities.some((s) => s.toLowerCase() === name.toLowerCase())) {
            domainCandidates.push({
              id: raw.entity_id || raw.id || `ent_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
              name,
              category: targetType,
              score: typeof raw.score === "number" ? raw.score : 0.85,
              summary: raw.summary || raw.description,
              location: raw.location,
              provenanceRequestId: res.provenance.requestId,
            });
          }
        }
      }

      candidatesByDomain[targetType] = domainCandidates;

      if (domainCandidates.length > 0) {
        this.addEvidence({
          evidenceClass: "QLOO_EVIDENCE",
          statement: `Qloo Cross-Domain Discovery (${targetType.toUpperCase()}): Discovered candidates: ${domainCandidates.map((c) => `'${c.name}'`).join(", ")}.`,
          qlooTool: "qloo_recommend",
          requestId: res.provenance.requestId,
          entityNames: domainCandidates.map((c) => c.name),
          sourceMode: res.provenance.sourceMode,
        });
      }
    }

    return candidatesByDomain;
  }

  private async rankCandidatesByDomain(
    anchors: ResolvedAnchor[],
    candidatesByDomain: Record<string, DiscoveredEntity[]>
  ): Promise<Record<string, DiscoveredEntity[]>> {
    const rankedByDomain: Record<string, DiscoveredEntity[]> = {};
    const signals = anchors.map((a) => a.name);
    let anyDomainRankSucceeded = false;
    let anyDomainRankFailed = false;

    for (const [domain, candidates] of Object.entries(candidatesByDomain)) {
      if (candidates.length === 0) continue;
      if (!this.checkBudget()) {
        this.run.warnings.push(`Call budget exceeded before ranking domain "${domain}".`);
        this.run.sourceMode = "DEGRADED";
        continue;
      }

      this.run.qlooCallCount++;
      const options = candidates.map((c) => c.name);
      const batchId = `batch_${domain}_${this.run.id.slice(0, 8)}`;

      const res = await this.qlooClient.callTool(
        "qloo_rank",
        {
          options,
          option_type: domain,
          signals,
          ...(domain === "place" ? { signal_location: this.run.brief.city } : {}),
        },
        { allowFixture: this.isExplicitFixture }
      );

      // Handle every canonical status explicitly:
      if (res.status === "error") {
        anyDomainRankFailed = true;
        this.run.warnings.push(`Ranking failed for domain "${domain}": ${res.error?.code || res.summary || "Upstream error"}`);
        if (!this.isExplicitFixture) {
          this.run.sourceMode = anyDomainRankSucceeded ? "DEGRADED" : "ERROR";
        }
        // Do NOT add QLOO_EVIDENCE and do NOT fabricate rank/score/batchId/rankDigest
        continue;
      }

      if (res.status === "empty") {
        this.run.warnings.push(`No ranking results returned by Qloo for domain "${domain}".`);
        if (!this.isExplicitFixture) {
          this.run.sourceMode = "DEGRADED";
        }
        continue;
      }

      if (res.status === "needs_input") {
        this.run.warnings.push(`Ranking requires input or disambiguation for domain "${domain}": ${res.summary}`);
        if (!this.isExplicitFixture) {
          this.run.sourceMode = "DEGRADED";
        }
        continue;
      }

      // res.status === "ok" || res.status === "partial" || res.status === "degraded"
      if (res.status === "degraded" || res.status === "partial") {
        this.run.sourceMode = "DEGRADED";
        this.run.warnings.push(`Ranking for domain "${domain}" completed with status "${res.status}": ${res.summary || "Partial results"}`);
      }

      const rankedList: DiscoveredEntity[] = [];
      const orderedRankResults: string[] = [];
      const scores: number[] = [];

      if (Array.isArray(res.results)) {
        for (const item of res.results) {
          const optName = item.option || item.name;
          const found = candidates.find((c) => c.name.toLowerCase() === String(optName).toLowerCase());
          if (found) {
            const assignedRank = typeof item.rank === "number" ? item.rank : rankedList.length + 1;
            const assignedScore = typeof item.score === "number" ? item.score : found.score;
            rankedList.push({
              ...found,
              rank: assignedRank,
              score: assignedScore,
            });
            orderedRankResults.push(found.name);
            if (typeof assignedScore === "number") {
              scores.push(assignedScore);
            }
          }
        }
      }

      // Only if Qloo actually returned ranked candidates
      if (rankedList.length > 0) {
        anyDomainRankSucceeded = true;
        const rankDigest = computeRankDigest({
          domain,
          orderedInputOptions: options,
          signals,
          orderedRankResults,
          scores,
          requestId: res.provenance.requestId,
        });

        rankedByDomain[domain] = rankedList;

        this.addEvidence({
          evidenceClass: this.isExplicitFixture ? "DEMO_FIXTURE" : "QLOO_EVIDENCE",
          statement: `Qloo Single-Query Ranking (${domain.toUpperCase()} Batch #${batchId}): Ranked ${orderedRankResults.length} options against anchors [${signals.join(", ")}]. Top: "${rankedList[0]?.name}". Integrity Checksum: ${rankDigest}.`,
          qlooTool: "qloo_rank",
          requestId: res.provenance.requestId,
          entityNames: rankedList.map((c) => c.name),
          sourceMode: res.provenance.sourceMode,
        });

        // Bind batchId and deterministic rankDigest
        for (const ent of rankedList) {
          (ent as any).batchId = batchId;
          (ent as any).rankDigest = rankDigest;
        }
      } else {
        this.run.warnings.push(`Ranking results for domain "${domain}" could not be mapped to candidate set.`);
        if (!this.isExplicitFixture) {
          this.run.sourceMode = "DEGRADED";
        }
      }
    }

    if (!anyDomainRankSucceeded && anyDomainRankFailed && !this.isExplicitFixture) {
      this.run.sourceMode = "ERROR";
    }

    return rankedByDomain;
  }

  private composeActivationPlans(
    anchors: ResolvedAnchor[],
    rankedEntities: Record<string, DiscoveredEntity[]>
  ): ActivationPlan[] {
    const plans: ActivationPlan[] = [];
    const evIds = this.run.evidence.map((e) => e.id);
    const primaryAnchor = anchors[0]?.name || "Cultural Anchor";

    // 1. DISPLAY Plan (derived from top movie or top brand)
    const topMovie = rankedEntities.movie?.[0];
    const topBrand = rankedEntities.brand?.[0];
    const displayEntity = topMovie || topBrand;

    if (displayEntity) {
      const title = topMovie
        ? `Cinematic Workwear: '${topMovie.name}' Editorial Reframe`
        : `Aesthetic Lineage: Inspired by ${displayEntity.name}`;

      const hypothesis = topMovie
        ? `Reframing the ${this.run.brief.itemName} through the visual mood of '${topMovie.name}' and ${primaryAnchor} transforms it from deadstock to a focal piece for aesthetic film enthusiasts.`
        : `Presenting the ${this.run.brief.itemName} alongside styling cues from ${displayEntity.name} highlights natural materials and artisanal craftsmanship.`;

      const actions = [
        `Re-style front display pairing ${this.run.brief.itemName} with clean silhouettes and neutral tones`,
        `Display an editorial signage card highlighting natural fabrication and palettes inspired by ${displayEntity.name}`,
        `Curate an in-store background audio selection evoking the mood of ${displayEntity.name}`,
      ];

      const hasRankDigest = Boolean((displayEntity as any).rankDigest);

      plans.push({
        id: "plan-display-01",
        mechanism: "DISPLAY",
        title,
        hypothesis,
        actions,
        estimatedCost: 180,
        experimentMetric: `Weekly sell-through velocity of ${this.run.brief.itemName} (target: 10 units/week)`,
        stopCondition: "If fewer than 3 units sell in 7 days, rotate window styling",
        evidenceNodeIds: evIds,
        culturalEntityNames: [displayEntity.name],
        constraintChecks: [],
        scoreContext: hasRankDigest
          ? {
              withinQueryRank: displayEntity.rank || 1,
              totalRankedInBatch: rankedEntities.movie?.length || rankedEntities.brand?.length || 1,
              batchRankCallId: (displayEntity as any).batchId,
              rankDigest: (displayEntity as any).rankDigest,
            }
          : undefined,
      });
    }

    // 2. BUNDLE Plan (derived from top brand or second entity)
    const bundleBrand = topBrand || rankedEntities.brand?.[1];
    if (bundleBrand) {
      const hasRankDigest = Boolean((bundleBrand as any).rankDigest);

      plans.push({
        id: "plan-bundle-02",
        mechanism: "BUNDLE",
        title: `Curated Pairing: ${bundleBrand.name} Lifestyle Capsule`,
        hypothesis: `Pairing the ${this.run.brief.itemName} with artisanal accessories inspired by ${bundleBrand.name} and ${primaryAnchor} creates a distinct lifestyle context.`,
        actions: [
          `Create a curated ${bundleBrand.name}-inspired vignette near the fitting room area`,
          `Package the ${this.run.brief.itemName} with an artisanal garment care accessory`,
          "Offer a modest bundled pricing tier when purchased with complementary accessories",
        ],
        estimatedCost: 240,
        experimentMetric: "Bundle attachment frequency and conversion velocity at checkout",
        stopCondition: "Cease bundling if accessories inventory depletes before 8 units sell",
        evidenceNodeIds: evIds,
        culturalEntityNames: [bundleBrand.name],
        constraintChecks: [],
        scoreContext: hasRankDigest
          ? {
              withinQueryRank: bundleBrand.rank || 1,
              totalRankedInBatch: rankedEntities.brand?.length || 1,
              batchRankCallId: (bundleBrand as any).batchId,
              rankDigest: (bundleBrand as any).rankDigest,
            }
          : undefined,
      });
    }

    // 3. LOCAL_ACTIVATION Plan (derived from top local place)
    const topPlace = rankedEntities.place?.[0];
    if (topPlace) {
      const hasRankDigest = Boolean((topPlace as any).rankDigest);

      plans.push({
        id: "plan-local-03",
        mechanism: "LOCAL_ACTIVATION",
        title: `Community Gathering: ${topPlace.name} Cultural Pop-Up`,
        hypothesis: `Engaging the creative community gathering near ${topPlace.name} in ${this.run.brief.city} brings foot traffic that appreciates ${primaryAnchor}-aligned design.`,
        actions: [
          `Host an evening sidewalk rail outside the boutique during peak weekend hours near ${topPlace.name}`,
          `Provide an exclusive postcard lookbook featuring ${this.run.brief.itemName}`,
          "Offer a local event ticket receipt concession for visitors during weekend screening hours",
        ],
        estimatedCost: 350,
        experimentMetric: `Foot-traffic store visits during weekend screening hours near ${topPlace.name}`,
        stopCondition: "Halt sidewalk presence if weather is inclement",
        evidenceNodeIds: evIds,
        culturalEntityNames: [topPlace.name],
        constraintChecks: [],
        scoreContext: hasRankDigest
          ? {
              withinQueryRank: topPlace.rank || 1,
              totalRankedInBatch: rankedEntities.place?.length || 1,
              batchRankCallId: (topPlace as any).batchId,
              rankDigest: (topPlace as any).rankDigest,
            }
          : undefined,
      });
    }

    return plans;
  }

  private sanitizePlans(plans: ActivationPlan[]) {
    for (const plan of plans) {
      plan.hypothesis = plan.hypothesis
        .replace(/will\s+(definitely\s+)?increase\s+sales/gi, "may improve customer resonance")
        .replace(/guarantee(d)?\s+(sales|revenue|profit)/gi, "projected interest")
        .replace(/qloo\s+proves\s+causation/gi, "qloo identifies correlation");
    }
  }
}
