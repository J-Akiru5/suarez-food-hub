import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 30000,
  retries: 1,
  projects: [
    {
      name: "web",
      use: { baseURL: "http://localhost:3000" },
      testDir: "./tests/web",
    },
    {
      name: "admin",
      use: { baseURL: "http://localhost:3001" },
      testDir: "./tests/admin",
    },
    {
      name: "staff",
      use: { baseURL: "http://localhost:3002" },
      testDir: "./tests/staff",
    },
    {
      name: "rider",
      use: { baseURL: "http://localhost:3003" },
      testDir: "./tests/rider",
    },
  ],
  webServer: [
    { command: "pnpm --filter @repo/web dev", port: 3000, reuseExistingServer: true },
    { command: "pnpm --filter @repo/admin dev", port: 3001, reuseExistingServer: true },
    { command: "pnpm --filter @repo/staff dev", port: 3002, reuseExistingServer: true },
    { command: "pnpm --filter @repo/rider dev", port: 3003, reuseExistingServer: true },
  ],
  use: {
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
});
