// ============================================================
// MESSAGE - Single chat message renderer
// ============================================================

import React from "react";
import type { Message as MessageType } from "../types/types";
import { TransactionTable } from "./TransactionTable";
import { RiskCard } from "./RiskCard";

interface Props {
  message: MessageType;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export const Message: React.FC<Props> = ({ message }) => {
  const isUser     = message.role === "user";
  const isLoading  = message.response_type === "loading";
  const isError    = message.response_type === "error";
  const isBlocked  = message.response_type === "blocked";

  const bubbleStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
    background: isUser
      ? "linear-gradient(135deg, #3b82f6, #2563eb)"
      : isError || isBlocked
      ? "rgba(239,68,68,0.12)"
      : "rgba(30,41,59,0.9)",
    border: isError || isBlocked
      ? "1px solid rgba(239,68,68,0.3)"
      : isUser
      ? "none"
      : "1px solid rgba(148,163,184,0.12)",
    color: isError || isBlocked ? "#fca5a5" : "#e2e8f0",
    fontSize: "14px",
    lineHeight: 1.6,
  };

  const transactions = message.data?.transactions ?? null;
  const riskMetrics  = message.data?.metrics ?? null;
  const ragSources   = message.data?.sources ?? null;

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "16px",
      alignItems: "flex-end",
      gap: "8px",
    }}>

      {/* AI Avatar */}
      {!isUser && (
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #3b82f6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", color: "#fff", flexShrink: 0,
        }}>
          AI
        </div>
      )}

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        maxWidth: message.response_type === "table" ? "95%" : "80%",
        width: message.response_type === "table" ? "95%" : undefined,
      }}>

        {/* Loading dots */}
        {isLoading ? (
          <div style={bubbleStyle}>
            <LoadingDots />
          </div>
        ) : (
          <div style={bubbleStyle}>

            {/* Text content */}
            {message.content && (
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {renderMarkdown(message.content)}
              </p>
            )}

            {/* ✅ Transaction table */}
            {message.response_type === "table" && transactions && (
              <TransactionTable
                transactions={transactions}
                totalCount={message.data?.total ?? transactions.length}
              />
            )}

            {/* ✅ Risk cards */}
            {message.response_type === "risk" && riskMetrics && (
              <RiskCard metrics={riskMetrics} summary={message.content} />
            )}

            {/* ✅ RAG source badge */}
            {message.response_type === "rag" && (
              <div style={{
                marginTop: "10px", padding: "6px 10px",
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: "6px", color: "#a5b4fc", fontSize: "11px",
              }}>
                📄 Sources: {ragSources?.length ? ragSources.join(", ") : "Policy documents"}
              </div>
            )}

            {/* ✅ Blocked warning */}
            {isBlocked && (
              <div style={{ marginTop: "8px", color: "#fbbf24", fontSize: "12px" }}>
                🔒 This query was blocked by security guardrails.
              </div>
            )}
          </div>
        )}

        <span style={{ color: "#475569", fontSize: "11px", marginTop: "4px" }}>
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};

const LoadingDots: React.FC = () => (
  <div style={{ display: "flex", gap: "4px", alignItems: "center", height: "16px" }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: "#64748b",
        animation: `finai-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
      }} />
    ))}
    <style>{`
      @keyframes finai-pulse {
        0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1); }
      }
    `}</style>
  </div>
);
