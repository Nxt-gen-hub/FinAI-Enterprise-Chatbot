// ============================================================
// APP.TSX - Root component
// FIX: Was importing './pages/FinAI_Production' (did not exist)
//      Now correctly imports './pages/Dashboard'
// ============================================================

import React from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Dashboard from "./pages/Dashboard";

function AppContent() {
  const { user, login, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0f172a", color: "#64748b", fontFamily: "system-ui",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "32px", height: "32px", border: "3px solid #1e293b",
            borderTop: "3px solid #3b82f6", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
          }} />
          Initializing...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        height: "100vh", display: "flex", justifyContent: "center", alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}>
        <div style={{
          textAlign: "center", color: "white", padding: "48px 56px",
          background: "rgba(15,23,42,0.8)", borderRadius: "16px",
          border: "1px solid rgba(148,163,184,0.12)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}>
          {/* Logo */}
          <div style={{
            width: "56px", height: "56px", borderRadius: "14px",
            background: "linear-gradient(135deg, #6366f1, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "24px", fontWeight: 800, margin: "0 auto 20px",
          }}>F</div>

          <h1 style={{ marginBottom: "6px", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.03em" }}>
            FinAI Enterprise
          </h1>
          <p style={{ color: "#64748b", marginBottom: "32px", fontSize: "14px" }}>
            Financial Intelligence Platform
          </p>

          {/* Demo login buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Login as Admin", username: "admin", role: "Full Access" },
              { label: "Login as Analyst", username: "analyst", role: "Analysis Access" },
              { label: "Login as Auditor", username: "auditor", role: "Read-Only Access" },
            ].map((btn) => (
              <button
                key={btn.username}
                onClick={() => login(btn.username, "password")}
                style={{
                  padding: "12px 24px", background: btn.username === "admin" ? "#3b82f6" : "rgba(59,130,246,0.1)",
                  color: "white", border: btn.username === "admin" ? "none" : "1px solid rgba(59,130,246,0.3)",
                  borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 500,
                }}
              >
                {btn.label}
                <span style={{ color: btn.username === "admin" ? "rgba(255,255,255,0.6)" : "#64748b", fontSize: "12px", marginLeft: "8px" }}>
                  ({btn.role})
                </span>
              </button>
            ))}
          </div>

          <p style={{ color: "#334155", fontSize: "11px", marginTop: "24px" }}>
            Demo mode — use any password
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
