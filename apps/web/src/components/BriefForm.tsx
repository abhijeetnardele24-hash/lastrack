import React, { useState } from "react";
import { InventoryBrief } from "@lastrack/contracts";
import { SYNTHETIC_JUDGE_BRIEF } from "@lastrack/fixtures";
import { Tag, Play, RotateCcw, AlertCircle, Plus, X } from "lucide-react";

interface BriefFormProps {
  initialBrief: InventoryBrief;
  onSubmit: (brief: InventoryBrief) => void;
  isLoading: boolean;
}

export const BriefForm: React.FC<BriefFormProps> = ({
  initialBrief,
  onSubmit,
  isLoading,
}) => {
  const [brief, setBrief] = useState<InventoryBrief>(initialBrief);
  const [newAnchorName, setNewAnchorName] = useState("");

  const handleLoadDemo = () => {
    setBrief({ ...SYNTHETIC_JUDGE_BRIEF });
  };

  const handleAddAnchor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnchorName.trim()) return;
    setBrief({
      ...brief,
      anchorNames: [...brief.anchorNames, { name: newAnchorName.trim() }],
    });
    setNewAnchorName("");
  };

  const handleRemoveAnchor = (index: number) => {
    setBrief({
      ...brief,
      anchorNames: brief.anchorNames.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(brief);
  };

  return (
    <div style={{
      backgroundColor: "var(--canvas-elevated)",
      border: "1px solid var(--rule)",
      borderRadius: "var(--radius-md)",
      padding: "20px",
      boxShadow: "var(--shadow-subtle)",
    }}>
      {/* Header with 1-Click Judge Demo CTA */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--rule-light)",
        paddingBottom: "12px",
        marginBottom: "16px",
        flexWrap: "wrap",
        gap: "8px",
      }}>
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            1. Merchant Inventory Brief
          </h2>
          <p style={{ fontSize: "12px", color: "var(--ink-secondary)", margin: "2px 0 0 0" }}>
            Define slow-stock pressure, financial ceiling, and known customer taste anchors.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadDemo}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "var(--canvas-surface)",
            border: "1px solid var(--rule)",
            color: "var(--ink)",
            fontSize: "12px",
            fontWeight: 700,
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            transition: "all 0.15s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
        >
          <RotateCcw size={13} />
          Load Judge Demo (Synthetic 42-Unit Overshirt)
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Row 1: Item & Category */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label htmlFor="itemName" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "4px" }}>
              ITEM NAME
            </label>
            <input
              id="itemName"
              type="text"
              value={brief.itemName}
              onChange={(e) => setBrief({ ...brief, itemName: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
                color: "var(--ink)",
              }}
            />
          </div>

          <div>
            <label htmlFor="category" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "4px" }}>
              CATEGORY
            </label>
            <input
              id="category"
              type="text"
              value={brief.category}
              onChange={(e) => setBrief({ ...brief, category: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
                color: "var(--ink)",
              }}
            />
          </div>

          <div>
            <label htmlFor="city" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "4px" }}>
              CITY / LOCATION
            </label>
            <input
              id="city"
              type="text"
              value={brief.city}
              onChange={(e) => setBrief({ ...brief, city: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>

        {/* Row 2: Inventory Pressure & Budget Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label htmlFor="unitsOnHand" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "4px" }}>
              UNITS ON HAND
            </label>
            <input
              id="unitsOnHand"
              type="number"
              min="1"
              value={brief.unitsOnHand}
              onChange={(e) => setBrief({ ...brief, unitsOnHand: Number(e.target.value) })}
              className="tabular-nums"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
                color: "var(--ink)",
              }}
            />
          </div>

          <div>
            <label htmlFor="daysSlow" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "4px" }}>
              DAYS SLOW
            </label>
            <input
              id="daysSlow"
              type="number"
              min="1"
              value={brief.daysSlow}
              onChange={(e) => setBrief({ ...brief, daysSlow: Number(e.target.value) })}
              className="tabular-nums"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
                color: "var(--ink)",
              }}
            />
          </div>

          <div>
            <label htmlFor="budgetCap" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "4px" }}>
              BUDGET CAP ($)
            </label>
            <input
              id="budgetCap"
              type="number"
              min="50"
              step="50"
              value={brief.budgetCap}
              onChange={(e) => setBrief({ ...brief, budgetCap: Number(e.target.value) })}
              className="tabular-nums"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
                color: "var(--ink)",
              }}
            />
          </div>

          <div>
            <label htmlFor="maxMarkdownPercent" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "4px" }}>
              MAX MARKDOWN (%)
            </label>
            <input
              id="maxMarkdownPercent"
              type="number"
              min="0"
              max="50"
              value={brief.maxMarkdownPercent}
              onChange={(e) => setBrief({ ...brief, maxMarkdownPercent: Number(e.target.value) })}
              className="tabular-nums"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>

        {/* Row 3: Known Customer Cultural Anchors */}
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="newAnchorInput" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "6px" }}>
            KNOWN CUSTOMER CULTURAL ANCHORS (QLOO SEEDS)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {brief.anchorNames.map((anchor, idx) => (
              <span
                key={idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  backgroundColor: "var(--canvas-surface)",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                <Tag size={12} color="var(--signal-evidence)" />
                {anchor.name}
                <button
                  type="button"
                  onClick={() => handleRemoveAnchor(idx)}
                  style={{ color: "var(--ink-muted)", display: "flex", alignItems: "center" }}
                  title="Remove anchor"
                  aria-label={`Remove anchor ${anchor.name}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              id="newAnchorInput"
              type="text"
              aria-label="Add cultural anchor"
              placeholder="Add another brand, artist, or film anchor..."
              value={newAnchorName}
              onChange={(e) => setNewAnchorName(e.target.value)}
              style={{
                flex: 1,
                padding: "6px 10px",
                fontSize: "13px",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas)",
              }}
            />
            <button
              type="button"
              onClick={handleAddAnchor}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--canvas-surface)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Submit CTA */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
          <div style={{ fontSize: "11px", color: "var(--ink-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
            <AlertCircle size={13} color="var(--signal-caution)" />
            Hypotheses produced will adhere to $600 budget & 0% paid influencer rules.
          </div>

          <button
            type="submit"
            disabled={isLoading || brief.anchorNames.length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 700,
              backgroundColor: "var(--ink)",
              color: "var(--canvas)",
              borderRadius: "var(--radius-sm)",
              opacity: isLoading ? 0.6 : 1,
              transition: "background 0.15s ease",
            }}
          >
            <Play size={14} fill="currentColor" />
            {isLoading ? "Running Agent..." : "Start Bounded Agent Run"}
          </button>
        </div>
      </form>
    </div>
  );
};
