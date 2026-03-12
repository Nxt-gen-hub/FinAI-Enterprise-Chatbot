import type { Action, Role } from "../types/types";

type PermissionMatrix = Record<Role, Action[]>;

export const PERMISSIONS: PermissionMatrix = {
  ADMIN: ["view", "chat", "export", "manage_users", "view_risk", "view_transactions"],
  ANALYST: ["view", "chat", "export", "view_risk", "view_transactions"],
  AUDITOR: ["view", "view_risk", "view_transactions"],
  VIEWER: ["view"],
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role]?.includes(action) ?? false;
}

export const ROLE_METADATA: Record<
  Role,
  { color: string; bg: string; border: string; label: string }
> = {
  ADMIN: {
    color: "#818cf8",
    bg: "rgba(99,102,241,0.15)",
    border: "rgba(99,102,241,0.35)",
    label: "Administrator",
  },

  ANALYST: {
    color: "#34d399",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.35)",
    label: "Analyst",
  },

  AUDITOR: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.35)",
    label: "Auditor",
  },

  VIEWER: {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.3)",
    label: "Viewer",
  },
};