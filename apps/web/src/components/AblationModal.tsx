import React from "react";
import { ActivationPlan } from "@lastrack/contracts";
import { X, Sparkles } from "lucide-react";

interface AblationModalProps {
  isOpen: boolean;
  onClose: () => void;
  qlooPlans: ActivationPlan[];
  ablatedPlans: ActivationPlan[];
  evidenceCount: number;
}

export const AblationModal: React.FC<AblationModalProps> = ({
  isOpen,
  onClose,
  qlooPlans,
  ablatedPlans,
  evidenceCount,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(20, 32, 28, 0.6)",
        zIndex: 60,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        id="ablation-modal"
        data-testid="ablation-modal"
        role="dialog"
        aria-modal="true"
        aria-label="The Qloo Indispensability Test"
        style={{
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "90vh",
          backgroundColor: "var(--canvas-elevated)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-elevated)",
          display: "flex",
          flexDirection: "column",
          padding: "24px",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--rule-light)", paddingBottom: "16px", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} color="var(--signal-rescue)" />
              The Qloo Indispensability Test (Ablation Comparison)
            </h2>
            <p style={{ fontSize: "13px", color: "var(--ink-secondary)", margin: "4px 0 0 0" }}>
              Proof of why Qloo's cross-domain taste graph is the core technological differentiator, not decorative styling.
            </p>
          </div>

          <button onClick={onClose} aria-label="Close ablation modal" style={{ padding: "4px", color: "var(--ink-muted)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Core Contrast Statement */}
        <div style={{
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-sm)",
          padding: "16px",
          marginBottom: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--signal-evidence)", textTransform: "uppercase", marginBottom: "4px" }}>
              WITH QLOO CULTURAL INTELLIGENCE
            </div>
            <p style={{ fontSize: "13px", color: "var(--ink)", margin: 0 }}>
              The agent discovers hidden taste connections across cinema (A24 / Past Lives), heritage fashion (Bode / Toast UK), and local community hubs (Nitehawk / Word), producing <strong>3 targeted cultural repositioning experiments</strong> backed by {evidenceCount} evidence nodes.
            </p>
          </div>

          <div style={{ borderLeft: "1px solid var(--rule-light)", paddingLeft: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--signal-rescue)", textTransform: "uppercase", marginBottom: "4px" }}>
              WITHOUT QLOO (GENERIC BASELINE)
            </div>
            <p style={{ fontSize: "13px", color: "var(--ink)", margin: 0 }}>
              The system collapses into <strong>generic price-cutting and blunt markdowns</strong> (10% off clearance rack, arbitrary tote bag bundle, weekend sidewalk rack). Zero cultural entities or subculture adjacencies can be formed.
            </p>
          </div>
        </div>

        {/* Side-by-Side Plan Comparison */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Column 1: Qloo-Enabled */}
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--signal-evidence)", borderBottom: "2px solid var(--signal-evidence)", paddingBottom: "6px", marginBottom: "12px" }}>
              Qloo-Grounded Activations ({qlooPlans.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {qlooPlans.map((p) => (
                <div key={p.id} style={{ border: "1px solid var(--signal-evidence)", backgroundColor: "var(--signal-evidence-light)", borderRadius: "var(--radius-sm)", padding: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--signal-evidence)" }}>
                    {p.mechanism}: {p.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink)", marginTop: "4px" }}>
                    {p.hypothesis}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--ink-secondary)", marginTop: "6px", fontWeight: 600 }}>
                    Entities: {p.culturalEntityNames.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Ablated / Generic */}
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--signal-rescue)", borderBottom: "2px solid var(--signal-rescue)", paddingBottom: "6px", marginBottom: "12px" }}>
              Ablated Generic Baseline ({ablatedPlans.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {ablatedPlans.map((p) => (
                <div key={p.id} style={{ border: "1px solid var(--rule)", backgroundColor: "var(--canvas-surface)", borderRadius: "var(--radius-sm)", padding: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--ink-secondary)" }}>
                    {p.mechanism}: {p.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink)", marginTop: "4px" }}>
                    {p.hypothesis}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--signal-rescue)", marginTop: "6px", fontStyle: "italic" }}>
                    0 cultural entities (defaults to price cut)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--rule-light)", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 700,
              backgroundColor: "var(--ink)",
              color: "var(--canvas)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
