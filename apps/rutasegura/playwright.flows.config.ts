import { defineConfig, devices } from "@playwright/test";
import type { FlowOptions } from "./e2e-flows/fixtures";

/**
 * Flujos críticos de la UI (auth, agenda, documentos) contra el entorno Docker
 * completo: app (imagen de producción), PostgreSQL, Redis y MinIO. Lo corre
 * `scripts/e2e-flows.sh`.
 * Cada motor usa su propia guía de la semilla y su propia IP, para no compartir
 * dueño ni cupos de rate limit.
 */
export default defineConfig<FlowOptions>({
  testDir: "./e2e-flows",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        shipment: { trackingNumber: "RS0000000004", phoneLast4: "1111" },
        criticalShipment: { trackingNumber: "RS0000000006", phoneLast4: "3333" },
        rateLimitIp: "198.51.100.51",
        extraHTTPHeaders: { "x-forwarded-for": "198.51.100.41" },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        shipment: { trackingNumber: "RS0000000005", phoneLast4: "2222" },
        criticalShipment: { trackingNumber: "RS0000000007", phoneLast4: "4444" },
        rateLimitIp: "198.51.100.52",
        extraHTTPHeaders: { "x-forwarded-for": "198.51.100.42" },
      },
    },
  ],
});
