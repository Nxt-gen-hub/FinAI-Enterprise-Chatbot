// ============================================================
// LOGGER - Audit logging utility
// ============================================================

import type { AuditEntry, Role } from "../types/types";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel = "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[CURRENT_LEVEL];
}

function fmt(level: LogLevel, module: string, message: string, data?: unknown): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] [${module}] ${message}${data ? " | " + JSON.stringify(data) : ""}`;
}

export const logger = {
  debug: (module: string, msg: string, data?: unknown) => {
    if (shouldLog("debug")) console.debug(fmt("debug", module, msg, data));
  },
  info: (module: string, msg: string, data?: unknown) => {
    if (shouldLog("info")) console.info(fmt("info", module, msg, data));
  },
  warn: (module: string, msg: string, data?: unknown) => {
    if (shouldLog("warn")) console.warn(fmt("warn", module, msg, data));
  },
  error: (module: string, msg: string, data?: unknown) => {
    if (shouldLog("error")) console.error(fmt("error", module, msg, data));
  },

  // ── Audit-specific logging ──────────────────────────────────
  audit: (entry: AuditEntry) => {
    const line = fmt("info", "AUDIT", `User=${entry.userId} Role=${entry.role} Query="${entry.query}" Type=${entry.queryType} Blocked=${entry.blocked}`, entry.blockReason ? { reason: entry.blockReason } : undefined);
    console.info(line);
    // In production: POST to /api/audit endpoint
    try {
      const existing = JSON.parse(localStorage.getItem("audit_log") || "[]");
      existing.push(entry);
      // Keep last 500 entries
      const trimmed = existing.slice(-500);
      localStorage.setItem("audit_log", JSON.stringify(trimmed));
    } catch {
      // Storage full or unavailable — silent fail
    }
  },

  logQuery: (userId: string, role: Role, query: string, queryType: string) => {
    logger.audit({
      timestamp: new Date().toISOString(),
      userId,
      role,
      query,
      queryType,
      blocked: false,
    });
  },

  logBlocked: (userId: string, role: Role, query: string, reason: string) => {
    logger.audit({
      timestamp: new Date().toISOString(),
      userId,
      role,
      query,
      queryType: "BLOCKED",
      blocked: true,
      blockReason: reason,
    });
  },
};
