import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Mêmes variables que le site (.env.local) : URL Supabase et clé de service pour
// préparer puis effacer les données de test (comptes e2e-…@example.com, produit e2e-…).
loadEnvConfig(process.cwd());

const PORT = Number(process.env.E2E_PORT ?? 3210);

/**
 * Parcours de bout en bout (npm run test:e2e). Avant : npm run build.
 * Utilise le Chrome installé sur la machine (aucun navigateur à télécharger).
 * Écrit dans la base Supabase de .env.local, puis nettoie tout (voir e2e/fixtures.ts).
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    channel: process.env.E2E_CHANNEL ?? "chrome",
    locale: "fr-FR",
    timezoneId: "Africa/Bamako",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npx next start -p ${PORT}`, port: PORT, reuseExistingServer: true, timeout: 120_000 },
});
