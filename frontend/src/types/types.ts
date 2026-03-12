// ============================================================
// TYPES - Shared TypeScript types for FinAI Enterprise
// ============================================================

// ── Auth ──────────────────────────────────────────────────────
export type Role = "ADMIN" | "ANALYST" | "AUDITOR" | "VIEWER";

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// ── RBAC Actions (used in rbac.config.ts) ────────────────────
export type Action =
  | "view"
  | "chat"
  | "export"
  | "manage_users"
  | "view_risk"
  | "view_transactions";

// ── Audit Entry (used in logger.ts) ──────────────────────────
export interface AuditEntry {
  timestamp: string;
  userId: string;
  role: Role;
  query: string;
  queryType: string;
  blocked: boolean;
  blockReason?: string;
}

// ── Response types — must include ALL values used in ChatBox + Message ────────
export type ResponseType =
  | "text"
  | "table"
  | "risk"
  | "rag"
  | "blocked"
  | "loading"
  | "error";

// ── Message (used in ChatBox state and Message component) ─────────────────────
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response_type: ResponseType;
  timestamp: Date;
  data?: any; // holds transactions[], metrics[], sources[] etc.
}

// ── Transaction row (from backend /chat response data.transactions) ───────────
export interface TransactionRow {
  id: string;
  amount: number;
  risk_level: string;
  description: string;
  created_at?: string;
}

// ── Risk metric (from backend /chat response data.metrics) ───────────────────
export interface RiskMetric {
  label: string;
  value: string;
  trend: string;    // "up" | "down" | "stable"
  severity: string; // "critical" | "high" | "medium" | "low"
}

// ── Chat session (from /chat/sessions) ───────────────────────────────────────
export interface ChatSessionOut {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ChatMessageOut {
  id: number;
  role: string;
  content: string;
  response_type: string;
  timestamp: string;
}

export interface ChatSessionDetail {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessageOut[];
}
