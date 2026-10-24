import React from "react";
import { ActivationPlan, InventoryBrief, EvidenceNode, MANDATORY_DISCLAIMER } from "@lastrack/contracts";
import { X, Printer, Download, ShieldCheck } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ActivationPlan | null;
  brief: InventoryBrief;
  evidence: EvidenceNode[];
  runId: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  plan,
  brief,
  evidence,
  runId,
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

  if (!isOpen || !plan) return null;

  const linkedEvidence = evidence.filter((e) => plan.evidenceNodeIds.includes(e.id));

  const handlePrint = () => {
    window.open(`/api/runs/${runId}/export/html?planId=${plan.id}`, "_blank");
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      runId,
      selectedPlan: plan,
      brief,
      evidenceTrail: linkedEvidence,
      disclaimer: MANDATORY_DISCLAIMER,
      exportedAt: new Date().toISOString(),
    }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lastrack-experiment-${plan.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

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
        id="receipt-modal"
        data-testid="receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Approved Decision Receipt"
        style={{
          width: "100%",
          maxWidth: "800px",
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
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--ink)", paddingBottom: "16px", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "var(--signal-evidence)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <ShieldCheck size={14} /> Approved Decision Receipt
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "4px 0 0 0" }}>
              {plan.title}
            </h2>
            <div style={{ fontSize: "12px", color: "var(--ink-secondary)", marginTop: "2px" }}>
              Target: {brief.unitsOnHand} units of {brief.itemName} ({brief.category}) in {brief.city}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
              }}
              title="Open Printable HTML Card"
            >
              <Printer size={13} /> Print Card
            </button>

            <button
              onClick={handleDownloadJson}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
              }}
              title="Download JSON Audit Receipt"
            >
              <Download size={13} /> JSON
            </button>

            <button onClick={onClose} aria-label="Close receipt modal" style={{ padding: "4px", color: "var(--ink-muted)", marginLeft: "4px" }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Experiment Details */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "4px" }}>
            HYPOTHESIS & GOAL
          </div>
          <p style={{ fontSize: "14px", color: "var(--ink)", lineHeight: 1.5, margin: "0 0 16px 0", fontStyle: "italic" }}>
            "{plan.hypothesis}"
          </p>

          <div style={{ backgroundColor: "var(--canvas)", padding: "16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule-light)", marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "8px" }}>
              ACTION CHECKLIST FOR RETAIL STAFF
            </div>
            <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "var(--ink)", margin: 0 }}>
              {plan.actions.map((act, i) => (
                <li key={i} style={{ marginBottom: "6px" }}>{act}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px", backgroundColor: "var(--canvas-surface)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-muted)" }}>ESTIMATED COST:</span>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>${plan.estimatedCost} (Budget Cap: ${brief.budgetCap})</div>
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-muted)" }}>SUCCESS METRIC:</span>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{plan.experimentMetric}</div>
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-muted)" }}>STOP CONDITION:</span>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--signal-rescue)" }}>{plan.stopCondition}</div>
            </div>
          </div>
        </div>

        {/* Evidence Trail */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--signal-evidence)", marginBottom: "8px" }}>
            LINKED EVIDENCE NODES ({linkedEvidence.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {linkedEvidence.map((node) => (
              <div key={node.id} style={{ borderLeft: "3px solid var(--signal-evidence)", paddingLeft: "10px", fontSize: "12px" }}>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{node.statement}</div>
                <div style={{ fontSize: "10px", color: "var(--ink-secondary)", marginTop: "2px" }}>
                  Node: <code>{node.id}</code> {node.qlooTool ? `| Tool: ${node.qlooTool}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit & Integrity Digest */}
        {plan.scoreContext?.rankDigest && (
          <div style={{ marginBottom: "16px", padding: "10px", backgroundColor: "var(--canvas-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule-light)", fontSize: "11px" }}>
            <span style={{ fontWeight: 700, color: "var(--ink-secondary)" }}>SHA-256 Digest: </span>
            <code style={{ fontSize: "10px" }}>{plan.scoreContext.rankDigest}</code>
          </div>
        )}

        {/* Mandatory Legal & Ethical Notice */}
        <div style={{
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-sm)",
          padding: "14px",
          fontSize: "12px",
          color: "var(--ink-secondary)",
          fontStyle: "italic",
        }}>
          <strong>Mandatory Notice:</strong> {MANDATORY_DISCLAIMER}
        </div>
      </div>
    </div>
  );
};
