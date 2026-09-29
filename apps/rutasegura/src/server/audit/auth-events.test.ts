import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/env", () => ({
  getEnv: () => ({ HMAC_SECRET: "q3Zp9vN1xT7sK2mB8wLc4RfYh6JdGa0E" }),
}));

const values = vi.fn().mockResolvedValue(undefined);
vi.mock("@/server/repositories/db", () => ({
  db: () => ({ insert: () => ({ values }) }),
}));

const { recordAuthEvent } = await import("./auth-events");

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  log = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  log.mockRestore();
});

describe("recordAuthEvent", () => {
  it("refleja los fallos de autenticación en el log sin correo ni IP", async () => {
    await recordAuthEvent({
      type: "login_failure",
      userId: "u1",
      subject: "ana@example.org",
      ip: "203.0.113.7",
    });

    const entry = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      event: "security.auth_event",
      type: "login_failure",
      userId: "u1",
    });
    const raw = JSON.stringify(log.mock.calls);
    expect(raw).not.toContain("ana@example.org");
    expect(raw).not.toContain("203.0.113.7");

    const row = values.mock.calls[0]?.[0];
    expect(row.subjectHash).not.toContain("ana");
    expect(row.ipHash).not.toContain("203");
  });

  it("no emite al log de seguridad los eventos de éxito", async () => {
    await recordAuthEvent({ type: "login_success", userId: "u1" });
    expect(log).not.toHaveBeenCalled();
    expect(values).toHaveBeenCalledOnce();
  });
});
