import React from "react";
import { ActivationPlan, EvidenceNode } from "@lastrack/contracts";
import { Eye, PackageCheck, MapPin, CheckCircle, ExternalLink, ArrowRight } from "lucide-react";

interface InterventionBoardProps {
  plans: ActivationPlan[];
  evidence: EvidenceNode[];
  onSelectPlan: (plan: ActivationPlan) => void;
  onOpenEvidence: (evidenceNodeId: string) => void;
}

export const InterventionBoard: React.FC<InterventionBoardProps> = ({
  plans,
  evidence,
  onSelectPlan,
  onOpenEvidence,
}) => {
  const getMechanismIcon = (mech: string) => {
    switch (mech) {
      case "DISPLAY":
        return <Eye size={16} color="var(--signal-rescue)" />;
      case "BUNDLE":
        return <PackageCheck size={16} color="var(--signal-evidence)" />;
      default:
        return <MapPin size={16} color="var(--signal-caution)" />;
    }
  };

  if (!plans || plans.length === 0) return null;

  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          3. Feasible Inventory Rescue Interventions (3 Mechanisms)
        </h2>
        <p style={{ fontSize: "12px", color: "var(--ink-secondary)", margin: "2px 0 0 0" }}>
          Every hypothesis is tied to verified Qloo cultural adjacencies and tested within commercial budget constraints.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "16px",
      }}>
        {plans.map((plan, idx) => (
          <div
            key={plan.id}
            style={{
              backgroundColor: "var(--canvas-elevated)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              flexDirection: "column",
              padding: "20px",
              boxShadow: "var(--shadow-subtle)",
              position: "relative",
            }}
          >
            {/* Header: Mechanism & Rank Context */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--ink-secondary)" }}>
                {getMechanismIcon(plan.mechanism)}
                {plan.mechanism} REFRAME
              </div>

              {plan.scoreContext && (
                <span style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "2px",
                  backgroundColor: "var(--canvas-surface)",
                  border: "1px solid var(--rule-light)",
                  color: "var(--ink)",
                }}>
                  Rank #{plan.scoreContext.withinQueryRank} of {plan.scoreContext.totalRankedInBatch} in single batch
                </span>
              )}
            </div>

            {/* Title & Hypothesis */}
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px", lineHeight: 1.3 }}>
              {plan.title}
            </h3>

            <p style={{ fontSize: "13px", color: "var(--ink-secondary)", marginBottom: "16px", flex: "1 0 auto", fontStyle: "italic", lineHeight: 1.45 }}>
              "{plan.hypothesis}"
            </p>

            {/* Actions List */}
            <div style={{ marginBottom: "16px", backgroundColor: "var(--canvas)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule-light)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "6px" }}>
                Concrete Action Steps:
              </div>
              <ul style={{ paddingLeft: "16px", fontSize: "12px", color: "var(--ink)", margin: 0 }}>
                {plan.actions.map((act, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>{act}</li>
                ))}
              </ul>
            </div>

            {/* Budget & Constraints */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "3px", backgroundColor: "var(--canvas-surface)", color: "var(--ink)" }}>
                Cost: ${plan.estimatedCost}
              </span>

              {plan.constraintChecks.map((c, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "3px",
                    backgroundColor: c.status === "PASS" ? "var(--signal-evidence-light)" : "var(--signal-rescue-light)",
                    color: c.status === "PASS" ? "var(--signal-evidence)" : "var(--signal-rescue)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title={c.detail}
                >
                  <CheckCircle size={11} /> {c.rule}: {c.status}
                </span>
              ))}
            </div>

            {/* Evidence Chips */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "6px" }}>
                Supporting Qloo Evidence Nodes:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {plan.evidenceNodeIds.map((nodeId) => (
                  <button
                    key={nodeId}
                    type="button"
                    onClick={() => onOpenEvidence(nodeId)}
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      backgroundColor: "var(--canvas-surface)",
                      border: "1px solid var(--rule)",
                      borderRadius: "2px",
                      color: "var(--signal-evidence)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                    title="Click to view verified evidence node"
                  >
                    <span>{nodeId}</span>
                    <ExternalLink size={9} />
                  </button>
                ))}
              </div>
            </div>

            {/* CTA: Select Plan */}
            <button
              type="button"
              onClick={() => onSelectPlan(plan)}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "13px",
                fontWeight: 700,
                backgroundColor: "var(--ink)",
                color: "var(--canvas)",
                borderRadius: "var(--radius-sm)",
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--ink-secondary)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--ink)")}
            >
              Select & Export Experiment <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
