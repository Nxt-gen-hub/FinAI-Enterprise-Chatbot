// ============================================================
// TRANSACTION TABLE - Renders SQL query results as a styled table
// Uses only fields that exist in DB: id, amount, risk_level, description
// ============================================================

import React from "react";

// ✅ FIX: Only include fields that actually exist in the database
interface TransactionRow {
  id: string;
  amount: number;
  risk_level: string;
  description: string;
  created_at?: string;
}

interface Props {
  transactions: TransactionRow[];
  totalCount?: number;
}

const RISK_STYLES: Record<string, { color: string; bg: string }> = {
  LOW:      { color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  MEDIUM:   { color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  HIGH:     { color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export const TransactionTable: React.FC<Props> = ({ transactions, totalCount }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div style={{ color: "#94a3b8", padding: "16px", textAlign: "center" }}>
        No transactions found.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", marginTop: "12px" }}>
      {totalCount !== undefined && (
        <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px", margin: "0 0 8px 0" }}>
          Showing {transactions.length} of {totalCount} transactions
        </p>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(148,163,184,0.2)" }}>
            {["ID", "Description", "Amount", "Risk", "Date"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  color: "#64748b",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => {
            const risk = RISK_STYLES[tx.risk_level?.toUpperCase()] ?? RISK_STYLES.LOW;
            return (
              <tr
                key={tx.id || i}
                style={{
                  borderBottom: "1px solid rgba(148,163,184,0.08)",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                }}
              >
                <td style={{ padding: "8px 12px", color: "#64748b", fontSize: "11px", whiteSpace: "nowrap" }}>
                  {tx.id}
                </td>
                <td style={{
                  padding: "8px 12px",
                  color: "#e2e8f0",
                  maxWidth: "260px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {tx.description}
                </td>
                <td style={{
                  padding: "8px 12px",
                  color: tx.amount > 50000 ? "#f87171" : "#e2e8f0",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>
                  {formatAmount(tx.amount)}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    color: risk.color,
                    background: risk.bg,
                  }}>
                    {tx.risk_level}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", color: "#94a3b8", whiteSpace: "nowrap", fontSize: "12px" }}>
                  {formatDate(tx.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
