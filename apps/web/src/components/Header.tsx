import React from "react";
import { SourceMode } from "@lastrack/contracts";
import { ShieldCheck, Info, Sparkles, Activity } from "lucide-react";

interface HeaderProps {
  sourceMode: SourceMode;
  onOpenAbout: () => void;
  onOpenAblation: () => void;
  isRunActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  sourceMode,
  onOpenAbout,
  onOpenAblation,
  isRunActive,
}) => {
  const getBadgeClass = (mode: SourceMode) => {
    switch (mode) {
      case "LIVE_QLOO":
      case "CACHED_QLOO":
        return "badge-live";
      case "DEMO_FIXTURE":
        return "badge-fixture";
      default:
        return "badge-degraded";
    }
  };

  return (
    <header style={{
      borderBottom: "1px solid var(--rule)",
      backgroundColor: "var(--canvas-elevated)",
      padding: "16px 0",
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}>
      <div className="container" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
      }}>
        {/* Brand & Value Proposition */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: "var(--ink)",
                margin: 0,
              }}>
                LASTRACK
              </h1>
              <span className={`badge-tag ${getBadgeClass(sourceMode)}`} title="Qloo Data Origin Status">
                {sourceMode === "LIVE_QLOO" && <Sparkles size={11} />}
                {sourceMode === "DEMO_FIXTURE" && <ShieldCheck size={11} />}
                {sourceMode}
              </span>
            </div>
            <p style={{
              fontSize: "12px",
              color: "var(--ink-secondary)",
              margin: "2px 0 0 0",
            }}>
              Turn slow stock into a culturally grounded experiment before cutting the price.
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onOpenAblation}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--canvas)",
              color: "var(--ink)",
              transition: "background 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--canvas-surface)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--canvas)")}
            title="Compare results with and without Qloo taste intelligence"
          >
            <Activity size={14} color="var(--signal-rescue)" />
            Why Qloo? (Ablation)
          </button>

          <button
            onClick={onOpenAbout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--canvas)",
              color: "var(--ink-secondary)",
              transition: "background 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--canvas-surface)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--canvas)")}
          >
            <Info size={14} />
            Method & Safe Use
          </button>
        </div>
      </div>
    </header>
  );
};
