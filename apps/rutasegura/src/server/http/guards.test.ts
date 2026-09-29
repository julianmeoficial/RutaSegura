import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/env", () => ({
  getEnv: () => ({ HMAC_SECRET: "q3Zp9vN1xT7sK2mB8wLc4RfYh6JdGa0E" }),
}));
vi.mock("@/server/audit/auth-events", () => ({ recordAuthEvent: vi.fn() }));
vi.mock("@/server/rate-limit/policies", () => ({ applyRateLimit: vi.fn() }));

const { OwnershipError } = await import("@/server/authorization/ownership");
const { withErrorHandling } = await import("./guards");

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  log = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  log.mockRestore();
});

describe("withErrorHandling", () => {
  it("traduce OwnershipError a 404 y lo registra como acceso denegado", async () => {
    const handler = withErrorHandling("shipments.get", async () => {
      throw new OwnershipError();
    });
    const response = await handler(
      new Request("http://localhost:3000/api/v1/shipments/01J0000000000000000000000", {
        headers: { cookie: "rs_at=secreto" },
      }),
      undefined,
    );

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");

    const entry = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      level: "warn",
      event: "security.access_denied",
      route: "shipments.get",
      method: "GET",
      reason: "ownership",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secreto");
  });

  it("los errores inesperados responden 500 sin detalles", async () => {
    const handler = withErrorHandling("shipments.list", async () => {
      throw new Error("postgres://usuario:clave@host");
    });
    const response = await handler(
      new Request("http://localhost:3000/api/v1/shipments"),
      undefined,
    );
    expect(response.status).toBe(500);
    expect(JSON.stringify(log.mock.calls)).not.toContain("clave");
  });
});
