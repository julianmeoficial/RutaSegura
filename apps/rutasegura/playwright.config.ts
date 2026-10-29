import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  // Aceptación cruzada de motores (H-00): la misma prueba debe pasar en Blink y WebKit.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: {
      APP_ENV: "development",
      NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PORT}`,
      DATABASE_URL: "postgresql://rutasegura_app:local_only_change_me_app@127.0.0.1:5432/rutasegura",
      REDIS_URL: "redis://127.0.0.1:6379",
      SESSION_SECRET: "e2e_only_secret_value_with_32_chars_min",
      CSRF_SECRET: "e2e_only_secret_value_with_32_chars_min",
      HMAC_SECRET: "e2e_only_secret_value_with_32_chars_min",
    },
  },
});
