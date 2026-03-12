import axios from "axios";

// ── Base URL ──────────────────────────────────────────────────────────────────
let BASE_URL = "http://localhost:8000";
try {
  // @ts-ignore
  const env = require("../config/env");
  BASE_URL =
    env?.ENV?.API_BASE_URL ||
    env?.API_BASE_URL ||
    env?.default?.API_BASE_URL ||
    "http://localhost:8000";
} catch {}

// ── Read token — tokenService.ts saves as "auth_token" ───────────────────────
export const getStoredToken = (): string | null => {
  const token = localStorage.getItem("auth_token");
  if (token && token.length > 10) return token;
  return null;
};

const api = axios.create({ baseURL: BASE_URL });

// ── Attach JWT to EVERY outgoing request ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Handle 401 globally ───────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_role");
      if (!window.location.pathname.includes("login")) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth — sends form-data for OAuth2PasswordRequestForm ─────────────────────
export const authApi = {
  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);
    const res = await api.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data;
  },
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const sendChat = (message: string, session_id?: number) =>
  api.post("/chat", { message, session_id });

// ── Transactions ──────────────────────────────────────────────────────────────
export const getTransactions = () => api.get("/transactions");

// ── Risk ──────────────────────────────────────────────────────────────────────
export const getRiskSummary = () => api.get("/risk/summary");

// ── Chat History ──────────────────────────────────────────────────────────────
export const getChatSessions = () => api.get("/chat/sessions");

export const getChatSession = (sessionId: number) =>
  api.get(`/chat/sessions/${sessionId}`);

export const deleteChatSession = (sessionId: number) =>
  api.delete(`/chat/sessions/${sessionId}`);

export default api;
