import React from "react";
import { X, Shield, Lock, Cpu } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
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
        id="about-modal"
        data-testid="about-modal"
        role="dialog"
        aria-modal="true"
        aria-label="LastRack Architecture and Safe Use Boundary"
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          backgroundColor: "var(--canvas-elevated)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-elevated)",
          display: "flex",
          flexDirection: "column",
          padding: "28px",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--rule-light)", paddingBottom: "16px", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
              LastRack Architecture & Safe Use Boundary
            </h2>
            <p style={{ fontSize: "13px", color: "var(--ink-secondary)", margin: "4px 0 0 0" }}>
              Operational standards and ethical principles for the Qloo Agentic Hackathon
            </p>
          </div>

          <button onClick={onClose} aria-label="Close about modal" style={{ padding: "4px", color: "var(--ink-muted)" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontSize: "13px", color: "var(--ink)", lineHeight: 1.6 }}>
          {/* Safe Use */}
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--signal-evidence)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Shield size={16} /> 1. Qloo Safe Use & Privacy Contract (No Demographic Profiling)
            </h3>
            <p>
              LastRack strictly adheres to the official Qloo Safe-Use guidelines. All recommendations are derived from <strong>aggregate taste correlations</strong> between cultural entities. The system explicitly refuses and disables all inferences regarding race, religion, sexual orientation, health conditions, or sensitive demographic traits.
            </p>
          </div>

          {/* Zero Prophecy */}
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--signal-caution)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Lock size={16} /> 2. No Sales Prophecies or False Multipliers
            </h3>
            <p>
              We treat Qloo's taste affinity scores as <strong>directional cultural hypotheses</strong>, not deterministic sales forecasts. LastRack never fabricates sales percentage guarantees (e.g., "3x more likely to buy") or claims affinity implies causality. Every output requires human merchant review.
            </p>
          </div>

          {/* Single-Query Parity */}
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Cpu size={16} /> 3. Single-Query Batch Ranking Invariant
            </h3>
            <p>
              Under Qloo's mathematical ranking model, affinity scores across separate API requests do not share a common global scale. LastRack enforces a strict algorithmic invariant: <strong>one <code>qloo_rank</code> batch per comparable entity domain</strong> to preserve true score parity.
            </p>
          </div>

          {/* Synthetic Demo Notice */}
          <div style={{ backgroundColor: "var(--canvas)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule-light)" }}>
            <div style={{ fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "4px" }}>
              SYNTHETIC DEMONSTRATION NOTICE
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-secondary)" }}>
              The 42-unit Olive Linen Overshirt boutique scenario bundled with this prototype is a synthetic demonstration fixture (<code>isSyntheticDemo: true</code>) designed to evaluate inventory rescue mechanics without exposing proprietary merchant records.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "24px", textAlign: "right" }}>
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
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
