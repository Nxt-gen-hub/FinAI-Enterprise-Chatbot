import type { Role } from "../types/types";

export interface GuardrailRule {
  id: string;
  pattern: RegExp;
  blockedRoles: Role[];
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface GuardrailResult {
  blocked: boolean;
  reason: string;
  ruleId?: string;
  severity?: GuardrailRule["severity"];
}

export const GUARDRAIL_RULES: GuardrailRule[] = [
  {
    id: "GR-001",
    pattern: /\b(delete|drop|truncate|alter|remove all)\b/i,
    blockedRoles: ["VIEWER", "AUDITOR", "ANALYST"],
    reason: "Destructive operations are restricted to administrators.",
    severity: "high",
  },
  {
    id: "GR-002",
    pattern: /\b(pii|ssn|social security|passport number)\b/i,
    blockedRoles: ["VIEWER"],
    reason: "PII access requires Analyst-level clearance or above.",
    severity: "high",
  },
  {
    id: "GR-003",
    pattern: /\b(wire transfer|initiate transfer|execute trade)\b/i,
    blockedRoles: ["VIEWER", "AUDITOR"],
    reason: "Transaction execution not permitted.",
    severity: "high",
  },
  {
    id: "GR-005",
    pattern: /ignore (previous|all|prior) instructions|jailbreak/i,
    blockedRoles: ["VIEWER", "AUDITOR", "ANALYST", "ADMIN"],
    reason: "Prompt injection attempt detected.",
    severity: "high",
  },
];

export function evaluateGuardrails(query: string, role: Role): GuardrailResult {
  for (const rule of GUARDRAIL_RULES) {
    if (rule.blockedRoles.includes(role) && rule.pattern.test(query)) {
      return {
        blocked: true,
        reason: rule.reason,
        ruleId: rule.id,
        severity: rule.severity,
      };
    }
  }

  return { blocked: false, reason: "" };
}