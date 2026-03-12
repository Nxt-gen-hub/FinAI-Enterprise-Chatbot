import React, { useEffect, useState, useCallback } from "react";
import { getChatSessions, deleteChatSession } from "../services/api";
import { ChatSessionOut } from "../types/types";

interface Props {
  activeSessionId: number | null;
  onSelectSession: (session: ChatSessionOut) => void;
  onNewChat: () => void;
  refreshTrigger: number; // increment from parent to force re-fetch
}

const ChatHistorySidebar: React.FC<Props> = ({
  activeSessionId,
  onSelectSession,
  onNewChat,
  refreshTrigger,
}) => {
  const [sessions, setSessions] = useState<ChatSessionOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getChatSessions();
      setSessions(res.data);
    } catch {
      // silently fail — user might not have sessions yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) onNewChat();
    } catch {
      // noop
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  // Group sessions by Today / Yesterday / This Week / Older
  const grouped = sessions.reduce(
    (acc: Record<string, ChatSessionOut[]>, s) => {
      const d = new Date(s.updated_at);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const days = Math.floor(diff / 86400000);

      let group = "Older";
      if (days === 0) group = "Today";
      else if (days === 1) group = "Yesterday";
      else if (days < 7) group = "This Week";

      if (!acc[group]) acc[group] = [];
      acc[group].push(s);
      return acc;
    },
    {}
  );

  const groupOrder = ["Today", "Yesterday", "This Week", "Older"];

  return (
    <aside style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.logo}>💹</span>
          <span style={styles.logoText}>FinAI</span>
        </div>
        <button style={styles.newChatBtn} onClick={onNewChat} title="New conversation">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Sessions list */}
      <div style={styles.listContainer}>
        {loading && sessions.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.loadingDots}>
              <span /><span /><span />
            </div>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>💬</span>
            <p style={styles.emptyText}>No conversations yet</p>
            <p style={styles.emptySubtext}>Start a new chat to begin</p>
          </div>
        )}

        {groupOrder.map((group) => {
          const items = grouped[group];
          if (!items || items.length === 0) return null;
          return (
            <div key={group}>
              <div style={styles.groupLabel}>{group}</div>
              {items.map((session) => (
                <div
                  key={session.id}
                  style={{
                    ...styles.sessionItem,
                    ...(activeSessionId === session.id ? styles.sessionItemActive : {}),
                  }}
                  onClick={() => onSelectSession(session)}
                >
                  <div style={styles.sessionIcon}>
                    {getSessionIcon(session.title)}
                  </div>
                  <div style={styles.sessionContent}>
                    <div style={styles.sessionTitle}>{session.title}</div>
                    <div style={styles.sessionMeta}>
                      <span>{session.message_count} messages</span>
                      <span style={styles.dot}>·</span>
                      <span>{formatDate(session.updated_at)}</span>
                    </div>
                  </div>
                  <button
                    style={{
                      ...styles.deleteBtn,
                      opacity: deletingId === session.id ? 0.5 : 0,
                    }}
                    className="delete-btn"
                    onClick={(e) => handleDelete(e, session.id)}
                    title="Delete conversation"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <style>{`
        .delete-btn { transition: opacity 0.15s ease; }
        div[style*="cursor: pointer"]:hover .delete-btn,
        .session-item:hover .delete-btn { opacity: 1 !important; }
      `}</style>
    </aside>
  );
};

function getSessionIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("transaction") || t.includes("show") || t.includes("list")) return "📊";
  if (t.includes("risk") || t.includes("flag") || t.includes("exposure")) return "⚠️";
  if (t.includes("policy") || t.includes("aml") || t.includes("kyc")) return "📋";
  if (t.includes("hi") || t.includes("hello") || t.includes("hey")) return "👋";
  return "💬";
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "260px",
    minWidth: "260px",
    height: "100vh",
    background: "#0f1117",
    borderRight: "1px solid #1e2130",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Inter', sans-serif",
    overflowY: "hidden",
  },
  header: {
    padding: "16px 14px 12px",
    borderBottom: "1px solid #1e2130",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  logo: {
    fontSize: "20px",
  },
  logoText: {
    color: "#e2e8f0",
    fontWeight: 700,
    fontSize: "16px",
    letterSpacing: "0.5px",
  },
  newChatBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    background: "#1a2236",
    border: "1px solid #2d3a52",
    borderRadius: "8px",
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
    width: "100%",
  },
  listContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 8px",
  },
  groupLabel: {
    padding: "8px 8px 4px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#4a5568",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  sessionItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "9px 10px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "2px",
    transition: "background 0.12s ease",
    position: "relative",
  },
  sessionItemActive: {
    background: "#1a2236",
    border: "1px solid #2d3a52",
  },
  sessionIcon: {
    fontSize: "16px",
    marginTop: "1px",
    flexShrink: 0,
  },
  sessionContent: {
    flex: 1,
    minWidth: 0,
  },
  sessionTitle: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: "1.3",
  },
  sessionMeta: {
    color: "#4a5568",
    fontSize: "11px",
    marginTop: "3px",
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  dot: {
    color: "#2d3a52",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
    padding: "2px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    marginTop: "2px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    gap: "6px",
  },
  emptyIcon: {
    fontSize: "28px",
    marginBottom: "4px",
  },
  emptyText: {
    color: "#4a5568",
    fontSize: "13px",
    fontWeight: 500,
    margin: 0,
  },
  emptySubtext: {
    color: "#2d3a52",
    fontSize: "12px",
    margin: 0,
  },
  loadingDots: {
    display: "flex",
    gap: "6px",
  },
};

export default ChatHistorySidebar;
