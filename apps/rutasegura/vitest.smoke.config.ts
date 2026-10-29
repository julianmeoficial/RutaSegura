import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["smoke/**/*.smoke.test.ts"],
    setupFiles: ["./smoke/clear-rate-limits.ts"],
    // Los casos dependen del orden (registro, login, rotación, bloqueo).
    sequence: { concurrent: false },
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
