import React from "react";
import { AgentRun, AgentState } from "@lastrack/contracts";
import { CheckCircle2, Loader2, AlertCircle, XCircle, Terminal } from "lucide-react";

interface AgentWorkbenchProps {
  run: AgentRun | null;
  onCancel: () => void;
}

const WORKBENCH_STEPS: Array<{ state: AgentState; label: string; tool?: string; description: string }> = [
  { state: "VALIDATING_BRIEF", label: "Brief Validation", description: "Verifying merchant stock volume, budget limit, and observation window." },
  { state: "RESOLVING_ANCHORS", label: "Anchor Resolution", tool: "qloo_describe", description: "Mapping merchant cultural seeds to verified Qloo entity graph identifiers." },
  { state: "MAPPING_TASTE", label: "Aesthetic Vocabulary Mapping", tool: "qloo_find_tags", description: "Extracting co-occurring cultural and fashion subculture tags." },
  { state: "GENERATING_CANDIDATES", label: "Cross-Domain Discovery", tool: "qloo_recommend", description: "Querying adjacent entities across cinema, complementary fashion, and local venues." },
  { state: "RANKING_CANDIDATES", label: "Single-Query Batch Ranking", tool: "qloo_rank", description: "Evaluating all comparable options in a single call to preserve valid score parity." },
  { state: "CONSTRAINT_CHECK", label: "Commercial Constraint Gate", description: "Testing candidates against budget caps, markdown ceilings, and forbidden tactics." },
  { state: "CRITIQUE", label: "Evidence Critique & Synthesis", description: "Validating 100% evidence linkage, checking claims, and bounding hypotheses." },
];

export const AgentWorkbench: React.FC<AgentWorkbenchProps> = ({ run, onCancel }) => {
  if (!run) return null;

  const currentState = run.state;
  const isRunning = !["READY", "ERROR", "NEEDS_INPUT", "IDLE"].includes(currentState);

  const getStepStatus = (stepState: AgentState, _stepIndex: number) => {
    const stateOrder: AgentState[] = [
      "VALIDATING_BRIEF",
      "RESOLVING_ANCHORS",
      "MAPPING_TASTE",
      "GENERATING_CANDIDATES",
      "RANKING_CANDIDATES",
      "CONSTRAINT_CHECK",
      "CRITIQUE",
      "READY",
    ];

    const currentIndex = stateOrder.indexOf(currentState);
    const targetIndex = stateOrder.indexOf(stepState);

    if (currentState === "READY" || currentIndex > targetIndex) {
      return "completed";
    }
    if (currentIndex === targetIndex) {
      return "active";
    }
    return "pending";
  };

  return (
    <div style={{
      backgroundColor: "var(--canvas-elevated)",
      border: "1px solid var(--rule)",
      borderRadius: "var(--radius-md)",
      padding: "20px",
      marginTop: "16px",
      boxShadow: "var(--shadow-subtle)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--rule-light)",
        paddingBottom: "12px",
        marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Terminal size={16} color="var(--signal-evidence)" />
          <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            2. Bounded Agent Controller Trace
          </h2>
          <span style={{ fontSize: "11px", color: "var(--ink-secondary)", marginLeft: "8px" }}>
            Budget: {run.qlooCallCount}/{run.maxCallBudget} Qloo calls
          </span>
        </div>

        {isRunning && (
          <button
            onClick={onCancel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--signal-rescue)",
              border: "1px solid var(--signal-rescue)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <XCircle size={13} />
            Cancel Run
          </button>
        )}
      </div>

      {/* 7-Step Progression Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {WORKBENCH_STEPS.map((step, idx) => {
          const status = getStepStatus(step.state, idx);

          return (
            <div
              key={step.state}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "8px 12px",
                backgroundColor: status === "active" ? "var(--canvas-surface)" : "transparent",
                borderRadius: "var(--radius-sm)",
                borderLeft: status === "active" ? "3px solid var(--signal-evidence)" : "3px solid transparent",
                opacity: status === "pending" ? 0.45 : 1,
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ marginTop: "2px" }}>
                {status === "completed" && <CheckCircle2 size={16} color="var(--signal-evidence)" />}
                {status === "active" && <Loader2 size={16} color="var(--signal-evidence)" className="animate-spin" />}
                {status === "pending" && <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--rule)" }} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontWeight: status === "active" ? 700 : 600, color: "var(--ink)" }}>
                    Step {idx + 1}: {step.label}
                  </span>
                  {step.tool && (
                    <span style={{ fontSize: "10px", fontFamily: "monospace", padding: "1px 6px", backgroundColor: "var(--canvas)", border: "1px solid var(--rule-light)", borderRadius: "2px", color: "var(--ink-secondary)" }}>
                      tool: {step.tool}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "var(--ink-secondary)", marginTop: "2px" }}>
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning / Error Alerts */}
      {run.warnings.length > 0 && (
        <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "var(--signal-caution-light)", borderRadius: "var(--radius-sm)", border: "1px solid var(--signal-caution)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--signal-caution)" }}>
            <AlertCircle size={14} /> Bounded Revision Notices ({run.warnings.length}):
          </div>
          <ul style={{ fontSize: "11px", color: "var(--ink)", paddingLeft: "20px", marginTop: "4px" }}>
            {run.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
