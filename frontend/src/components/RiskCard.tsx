// ============================================================
// RISK CARD - Renders risk metrics as styled cards
// Props: metrics (array) + summary (string)
// ============================================================

import React from "react";

interface RiskMetric {
  label: string;
  value: string;
  trend: string;    // "up" | "down" | "stable"
  severity: string; // "critical" | "high" | "medium" | "low"
}

interface Props {
  metrics: RiskMetric[];
  summary?: string;
}

const SEVERITY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)" },
  high:     { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" },
  medium:   { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)" },
  low:      { color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)" },
};

const TREND_ICON: Record<string, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

export const RiskCard: React.FC<Props> = ({ metrics, summary }) => {
  if (!metrics || metrics.length === 0) {
    return <div style={{ color: "#94a3b8", padding: "12px" }}>No risk data available.</div>;
  }

  return (
    <div style={{ marginTop: "12px" }}>
      {/* Risk metric cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "10px",
        marginBottom: summary ? "12px" : "0",
      }}>
        {metrics.map((metric, i) => {
          const style = SEVERITY_STYLES[metric.severity?.toLowerCase()] ?? SEVERITY_STYLES.low;
          const trendIcon = TREND_ICON[metric.trend?.toLowerCase()] ?? "→";
          const trendColor = metric.trend === "up" ? "#f87171" : metric.trend === "down" ? "#34d399" : "#94a3b8";

          return (
            <div
              key={i}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: style.bg,
                border: `1px solid ${style.border}`,
              }}
            >
              <div style={{
                fontSize: "11px",
                color: "#94a3b8",
                marginBottom: "6px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                {metric.label}
              </div>
              <div style={{
                fontSize: "22px",
                fontWeight: 700,
                color: style.color,
                marginBottom: "4px",
                fontFamily: "'Inter', sans-serif",
              }}>
                {metric.value}
              </div>
              <div style={{ fontSize: "12px", color: trendColor, fontWeight: 600 }}>
                {trendIcon} {metric.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary text */}
      {summary && (
        <div style={{
          padding: "10px 14px",
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "8px",
          color: "#a5b4fc",
          fontSize: "13px",
          lineHeight: 1.5,
        }}>
          📊 {summary}
        </div>
      )}
    </div>
  );
};
