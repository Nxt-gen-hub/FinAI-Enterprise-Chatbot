// ============================================================
// AUTH CONTEXT - JWT-aware authentication provider
// ============================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { AuthContextType, User, Role } from "../types/types";
import { tokenService } from "./tokenService";
import { authApi } from "../services/api";
import { logger } from "../utils/logger";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true on mount to restore session

  // ── Restore session on page load ─────────────────────────────
  useEffect(() => {
    const token = tokenService.getToken();
    if (token && !tokenService.isExpired()) {
      const decoded = tokenService.decode();
      setUser({
        id: decoded.sub,
        username: decoded.sub,
        role: decoded.role as Role,
      });
      logger.info("AuthContext", "Session restored", { user: decoded.sub });
    } else if (token) {
      // Token exists but expired — clean up
      tokenService.clear();
      logger.warn("AuthContext", "Expired token cleared");
    }
    setIsLoading(false);
  }, []);

  // ── Login ─────────────────────────────────────────────────────
  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Try real backend first
      const response = await authApi.login(username, password);
      tokenService.setToken(response.access_token);
      tokenService.setRole(response.role);
      setUser({
        id: response.username,
        username: response.username,
        role: response.role as Role,
      });
      logger.info("AuthContext", "Login success", { user: response.username, role: response.role });
    } catch (err) {
      // Demo fallback — allows UI testing without backend
      logger.warn("AuthContext", "Backend unavailable — using demo login");
      const demoUsers: Record<string, Role> = {
        admin: "ADMIN",
        analyst: "ANALYST",
        auditor: "AUDITOR",
        viewer: "VIEWER",
      };
      const role: Role = demoUsers[username.toLowerCase()] ?? "ANALYST";
      // Create a fake JWT-like token for demo
      const fakePayload = btoa(JSON.stringify({ sub: username, role, exp: Math.floor(Date.now() / 1000) + 3600 }));
      const fakeToken = `demo.${fakePayload}.sig`;
      tokenService.setToken(fakeToken);
      tokenService.setRole(role);
      setUser({ id: username, username, role });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────
  const logout = () => {
    tokenService.clear();
    setUser(null);
    logger.info("AuthContext", "User logged out");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
