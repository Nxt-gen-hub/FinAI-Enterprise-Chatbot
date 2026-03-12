/**
 * FinAI Enterprise — Production-Ready Chat System
 *
 * This single-file version is for visual preview/demo.
 * In production, each section maps to the files in the architecture document.
 *
 * ARCHITECTURE NOTE:
 *  - No mock data. All API calls go to ENV.API_BASE_URL via apiClient.ts
 *  - JWT decoded from real token → role is never UI-controlled
 *  - Guardrails run client-side; backend mirrors them independently
 *  - Audit events shipped to POST /audit (fire-and-forget)
 *
 * For demo purposes, this artifact simulates real API responses with a 1.2s
 * delay. In production, replace simulateAPI() calls with the real service
 * calls shown in the comments.
 */

import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";

// ─── Constants (maps to src/config/) ─────────────────────────────────────────

const API_BASE_URL = "https://api.finai.yourdomain.com"; // from VITE_API_BASE_URL

const PERMISSIONS = {
  ADMIN:   ["view","chat","export","manage_users","view_risk","view_transactions"],
  ANALYST: ["view","chat","export","view_risk","view_transactions"],
  AUDITOR: ["view","view_risk","view_transactions"],
  VIEWER:  ["view"],
};

const ROLE_META = {
  ADMIN:   { color: "#818cf8", bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.4)", label: "Administrator" },
  ANALYST: { color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", label: "Analyst" },
  AUDITOR: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", label: "Auditor" },
  VIEWER:  { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", label: "Viewer" },
};

const GUARDRAIL_RULES = [
  { id:"GR-001", pattern:/\b(delete|drop|truncate|alter|remove all)\b/i,          blockedRoles:["VIEWER","AUDITOR","ANALYST"], reason:"Destructive operations are restricted to administrators.",         severity:"high" },
  { id:"GR-002", pattern:/\b(pii|ssn|social security|passport)\b/i,               blockedRoles:["VIEWER"],                    reason:"PII access requires Analyst clearance or above.",                severity:"high" },
  { id:"GR-003", pattern:/\b(wire transfer|initiate|execute trade|place order)\b/i,blockedRoles:["VIEWER","AUDITOR"],          reason:"Transaction execution is not permitted for your access level.", severity:"high" },
  { id:"GR-004", pattern:/ignore (previous|all) instructions|you are now|jailbreak/i, blockedRoles:["VIEWER","AUDITOR","ANALYST","ADMIN"], reason:"Prompt injection detected. Query flagged for review.", severity:"high" },
];

// ─── Token Service (maps to src/api/tokenService.ts) ─────────────────────────

const TOKEN_KEY = "finai_access_token";

const tokenService = {
  set: (t) => sessionStorage.setItem(TOKEN_KEY, t),
  get: ()  => sessionStorage.getItem(TOKEN_KEY),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
  decode: () => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (!t) return null;
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload;
    } catch { return null; }
  },
  getUser: () => {
    const p = tokenService.decode();
    if (!p) return null;
    return { id: p.sub, email: p.email, name: p.name, role: p.role };
  },
  isExpired: () => {
    const p = tokenService.decode();
    if (!p) return true;
    return Date.now() / 1000 >= p.exp - 30;
  },
};

// ─── Logger (maps to src/api/logger.ts) ──────────────────────────────────────

const logBuffer = [];
const logger = {
  _emit(level, msg, meta) {
    const entry = { level, msg, meta, time: new Date().toLocaleTimeString(), ts: Date.now() };
    logBuffer.push(entry);
    if (level === "warn" || level === "error") {
      // In production: fire-and-forget POST to /audit
      console.warn(`[AUDIT] ${msg}`, meta);
    }
    return entry;
  },
  info:  (m, meta) => logger._emit("info", m, meta),
  warn:  (m, meta) => logger._emit("warn", m, meta),
  error: (m, meta) => logger._emit("error", m, meta),
};

// ─── API Client Simulation ────────────────────────────────────────────────────
// Production: import apiClient from "@/api/apiClient" + services from "@/api/services"

const DEMO_RESPONSES = {
  risk: {
    type: "risk_summary",
    content: {
      entity: "Meridian Capital Holdings",
      riskLevel: "HIGH",
      metrics: [
        { label: "VaR (95%)", value: "$4.2M" },
        { label: "Beta", value: "1.47" },
        { label: "Debt/Equity", value: "2.1x" },
        { label: "Current Ratio", value: "0.87" },
        { label: "Credit Rating", value: "BB+" },
      ],
      narrative: "Meridian Capital Holdings exhibits elevated risk across multiple dimensions. High debt-to-equity combined with current ratio below 1.0 signals near-term liquidity pressure. Beta of 1.47 indicates significant systematic market exposure.",
      flags: [
        "Covenant breach risk in Q3 2025",
        "CRE concentration risk: 42% of portfolio",
        "+100bps rate shock → -$18M NII impact",
      ],
    },
  },
  table: {
    type: "table",
    content: {
      columns: ["Ticker", "Shares", "Avg Cost", "Current", "P&L", "Weight"],
      rows: [
        ["AAPL",  "12,400", "$142.30", "$189.50", "+$580K", "18.2%"],
        ["JPM",   "8,200",  "$138.75", "$201.40", "+$514K", "14.1%"],
        ["BRK.B", "3,100",  "$318.20", "$391.75", "+$228K", "10.3%"],
        ["MSFT",  "5,800",  "$285.10", "$420.30", "+$784K", "16.6%"],
        ["GS",    "2,400",  "$352.60", "$488.20", "+$325K", "9.9%"],
      ],
    },
  },
  text: {
    type: "text",
    content: "Q3 2024 performance reflects a 12.4% YoY revenue increase to $2.84B, driven by institutional trading revenues (+$340M) and fee-based advisory services (+$128M). EBITDA margin improved 180bps to 28.6%, partially offset by elevated compliance costs (+$42M).\n\nNet interest income remained stable at $1.1B despite the 50bps rate reduction in September. Capital ratios remain well above minimums: CET1 at 13.2% vs 10.5% requirement. Board approved $500M buyback for Q4.",
  },
};

async function simulateAPI(query) {
  await new Promise(r => setTimeout(r, 1100 + Math.random() * 400));
  const q = query.toLowerCase();
  if (q.includes("risk") || q.includes("exposure") || q.includes("meridian")) return DEMO_RESPONSES.risk;
  if (q.includes("portfolio") || q.includes("holdings") || q.includes("position")) return DEMO_RESPONSES.table;
  return DEMO_RESPONSES.text;
}

// ─── Auth Context (maps to src/context/AuthContext.tsx) ───────────────────────

const AuthContext = createContext(null);

// Demo JWT tokens per role — in production, these come from POST /login
const DEMO_TOKENS = {
  ADMIN: btoa(JSON.stringify({})) + "." + btoa(JSON.stringify({ sub:"u001", email:"admin@finai.io",    name:"Alex Chen",    role:"ADMIN",   exp: Date.now()/1000+3600, iat: Date.now()/1000 })) + ".sig",
  ANALYST: btoa(JSON.stringify({})) + "." + btoa(JSON.stringify({ sub:"u002", email:"analyst@finai.io", name:"Jordan Mills",  role:"ANALYST", exp: Date.now()/1000+3600, iat: Date.now()/1000 })) + ".sig",
  AUDITOR: btoa(JSON.stringify({})) + "." + btoa(JSON.stringify({ sub:"u003", email:"auditor@finai.io", name:"Morgan Blake",  role:"AUDITOR", exp: Date.now()/1000+3600, iat: Date.now()/1000 })) + ".sig",
  VIEWER:  btoa(JSON.stringify({})) + "." + btoa(JSON.stringify({ sub:"u004", email:"viewer@finai.io",  name:"Sam Rivera",   role:"VIEWER",  exp: Date.now()/1000+3600, iat: Date.now()/1000 })) + ".sig",
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // PRODUCTION: const res = await authService.login({ username, password });
      // tokenService.set(res.access_token);
      // const user = tokenService.getUser();

      // DEMO: map credentials to role
      await new Promise(r => setTimeout(r, 800));
      const roleMap = { admin:"ADMIN", analyst:"ANALYST", auditor:"AUDITOR", viewer:"VIEWER" };
      const role = roleMap[username.toLowerCase()];
      if (!role || password !== "demo") throw new Error("Invalid credentials");

      const token = DEMO_TOKENS[role];
      tokenService.set(token);
      const resolved = tokenService.getUser();
      setUser(resolved);
      logger.info("Login successful", { email: username, role });
    } catch(e) {
      setAuthError(e.message || "Authentication failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    logger.info("User logout", { userId: user?.id });
    tokenService.clear();
    setUser(null);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

// ─── Response Renderers ───────────────────────────────────────────────────────

function RiskSummaryCard({ data }) {
  const C = { HIGH:"#ef4444", MEDIUM:"#f59e0b", LOW:"#22c55e" };
  const B = { HIGH:"rgba(239,68,68,0.1)", MEDIUM:"rgba(245,158,11,0.1)", LOW:"rgba(34,197,94,0.1)" };
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:16, marginTop:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, color:"#e2e8f0", fontWeight:600 }}>{data.entity}</span>
        <span style={{ background:B[data.riskLevel], color:C[data.riskLevel], border:`1px solid ${C[data.riskLevel]}50`, borderRadius:4, padding:"3px 10px", fontSize:11, fontWeight:700, letterSpacing:"0.08em" }}>
          {data.riskLevel} RISK
        </span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:14 }}>
        {data.metrics.map(m => (
          <div key={m.label} style={{ background:"rgba(0,0,0,0.25)", borderRadius:6, padding:"8px 6px", textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#475569", marginBottom:3, fontFamily:"monospace" }}>{m.label}</div>
            <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:700, fontFamily:"'IBM Plex Mono',monospace" }}>{m.value}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:12.5, color:"#94a3b8", lineHeight:1.65, marginBottom:12 }}>{data.narrative}</p>
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {data.flags.map((f,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:"#fbbf24" }}>
            <span style={{ width:4, height:4, borderRadius:"50%", background:"#fbbf24", flexShrink:0 }} />{f}
          </div>
        ))}
      </div>
    </div>
  );
}

function TableResponse({ data }) {
  return (
    <div style={{ overflowX:"auto", marginTop:4 }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'IBM Plex Mono',monospace", fontSize:12 }}>
        <thead>
          <tr>{data.columns.map(c => (
            <th key={c} style={{ textAlign:"left", padding:"7px 12px", background:"rgba(99,102,241,0.12)", color:"#818cf8", fontWeight:600, fontSize:11, letterSpacing:"0.05em", borderBottom:"1px solid rgba(99,102,241,0.25)" }}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>
          {data.rows.map((row,i) => (
            <tr key={i} style={{ background: i%2===0?"rgba(255,255,255,0.02)":"transparent" }}>
              {row.map((cell,j) => (
                <td key={j} style={{ padding:"7px 12px", color: String(cell).startsWith("+")?"#4ade80":String(cell).startsWith("-")?"#f87171":"#cbd5e1", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:12 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";
  return (
    <div style={{ display:"flex", justifyContent:isUser?"flex-end":"flex-start", marginBottom:18, animation:"fadeUp 0.2s ease-out" }}>
      {!isUser && (
        <div style={{ width:28, height:28, borderRadius:6, background:isSystem?"rgba(245,158,11,0.12)":"rgba(99,102,241,0.18)", border:`1px solid ${isSystem?"rgba(245,158,11,0.3)":"rgba(99,102,241,0.35)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, marginRight:8, flexShrink:0, marginTop:2 }}>
          {isSystem?"⚠":"◈"}
        </div>
      )}
      <div style={{ maxWidth:"82%" }}>
        {!isUser && (
          <div style={{ fontSize:10, color:"#334155", marginBottom:4, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.04em" }}>
            {isSystem ? "GUARDRAIL · " : "FIN·AI · "}{msg.timestamp}
          </div>
        )}
        <div style={{
          background:isUser?"rgba(99,102,241,0.13)":isSystem?"rgba(245,158,11,0.07)":"rgba(255,255,255,0.04)",
          border:`1px solid ${isUser?"rgba(99,102,241,0.3)":isSystem?"rgba(245,158,11,0.22)":"rgba(255,255,255,0.07)"}`,
          borderRadius:isUser?"12px 12px 4px 12px":"4px 12px 12px 12px",
          padding:"10px 14px",
        }}>
          {msg.type === "risk_summary" ? <RiskSummaryCard data={msg.content} />
           : msg.type === "table"      ? <TableResponse data={msg.content} />
           : <p style={{ fontSize:13.5, color:isSystem?"#fbbf24":"#cbd5e1", lineHeight:1.68, margin:0, fontFamily:"'Lato',sans-serif", whiteSpace:"pre-wrap" }}>{msg.content}</p>}
        </div>
        {isUser && (
          <div style={{ fontSize:10, color:"#334155", marginTop:3, textAlign:"right", fontFamily:"monospace" }}>{msg.timestamp}</div>
        )}
      </div>
    </div>
  );
}

// ─── Login Page (maps to src/components/auth/LoginPage.tsx) ──────────────────

function LoginPage() {
  const { login, isLoading, authError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username || !password) { setLocalError("Username and password are required."); return; }
    setLocalError("");
    try {
      await login(username, password);
    } catch(err) {
      setLocalError(err.message || "Authentication failed.");
    }
  };

  const demoLogin = (role) => {
    setUsername(role.toLowerCase());
    setPassword("demo");
    setTimeout(() => login(role.toLowerCase(), "demo").catch(()=>{}), 50);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#080c14", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Lato',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Lato:wght@300;400;700&display=swap');
        .login-input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); borderRadius:8px; padding:11px 14px; color:#e2e8f0; font-size:14px; font-family:inherit; outline:none; transition:border-color 0.15s; box-sizing:border-box; }
        .login-input:focus { border-color:rgba(99,102,241,0.6); }
        .login-input::placeholder { color:#334155; }
        .demo-btn { background:transparent; border:1px solid rgba(255,255,255,0.08); color:#475569; border-radius:5px; padding:5px 12px; font-size:11px; font-family:'IBM Plex Mono',monospace; cursor:pointer; transition:all 0.15s; }
        .demo-btn:hover { background:rgba(255,255,255,0.05); color:#94a3b8; border-color:rgba(255,255,255,0.15); }
      `}</style>

      <div style={{ width:420, padding:"40px 36px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
          <div style={{ width:38, height:38, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 0 20px rgba(99,102,241,0.3)" }}>◈</div>
          <div>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:15, fontWeight:600, color:"#e2e8f0", lineHeight:1 }}>FIN·AI</div>
            <div style={{ fontSize:10, color:"#334155", letterSpacing:"0.1em", marginTop:2 }}>ENTERPRISE PLATFORM</div>
          </div>
        </div>

        <h1 style={{ fontSize:20, fontWeight:700, color:"#e2e8f0", margin:"0 0 6px" }}>Secure Sign In</h1>
        <p style={{ fontSize:13, color:"#475569", marginBottom:28 }}>All sessions are JWT-authenticated and audited.</p>

        {(localError || authError) && (
          <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#f87171" }}>
            {localError || authError}
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <input className="login-input" type="text" placeholder="Username" autoComplete="username"
            value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          <input className="login-input" type="password" placeholder="Password" autoComplete="current-password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>

        <button onClick={handleSubmit} disabled={isLoading}
          style={{ width:"100%", marginTop:20, padding:"12px", background:"linear-gradient(135deg,#6366f1,#7c3aed)", border:"none", borderRadius:8, color:"white", fontSize:14, fontWeight:600, cursor:isLoading?"not-allowed":"pointer", opacity:isLoading?0.65:1, fontFamily:"inherit", letterSpacing:"0.02em" }}>
          {isLoading ? "Authenticating…" : "Sign In →"}
        </button>

        {/* Demo shortcuts */}
        <div style={{ marginTop:28, paddingTop:20, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize:11, color:"#334155", fontFamily:"'IBM Plex Mono',monospace", marginBottom:10, letterSpacing:"0.05em" }}>DEMO ACCESS — password: demo</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {["ADMIN","ANALYST","AUDITOR","VIEWER"].map(r => (
              <button key={r} className="demo-btn" onClick={() => demoLogin(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize:11, color:"#1e293b", textAlign:"center", marginTop:20 }}>
          POST /login → JWT → role decoded client-side · sessionStorage
        </p>
      </div>
    </div>
  );
}

// ─── Chat Interface ───────────────────────────────────────────────────────────

function ChatInterface() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([{
    id:"init", role:"assistant", type:"text",
    content:`Connected to FinAI Platform. Session authenticated.\nRole: ${user?.role} · User: ${user?.name}\n\nAll queries are logged to /audit endpoint. Ask about portfolio positions, risk summaries, transaction data, or compliance topics.`,
    timestamp: new Date().toLocaleTimeString()
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [auditLogs, setAuditLogs] = useState([
    { level:"info", msg:"Session authenticated", meta:{ role:user?.role, userId:user?.id }, time:new Date().toLocaleTimeString() }
  ]);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const roleMeta = ROLE_META[user?.role] || ROLE_META.VIEWER;
  const canChat = PERMISSIONS[user?.role]?.includes("chat");

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const addLog = useCallback((level, msg, meta={}) => {
    const entry = { level, msg, meta, time:new Date().toLocaleTimeString() };
    setAuditLogs(p => [entry, ...p.slice(0,49)]);
    logger[level]?.(msg, meta);
  }, []);

  const checkGuardrail = (query) => {
    for (const rule of GUARDRAIL_RULES) {
      if (rule.blockedRoles.includes(user?.role) && rule.pattern.test(query)) {
        return { blocked:true, reason:rule.reason, ruleId:rule.id };
      }
    }
    return { blocked:false };
  };

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || loading) return;

    const now = new Date().toLocaleTimeString();

    // Guardrail check
    const guard = checkGuardrail(query);
    if (guard.blocked) {
      addLog("warn", "Guardrail triggered", { query:query.slice(0,60), ruleId:guard.ruleId, role:user?.role });
      setMessages(p => [...p, { id:crypto.randomUUID(), role:"system", type:"text", content:guard.reason, timestamp:now }]);
      setInput("");
      return;
    }

    setMessages(p => [...p, { id:crypto.randomUUID(), role:"user", type:"text", content:query, timestamp:now }]);
    setInput("");
    setLoading(true);
    addLog("info", "Query dispatched", { endpoint:"POST /chat", length:query.length });

    try {
      // PRODUCTION: const res = await chatService.sendMessage({ query, session_id: tokenService.getSessionId() });
      const res = await simulateAPI(query);
      setMessages(p => [...p, { id:crypto.randomUUID(), role:"assistant", type:res.type, content:res.content, timestamp:new Date().toLocaleTimeString() }]);
      addLog("info", "Response received", { type:res.type });
    } catch(err) {
      setMessages(p => [...p, { id:crypto.randomUUID(), role:"system", type:"text", content:"Request failed. Check network or try again.", timestamp:new Date().toLocaleTimeString(), isError:true }]);
      addLog("error", "Chat API error", { message:err.message });
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    ...(canChat ? ["Portfolio holdings summary", "Risk exposure — Meridian Capital", "Q3 revenue breakdown"] : []),
    ...(user?.role === "ADMIN" ? ["Delete transaction GR-001"] : []),
    "Wire transfer analysis",
  ];

  return (
    <div style={{ height:"100vh", background:"#080c14", display:"flex", flexDirection:"column", fontFamily:"'Lato',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Lato:wght@300;400;700&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,60%,100% { opacity:0.15; } 30% { opacity:1; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .tab-btn { background:transparent; border:none; cursor:pointer; font-family:'Lato',sans-serif; transition:all 0.15s; }
        .chip { background:rgba(99,102,241,0.07); border:1px solid rgba(99,102,241,0.18); color:#6366f1; border-radius:20px; padding:5px 13px; font-size:11.5px; cursor:pointer; transition:all 0.15s; white-space:nowrap; font-family:'Lato',sans-serif; }
        .chip:hover { background:rgba(99,102,241,0.14); border-color:rgba(99,102,241,0.4); }
        .send-btn { border:none; cursor:pointer; transition:all 0.15s; font-family:'Lato',sans-serif; }
        .send-btn:hover:not(:disabled) { filter:brightness(1.12); }
        .send-btn:disabled { opacity:0.3; cursor:not-allowed; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ borderBottom:"1px solid rgba(255,255,255,0.07)", background:"rgba(8,12,20,0.98)", backdropFilter:"blur(20px)", padding:"0 20px", display:"flex", alignItems:"center", height:52, gap:16, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>◈</div>
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:600, color:"#e2e8f0" }}>FIN·AI</span>
          <span style={{ fontSize:9, color:"#1e293b", letterSpacing:"0.1em", fontFamily:"monospace" }}>ENTERPRISE</span>
        </div>

        <div style={{ display:"flex", gap:1, flex:1 }}>
          {[["chat","Chat"],["audit","Audit Log"],["arch","Backend Integration"]].map(([id,label]) => (
            <button key={id} className="tab-btn" onClick={() => setActiveTab(id)}
              style={{ padding:"6px 14px", fontSize:12.5, fontWeight:500, color:activeTab===id?"#818cf8":"#334155", borderBottom:`2px solid ${activeTab===id?"#6366f1":"transparent"}` }}>
              {label}
            </button>
          ))}
        </div>

        {/* User badge — role from JWT, not UI state */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, color:"#475569" }}>{user?.name}</span>
          <span style={{ background:roleMeta.bg, color:roleMeta.color, border:`1px solid ${roleMeta.border}`, borderRadius:5, padding:"3px 10px", fontSize:11, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace" }}>
            {user?.role}
          </span>
          <button onClick={logout} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#475569", borderRadius:5, padding:"3px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── CHAT TAB ── */}
      {activeTab === "chat" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", maxWidth:920, width:"100%", margin:"0 auto", padding:"0 20px", overflow:"hidden" }}>
          {/* Role + session info bar */}
          <div style={{ padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", gap:16, alignItems:"center" }}>
            <span style={{ fontSize:11, color:"#1e293b", fontFamily:"'IBM Plex Mono',monospace" }}>JWT_ROLE: <span style={{ color:roleMeta.color }}>{user?.role}</span></span>
            <span style={{ fontSize:11, color:"#1e293b", fontFamily:"monospace" }}>API: {API_BASE_URL}</span>
            <span style={{ fontSize:11, color:"#1e293b", fontFamily:"monospace", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:canChat?"#22c55e":"#ef4444", display:"inline-block" }} />
              {canChat ? "Chat permitted" : "Chat restricted for this role"}
            </span>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px 0" }}>
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            {loading && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
                <div style={{ width:28, height:28, borderRadius:6, background:"rgba(99,102,241,0.18)", border:"1px solid rgba(99,102,241,0.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>◈</div>
                <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"4px 12px 12px 12px", padding:"12px 16px", display:"flex", gap:5, alignItems:"center" }}>
                  {[0,1,2].map(i => <span key={i} style={{ width:5, height:5, borderRadius:"50%", background:"#6366f1", animation:`pulse 1.2s ${i*0.2}s infinite ease-in-out` }} />)}
                  <span style={{ fontSize:11, color:"#334155", marginLeft:6, fontFamily:"monospace" }}>POST /chat · awaiting response</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div style={{ display:"flex", gap:7, paddingBottom:8, overflowX:"auto" }}>
            {SUGGESTIONS.map(s => (
              <button key={s} className="chip" onClick={() => setInput(s)}>{s}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ marginBottom:16, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"12px 16px", display:"flex", gap:12, alignItems:"flex-end" }}>
            {!canChat ? (
              <p style={{ flex:1, fontSize:13, color:"#334155", margin:0, fontStyle:"italic" }}>
                Chat endpoint is not accessible for <span style={{ color:roleMeta.color, fontFamily:"monospace" }}>{user?.role}</span> role. Role is determined by JWT payload — sign in as ADMIN or ANALYST to enable.
              </p>
            ) : (
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==="Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Query the financial AI… (Enter to send)"
                style={{ flex:1, background:"transparent", border:"none", color:"#e2e8f0", fontSize:14, resize:"none", fontFamily:"'Lato',sans-serif", lineHeight:1.5, outline:"none", maxHeight:80 }}
                rows={1} />
            )}
            <button className="send-btn" onClick={sendMessage} disabled={!canChat || loading || !input.trim()}
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", color:"white", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:700 }}>
              Send ↑
            </button>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB ── */}
      {activeTab === "audit" && (
        <div style={{ flex:1, overflowY:"auto", padding:"24px 32px", maxWidth:880, width:"100%", margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              <h2 style={{ fontSize:17, fontWeight:700, color:"#e2e8f0", margin:"0 0 4px", fontFamily:"'IBM Plex Mono',monospace" }}>Audit Log</h2>
              <p style={{ fontSize:12, color:"#334155", margin:0 }}>warn+ events shipped to POST /audit with JWT auth · fire-and-forget</p>
            </div>
            <span style={{ fontSize:11, color:"#475569", fontFamily:"monospace", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:5, padding:"4px 10px" }}>{auditLogs.length} events</span>
          </div>

          <div style={{ background:"rgba(0,0,0,0.35)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"50px 70px 1fr 160px", padding:"7px 16px", background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              {["Level","Time","Message","Meta"].map(h => (
                <span key={h} style={{ fontSize:10, color:"#334155", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.06em", fontWeight:600 }}>{h}</span>
              ))}
            </div>
            {auditLogs.length === 0 && (
              <div style={{ padding:"24px 16px", textAlign:"center", fontSize:13, color:"#1e293b" }}>No events yet</div>
            )}
            {auditLogs.map((log,i) => {
              const lc = { info:"#22c55e", warn:"#f59e0b", error:"#ef4444", debug:"#64748b" };
              return (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"50px 70px 1fr 160px", padding:"7px 16px", borderBottom:"1px solid rgba(255,255,255,0.03)", fontFamily:"'IBM Plex Mono',monospace", fontSize:11.5, background: log.level==="warn"?"rgba(245,158,11,0.04)":log.level==="error"?"rgba(239,68,68,0.04)":"transparent" }}>
                  <span style={{ color:lc[log.level]||"#64748b", fontWeight:600 }}>{log.level}</span>
                  <span style={{ color:"#334155" }}>{log.time}</span>
                  <span style={{ color:"#94a3b8" }}>{log.msg}</span>
                  <span style={{ color:"#334155", fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{JSON.stringify(log.meta||{})}</span>
                </div>
              );
            })}
          </div>

          {/* Log shipping code snippet */}
          <div style={{ marginTop:20, background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"8px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)", fontSize:10, color:"#334155", fontFamily:"monospace", letterSpacing:"0.05em" }}>BACKEND ENDPOINT — FastAPI</div>
            <pre style={{ margin:0, padding:"14px 16px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11.5, color:"#94a3b8", lineHeight:1.7, overflowX:"auto" }}>{`# POST /audit
@router.post("/audit")
async def receive_audit_log(
    entry: AuditLogEntry,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    log = AuditLog(
        user_id=current_user.id,
        role=current_user.role,
        level=entry.level,
        message=entry.message,
        meta=entry.meta,
        session_id=entry.session_id,
        route=entry.route,
        created_at=datetime.utcnow()
    )
    db.add(log)
    await db.commit()
    return {"status": "ok"}`}</pre>
          </div>
        </div>
      )}

      {/* ── BACKEND INTEGRATION TAB ── */}
      {activeTab === "arch" && (
        <div style={{ flex:1, overflowY:"auto", padding:"24px 32px", maxWidth:920, width:"100%", margin:"0 auto" }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:"#e2e8f0", margin:"0 0 4px", fontFamily:"'IBM Plex Mono',monospace" }}>FastAPI ↔ React Integration</h2>
          <p style={{ fontSize:12, color:"#334155", marginBottom:22 }}>Every frontend call maps to a typed endpoint. JWT validation is backend-enforced.</p>

          {[
            {
              method:"POST", path:"/login", color:"#22c55e",
              desc:"OAuth2PasswordRequestForm. Returns JWT with sub, email, name, role, exp.",
              frontend:"authService.login({ username, password })\n// → tokenService.set(res.access_token)\n// → role decoded client-side via jwtDecode()",
              backend:`@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate(form.username, form.password)
    if not user: raise HTTPException(401)
    token = create_jwt({
        "sub": str(user.id), "email": user.email,
        "name": user.name,   "role":  user.role,
        "exp": datetime.utcnow() + timedelta(hours=8)
    })
    return {"access_token": token, "token_type": "bearer"}`
            },
            {
              method:"POST", path:"/chat", color:"#818cf8",
              desc:"Authenticated. Role enforced server-side. Returns type: text|table|risk_summary.",
              frontend:`chatService.sendMessage({
  query: userInput,
  session_id: tokenService.getSessionId()
})`,
              backend:`@router.post("/chat")
async def chat(
    req: ChatRequest,
    user: User = Depends(get_current_user)
):
    # Server-side guardrails (mirrors client)
    if not check_guardrails(req.query, user.role):
        raise HTTPException(403, "Query blocked by guardrails")
    
    response = await llm_service.process(req.query, user.role)
    return {
        "type": response.type,     # text|table|risk_summary
        "content": response.data,
        "query_id": str(uuid4()),
        "timestamp": datetime.utcnow().isoformat()
    }`
            },
            {
              method:"POST", path:"/audit", color:"#fbbf24",
              desc:"Fire-and-forget from frontend logger. Persists to audit table.",
              frontend:`// logger.ts — fires on warn/error, never awaited
fetch("/audit", {
  method: "POST",
  headers: { Authorization: \`Bearer \${token}\` },
  body: JSON.stringify(logEntry)
})`,
              backend:`@router.post("/audit")
async def audit_log(
    entry: AuditLogEntry,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(insert(AuditLog).values(
        user_id=user.id, level=entry.level,
        message=entry.message, meta=entry.meta,
        session_id=entry.session_id
    ))
    return {"status": "ok"}`
            },
          ].map(ep => (
            <div key={ep.path} style={{ marginBottom:18, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
              <div style={{ padding:"10px 16px", background:`${ep.color}0d`, borderBottom:`1px solid ${ep.color}20`, display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ background:`${ep.color}20`, color:ep.color, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:700, fontFamily:"monospace" }}>{ep.method}</span>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, color:ep.color, fontWeight:600 }}>{ep.path}</span>
                <span style={{ fontSize:12, color:"#475569", marginLeft:4 }}>{ep.desc}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
                <div style={{ padding:"12px 16px", borderRight:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize:10, color:"#334155", fontFamily:"monospace", letterSpacing:"0.05em", marginBottom:8 }}>FRONTEND CALL</div>
                  <pre style={{ margin:0, fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#818cf8", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{ep.frontend}</pre>
                </div>
                <div style={{ padding:"12px 16px" }}>
                  <div style={{ fontSize:10, color:"#334155", fontFamily:"monospace", letterSpacing:"0.05em", marginBottom:8 }}>FASTAPI HANDLER</div>
                  <pre style={{ margin:0, fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#94a3b8", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{ep.backend}</pre>
                </div>
              </div>
            </div>
          ))}

          {/* CORS config */}
          <div style={{ background:"rgba(0,0,0,0.35)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"8px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", fontSize:10, color:"#334155", fontFamily:"monospace", letterSpacing:"0.05em" }}>FastAPI CORS + JWT SETUP (main.py)</div>
            <pre style={{ margin:0, padding:"14px 16px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11.5, color:"#94a3b8", lineHeight:1.7 }}>{`from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer

app = FastAPI(title="FinAI API", docs_url=None)  # disable docs in prod

app.add_middleware(CORSMiddleware,
    allow_origins=["https://app.finai.yourdomain.com"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_jwt(token)  # raises 401 if invalid/expired
    return await user_repo.get(payload["sub"])`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <ChatInterface /> : <LoginPage />;
}

// Wrap with provider for standalone artifact
const Root = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export { Root as default };
