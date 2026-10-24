import React from "react";
import { EvidenceNode } from "@lastrack/contracts";
import { X, Database, FileText, Sparkles } from "lucide-react";

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidenceNode[];
  highlightedNodeId: string | null;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  evidence,
  highlightedNodeId,
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

  const getClassIcon = (cls: string) => {
    switch (cls) {
      case "QLOO_EVIDENCE":
        return <Sparkles size={14} color="var(--signal-evidence)" />;
      case "MERCHANT_INPUT":
        return <FileText size={14} color="var(--ink-secondary)" />;
      default:
        return <Database size={14} color="var(--signal-caution)" />;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(20, 32, 28, 0.45)",
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        id="evidence-drawer"
        data-testid="evidence-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Supporting Evidence Ledger"
        style={{
          width: "100%",
          maxWidth: "540px",
          height: "100%",
          backgroundColor: "var(--canvas-elevated)",
          borderLeft: "1px solid var(--rule)",
          boxShadow: "var(--shadow-elevated)",
          display: "flex",
          flexDirection: "column",
          padding: "24px",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rule-light)", paddingBottom: "16px", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
              Supporting Evidence Ledger
            </h2>
            <p style={{ fontSize: "12px", color: "var(--ink-secondary)", margin: "2px 0 0 0" }}>
              {evidence.length} machine-verified provenance nodes
            </p>
          </div>

          <button
            onClick={onClose}
            style={{ padding: "4px", color: "var(--ink-muted)", borderRadius: "var(--radius-sm)" }}
            title="Close Drawer"
            aria-label="Close Drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Evidence List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {evidence.map((node) => {
            const isHighlighted = highlightedNodeId === node.id;

            return (
              <div
                key={node.id}
                style={{
                  border: isHighlighted ? "2px solid var(--signal-evidence)" : "1px solid var(--rule)",
                  backgroundColor: isHighlighted ? "var(--signal-evidence-light)" : "var(--canvas)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "var(--signal-evidence)", textTransform: "uppercase" }}>
                    {getClassIcon(node.evidenceClass)}
                    {node.evidenceClass}
                  </div>

                  <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--ink-muted)" }}>
                    {node.id}
                  </span>
                </div>

                <div style={{ fontSize: "13px", color: "var(--ink)", lineHeight: 1.45, marginBottom: "8px" }}>
                  {node.statement}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "10px", color: "var(--ink-secondary)", borderTop: "1px solid var(--rule-light)", paddingTop: "6px" }}>
                  {node.qlooTool && <span>Tool: <code>{node.qlooTool}</code></span>}
                  {node.requestId && <span>Request: <code>{node.requestId}</code></span>}
                  <span>Origin: <strong>{node.sourceMode}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
