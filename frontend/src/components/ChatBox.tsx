import React, { useState, useRef, useEffect } from "react";
import { sendChat, getChatSession } from "../services/api";
import { Message } from "./Message";
import { Message as MessageType, ChatSessionOut, ChatMessageOut } from "../types/types";
import { useAuth } from "../auth/AuthContext";
import { GUARDRAIL_RULES } from "../config/guardrails.config";
import { PERMISSIONS } from "../config/rbac.config";
import { logger } from "../utils/logger";

interface Props {
  activeSession: ChatSessionOut | null;
  onSessionCreated: (sessionId: number) => void;
}

// ── Guardrail check using existing GUARDRAIL_RULES export ─────────────────────
function checkGuardrails(text: string, role: string): { blocked: boolean; rule: string; reason: string } {
  const t = text.toLowerCase();
  for (const rule of GUARDRAIL_RULES) {
    // blockedRoles = roles that are NOT allowed; if role is in blockedRoles → block
    const blockedRoles: string[] = (rule as any).blockedRoles || (rule as any).roles || [];
    const isBlocked = blockedRoles.length === 0 || blockedRoles.includes(role);
    if (isBlocked) {
      const pattern = new RegExp(rule.pattern, "i");
      if (pattern.test(t)) {
        const reason = (rule as any).message || (rule as any).description || "Action not permitted.";
        return { blocked: true, rule: rule.id, reason };
      }
    }
  }
  return { blocked: false, rule: "", reason: "" };
}

// ── RBAC check using existing PERMISSIONS export ──────────────────────────────
function checkRBACAccess(action: string, role: string): { allowed: boolean; reason: string } {
  const perms = PERMISSIONS[role as keyof typeof PERMISSIONS];
  if (!perms) return { allowed: false, reason: "Unknown role." };
  if (!perms.includes(action as any)) return { allowed: false, reason: `Your role (${role}) cannot perform: ${action}` };
  return { allowed: true, reason: "" };
}

const ChatBox: React.FC<Props> = ({ activeSession, onSessionCreated }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
      setSessionId(null);
      return;
    }
    if (activeSession.id === sessionId) return;

    const loadSession = async () => {
      try {
        const res = await getChatSession(activeSession.id);
        const detail = res.data;
        const loaded: MessageType[] = detail.messages.map((m: ChatMessageOut) => ({
          id: String(m.id),
          role: m.role,
          content: m.content,
          response_type: m.response_type as any,
          timestamp: new Date(m.timestamp),
          data: undefined,
        }));
        setMessages(loaded);
        setSessionId(activeSession.id);
      } catch {
        setMessages([]);
        setSessionId(activeSession.id);
      }
    };
    loadSession();
  }, [activeSession]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");

    const role = user?.role || "";

    // RBAC check
    const rbacResult = checkRBACAccess("chat", role);
    const userMsg: MessageType = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      response_type: "text",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (!rbacResult.allowed) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "b",
        role: "assistant",
        content: `🚫 Access denied: ${rbacResult.reason}`,
        response_type: "blocked",
        timestamp: new Date(),
      }]);
      return;
    }

    // Guardrail check
    const guardrailResult = checkGuardrails(text, role);
    if (guardrailResult.blocked) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "b",
        role: "assistant",
        content: `🚫 **Blocked [${guardrailResult.rule}]**: ${guardrailResult.reason}`,
        response_type: "blocked",
        timestamp: new Date(),
      }]);
      logger.info("ChatBox", `BLOCKED:${guardrailResult.rule} - ${text}`);
      return;
    }

    // Loading indicator
    const loadingId = Date.now().toString() + "l";
    setMessages((prev) => [...prev, {
      id: loadingId, role: "assistant", content: "", response_type: "loading", timestamp: new Date(),
    }]);
    setLoading(true);

    try {
      const res = await sendChat(text, sessionId ?? undefined);
      const { response_type, message, data, session_id } = res.data;

      if (session_id && session_id !== sessionId) {
        setSessionId(session_id);
        onSessionCreated(session_id);
      }

      const assistantMsg: MessageType = {
        id: Date.now().toString() + "a",
        role: "assistant",
        content: message || "",
        response_type,
        timestamp: new Date(),
        data,
      };
      setMessages((prev) => prev.filter((m) => m.id !== loadingId).concat(assistantMsg));
      logger.info("ChatBox", `chat: ${text}`);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId).concat({
        id: Date.now().toString() + "e",
        role: "assistant",
        content: "⚠️ Something went wrong. Please try again.",
        response_type: "text",
        timestamp: new Date(),
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isNewChat = messages.length === 0;

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {isNewChat && (
          <div style={styles.welcomeContainer}>
            <div style={styles.welcomeIcon}>💹</div>
            <h2 style={styles.welcomeTitle}>FinAI Enterprise</h2>
            <p style={styles.welcomeSubtitle}>
              Ask me about transactions, risk exposure, or compliance policies.
            </p>
            <div style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} style={styles.suggestionBtn} onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => <Message key={msg.id} message={msg} />)}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <div style={styles.inputRow}>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about transactions, risk, or policy..."
            rows={1}
            disabled={loading}
          />
          <button
            style={{ ...styles.sendBtn, opacity: input.trim() && !loading ? 1 : 0.4 }}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p style={styles.hint}>Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};

const SUGGESTIONS = [
  "Show transactions above $50,000",
  "List all critical transactions",
  "Summarize risk exposure this quarter",
  "What does our AML policy say?",
];

const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column", height: "100vh", background: "#0d1117", flex: 1 },
  messages: { flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" },
  welcomeContainer: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px 40px", gap: "10px" },
  welcomeIcon: { fontSize: "40px", marginBottom: "4px" },
  welcomeTitle: { color: "#e2e8f0", fontSize: "22px", fontWeight: 700, margin: 0, fontFamily: "'Inter', sans-serif" },
  welcomeSubtitle: { color: "#64748b", fontSize: "14px", margin: 0, textAlign: "center", maxWidth: "380px", lineHeight: "1.5" },
  suggestions: { display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "12px", maxWidth: "560px" },
  suggestionBtn: { padding: "8px 14px", background: "#1a2236", border: "1px solid #2d3a52", borderRadius: "20px", color: "#94a3b8", fontSize: "12.5px", cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  inputArea: { padding: "12px 20px 16px", borderTop: "1px solid #1e2130", background: "#0d1117" },
  inputRow: { display: "flex", gap: "10px", alignItems: "flex-end", background: "#1a2236", border: "1px solid #2d3a52", borderRadius: "12px", padding: "10px 12px" },
  textarea: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "14px", resize: "none", fontFamily: "'Inter', sans-serif", lineHeight: "1.5", maxHeight: "120px", overflowY: "auto" },
  sendBtn: { background: "#3b82f6", border: "none", borderRadius: "8px", color: "white", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  hint: { color: "#2d3a52", fontSize: "11px", margin: "6px 0 0", textAlign: "center", fontFamily: "'Inter', sans-serif" },
};

export default ChatBox;
