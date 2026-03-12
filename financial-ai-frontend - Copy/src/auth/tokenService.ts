// ============================================================
// TOKEN SERVICE - JWT storage and decode helpers
// ============================================================

export const tokenService = {
  // ── Core storage ────────────────────────────────────────────
  set: (token: string) => localStorage.setItem("auth_token", token),
  get: () => localStorage.getItem("auth_token"),
  clear: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
  },

  // ── Alias methods (used by apiClient + authService) ─────────
  getToken: () => localStorage.getItem("auth_token"),
  getRole: () => localStorage.getItem("user_role"),
  setToken: (token: string) => localStorage.setItem("auth_token", token),
  setRole: (role: string) => localStorage.setItem("user_role", role),
  removeToken: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
  },

  // ── JWT decode (base64 payload, no verify — server validates) ─
  decode: (): { sub: string; role: string; exp?: number } => {
    const token = localStorage.getItem("auth_token");
    if (!token) return { sub: "guest", role: "VIEWER" };
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload));
    } catch {
      return { sub: "guest", role: "VIEWER" };
    }
  },

  getUser: () => {
    const decoded = tokenService.decode();
    return { username: decoded.sub, role: decoded.role };
  },

  getSessionId: () => {
    let sid = sessionStorage.getItem("session_id");
    if (!sid) {
      sid = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("session_id", sid);
    }
    return sid;
  },

  isExpired: (): boolean => {
    const { exp } = tokenService.decode();
    if (!exp) return false;
    return Date.now() / 1000 > exp;
  },
};
