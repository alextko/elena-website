import { defineConfig } from "@playwright/test";

const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmJycnFxeG52bnhoZ2dndWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc1MzYsImV4cCI6MjA4NzA0MzUzNn0.MkOKc7MWq5zoR3OY7wZgOsPwvjjKSij0ln1nF6inxP0";
const API_BASE = process.env.PLAYWRIGHT_API_BASE || "http://localhost:8010";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const apiPort = new URL(API_BASE).port || "8010";
const basePort = new URL(BASE_URL).port || "3100";

// In CI we point at a deployed backend (prod by default, override via
// PLAYWRIGHT_API_BASE) and only spin up Next locally. Setting
// PLAYWRIGHT_NO_LOCAL_BACKEND=1 skips the uvicorn webServer entry.
const skipLocalBackend = process.env.PLAYWRIGHT_NO_LOCAL_BACKEND === "1";

const localBackendServer = {
  command: `python3 -m uvicorn src.api:app --host 127.0.0.1 --port ${apiPort}`,
  cwd: "../elena-backend",
  url: `${API_BASE}/health`,
  timeout: 180_000,
  reuseExistingServer: true,
  env: {
    ...process.env,
    ELENA_E2E_CHAT_FIXTURES: "1",
    ELENA_ENABLE_CHAT_STREAM: "1",
    PARQUET_SYNC_ON_STARTUP: "false",
  },
};

const localFrontendServer = {
  command: `npm run dev -- --hostname 127.0.0.1 --port ${basePort}`,
  cwd: ".",
  url: `${BASE_URL}/favicon.ico`,
  timeout: 180_000,
  reuseExistingServer: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_API_BASE: API_BASE,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  },
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  use: {
    baseURL: BASE_URL,
    headless: true,
  },
  webServer: skipLocalBackend
    ? [localFrontendServer]
    : [localBackendServer, localFrontendServer],
});
