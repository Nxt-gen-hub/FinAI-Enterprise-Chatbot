// ============================================================
// NAVBAR - Top navigation with role badge and logout
// ============================================================

import React from "react";
import { useAuth } from "../auth/AuthContext";
import { ROLE_METADATA } from "../config/rbac.config";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const roleMeta = ROLE_METADATA[user.role];

  return (
    <nav style={{
      height: "56px",
      background: "rgba(15,23,42,0.95)",
      borderBottom: "1px solid rgba(148,163,184,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "6px",
          background: "linear-gradient(135deg, #6366f1, #3b82f6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", fontWeight: 800, color: "white",
        }}>F</div>
        <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em" }}>
          FinAI <span style={{ color: "#64748b", fontWeight: 400 }}>Enterprise</span>
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Role badge */}
        <span style={{
          padding: "3px 10px",
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: roleMeta.color,
          background: roleMeta.bg,
          border: `1px solid ${roleMeta.border}`,
        }}>
          {roleMeta.label.toUpperCase()}
        </span>

        {/* Username */}
        <span style={{ color: "#94a3b8", fontSize: "13px" }}>{user.username}</span>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            padding: "5px 12px",
            background: "transparent",
            border: "1px solid rgba(148,163,184,0.2)",
            borderRadius: "6px",
            color: "#64748b",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};
