import { describe, expect, it, vi } from "vitest";
import { checkHealth } from "./health";

vi.spyOn(console, "error").mockImplementation(() => {});

const ok = () => Promise.resolve();

describe("checkHealth", () => {
  it("reporta ok cuando ambas dependencias responden", async () => {
    await expect(checkHealth({ database: ok, redis: ok })).resolves.toEqual({
      status: "ok",
      checks: { database: "ok", redis: "ok" },
    });
  });

  it("reporta error sin exponer el detalle de la falla", async () => {
    const result = await checkHealth({
      database: () => Promise.reject(new Error("password authentication failed for user x")),
      redis: ok,
    });
    expect(result).toEqual({ status: "error", checks: { database: "error", redis: "ok" } });
    expect(JSON.stringify(result)).not.toContain("password");
  });

  it("corta una dependencia que no responde a tiempo", async () => {
    const result = await checkHealth({ database: ok, redis: () => new Promise(() => {}) }, 20);
    expect(result.checks.redis).toBe("error");
  });
});
