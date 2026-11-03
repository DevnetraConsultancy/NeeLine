import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build backed by an in-memory
 * Postgres (PGlite), so they never touch a real database.
 *   npm run test:e2e
 */
const PORT = 3210;
const DB_PORT = 5434;
const BASE_URL = `http://localhost:${PORT}`;
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres?sslmode=disable`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, storageState: "tests/e2e/.auth/guest.json" },
      dependencies: ["setup"],
    },
    {
      name: "phone",
      testMatch: /(studio|a11y)\.spec\.ts/,
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 }, storageState: "tests/e2e/.auth/guest.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: `npx pglite-server --db=memory:// --port=${DB_PORT} --max-connections=10`,
      port: DB_PORT,
      reuseExistingServer: false,
      stdout: "ignore",
    },
    {
      command: `npx prisma migrate deploy && npx next start -p ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        DATABASE_URL,
        AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0123456789",
        AUTH_TRUST_HOST: "true",
        NEXT_PUBLIC_SITE_URL: BASE_URL,
      },
    },
  ],
});
