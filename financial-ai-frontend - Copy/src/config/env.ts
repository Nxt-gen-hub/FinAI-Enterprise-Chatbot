// src/config/env.ts
// Environment configuration for frontend

interface EnvConfig {
  API_BASE_URL: string;
  API_TIMEOUT: number;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  IS_PRODUCTION: boolean;
}

export const ENV: EnvConfig = {
  API_BASE_URL: "http://localhost:8000", // Matches Lakshmi's FastAPI backend
  API_TIMEOUT: 15000, // 15 seconds
  LOG_LEVEL: "debug",
  IS_PRODUCTION: false,
};