import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  InventoryBrief,
  AgentRun,
  ActivationPlan,
  SourceMode,
  HealthResponse,
} from "@lastrack/contracts";
import { SYNTHETIC_JUDGE_BRIEF, DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { Header } from "./components/Header";
import { BriefForm } from "./components/BriefForm";
import { AgentWorkbench } from "./components/AgentWorkbench";
import { InterventionBoard } from "./components/InterventionBoard";
import { EvidenceDrawer } from "./components/EvidenceDrawer";
import { AblationModal } from "./components/AblationModal";
import { ReceiptModal } from "./components/ReceiptModal";
import { AboutModal } from "./components/AboutModal";

export const App: React.FC = () => {
  const isStaticDemo = import.meta.env.VITE_STATIC_DEMO === "true";
  const [brief, setBrief] = useState<InventoryBrief>(SYNTHETIC_JUDGE_BRIEF);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(DEMO_AGENT_RUN);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAblationOpen, setIsAblationOpen] = useState(false);
  const [isEvidenceDrawerOpen, setIsEvidenceDrawerOpen] = useState(false);
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState<string | null>(null);
  const [selectedPlanForReceipt, setSelectedPlanForReceipt] = useState<ActivationPlan | null>(null);

  // Poll server health for live status
  const { data: healthData } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: async () => {
      if (isStaticDemo) {
        return {
          status: "degraded",
          qlooConfigured: false,
          sourceMode: "DEMO_FIXTURE",
          uptimeSeconds: 0,
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        };
      }
      try {
        const res = await fetch("/api/health");
        if (!res.ok) throw new Error("Health check failed");
        return res.json();
      } catch {
        return {
          status: "degraded",
          qlooConfigured: false,
          sourceMode: "DEMO_FIXTURE",
          uptimeSeconds: 0,
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        };
      }
    },
    refetchInterval: 30000,
  });

  const sourceMode: SourceMode = currentRun?.sourceMode || healthData?.sourceMode || "DEMO_FIXTURE";

  const handleStartRun = async (newBrief: InventoryBrief) => {
    setBrief(newBrief);
    setIsLoading(true);

    if (isStaticDemo) {
      window.setTimeout(() => {
        setCurrentRun(DEMO_AGENT_RUN);
        setIsLoading(false);
      }, 650);
      return;
    }

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBrief),
      });

      if (!res.ok) {
        throw new Error(`Failed to start run: ${res.statusText}`);
      }

      const { runId } = await res.json();

      // Listen to SSE progress stream
      const eventSource = new EventSource(`/api/runs/${runId}/events`);

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.state === "DONE") {
            eventSource.close();
            // Fetch final complete run
            fetch(`/api/runs/${runId}`)
              .then((r) => r.json())
              .then((finalRun) => {
                setCurrentRun(finalRun);
                setIsLoading(false);
              });
          } else {
            // Update live progress
            fetch(`/api/runs/${runId}`)
              .then((r) => r.json())
              .then((liveRun) => setCurrentRun(liveRun));
          }
        } catch {
          // Non-JSON SSE ping
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsLoading(false);
      };
    } catch (err: any) {
      console.warn("API run failed, using local demo fallback:", err.message);
      setIsLoading(false);
      setCurrentRun(DEMO_AGENT_RUN);
    }
  };

  const handleCancelRun = async () => {
    if (!currentRun) return;
    try {
      await fetch(`/api/runs/${currentRun.id}/cancel`, { method: "POST" });
    } catch {
      // Ignored
    }
    setIsLoading(false);
  };

  const handleOpenEvidence = (nodeId: string) => {
    setHighlightedEvidenceId(nodeId);
    setIsEvidenceDrawerOpen(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header
        sourceMode={sourceMode}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenAblation={() => setIsAblationOpen(true)}
        isRunActive={isLoading}
      />

      <main className="container" style={{ flex: 1, paddingBottom: "48px", paddingTop: "20px" }}>
        {/* Top Banner Notice */}
        {sourceMode === "DEMO_FIXTURE" && (
          <div style={{
            backgroundColor: "var(--signal-caution-light)",
            border: "1px solid var(--signal-caution)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: "12px",
            color: "var(--ink)",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>
              <strong>DEMO FIXTURE MODE:</strong> Displaying high-fidelity synthetic benchmark scenario. To enable live Qloo taste graph queries, configure <code>QLOO_API_KEY</code> on the server.
            </span>
            <button
              onClick={() => setIsAboutOpen(true)}
              style={{ fontSize: "11px", fontWeight: 700, textDecoration: "underline", color: "var(--ink)" }}
            >
              Details
            </button>
          </div>
        )}

        {/* Step 1: Merchant Brief */}
        <BriefForm
          initialBrief={brief}
          onSubmit={handleStartRun}
          isLoading={isLoading}
        />

        {/* Step 2: Agent Workbench Trace */}
        <AgentWorkbench run={currentRun} onCancel={handleCancelRun} />

        {/* Step 3: Feasible Interventions Board */}
        {currentRun && currentRun.plans.length > 0 && (
          <InterventionBoard
            plans={currentRun.plans}
            evidence={currentRun.evidence}
            onSelectPlan={(plan) => setSelectedPlanForReceipt(plan)}
            onOpenEvidence={handleOpenEvidence}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <EvidenceDrawer
        isOpen={isEvidenceDrawerOpen}
        onClose={() => {
          setIsEvidenceDrawerOpen(false);
          setHighlightedEvidenceId(null);
        }}
        evidence={currentRun?.evidence || []}
        highlightedNodeId={highlightedEvidenceId}
      />

      <AblationModal
        isOpen={isAblationOpen}
        onClose={() => setIsAblationOpen(false)}
        qlooPlans={currentRun?.plans || []}
        ablatedPlans={currentRun?.ablationBaseline?.plans || []}
        evidenceCount={currentRun?.evidence.length || 0}
      />

      <ReceiptModal
        isOpen={Boolean(selectedPlanForReceipt)}
        onClose={() => setSelectedPlanForReceipt(null)}
        plan={selectedPlanForReceipt}
        brief={currentRun?.brief || brief}
        evidence={currentRun?.evidence || []}
        runId={currentRun?.id || "run-demo"}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--rule)",
        backgroundColor: "var(--canvas-elevated)",
        padding: "20px 0",
        marginTop: "auto",
        fontSize: "12px",
        color: "var(--ink-secondary)",
      }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <strong>LastRack</strong> — Qloo Agentic Hackathon Entry (October 2026). MIT Licensed.
          </div>
          <div>
            Planning hypothesis—not a sales forecast or endorsement by the named entities.
          </div>
        </div>
      </footer>
    </div>
  );
};
