import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "q3Zp9vN1xT7sK2mB8wLc4RfYh6JdGa0E";
vi.mock("@/server/env", () => ({
  getEnv: () => ({
    SESSION_SECRET: SECRET,
    HMAC_SECRET: SECRET,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    ACCESS_TOKEN_TTL_SECONDS: 900,
  }),
}));

const verifyAccessToken = vi.fn();
vi.mock("./tokens", () => ({ verifyAccessToken }));

const isSessionActive = vi.fn();
vi.mock("@/server/repositories/sessions", () => ({ isSessionActive }));

const findUserById = vi.fn();
vi.mock("@/server/repositories/users", () => ({
  findUserById,
  toAuthUser: (user: { id: string; email: string }) => ({ id: user.id, email: user.email }),
}));

const { requireUser } = await import("./require-user");

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.token-de-prueba";
const EMAIL = "ana@example.org";

function request(cookie?: string) {
  return new Request("http://localhost:3000/api/v1/shipments", {
    headers: {
      ...(cookie ? { cookie } : {}),
      "x-forwarded-for": "203.0.113.7",
    },
  });
}

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  log = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  log.mockRestore();
});

function loggedEntries() {
  return log.mock.calls.map((call: unknown[]) => JSON.parse(String(call[0])));
}

describe("requireUser", () => {
  it.each([
    ["missing_token", undefined, () => {}],
    ["invalid_token", `rs_at=${ACCESS_TOKEN}`, () => verifyAccessToken.mockResolvedValue(null)],
    [
      "session_inactive",
      `rs_at=${ACCESS_TOKEN}`,
      () => {
        verifyAccessToken.mockResolvedValue({ userId: "u1", sessionId: "s1" });
        isSessionActive.mockResolvedValue(false);
      },
    ],
    [
      "user_not_found",
      `rs_at=${ACCESS_TOKEN}`,
      () => {
        verifyAccessToken.mockResolvedValue({ userId: "u1", sessionId: "s1" });
        isSessionActive.mockResolvedValue(true);
        findUserById.mockResolvedValue(undefined);
      },
    ],
  ])("responde 401 y registra security.auth_failure (%s)", async (reason, cookie, arrange) => {
    arrange();
    const result = await requireUser(request(cookie), "shipments.list");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);

    const [entry] = loggedEntries();
    expect(entry).toMatchObject({
      level: "warn",
      event: "security.auth_failure",
      route: "shipments.list",
      method: "GET",
      reason,
    });
    expect(entry.ipHash).toMatch(/^[A-Za-z0-9_-]+$/);

    const raw = JSON.stringify(log.mock.calls);
    expect(raw).not.toContain(ACCESS_TOKEN);
    expect(raw).not.toContain("203.0.113.7");
  });

  it("devuelve el usuario sin registrar nada cuando la sesión es válida", async () => {
    verifyAccessToken.mockResolvedValue({ userId: "u1", sessionId: "s1" });
    isSessionActive.mockResolvedValue(true);
    findUserById.mockResolvedValue({ id: "u1", email: EMAIL });

    const result = await requireUser(request(`rs_at=${ACCESS_TOKEN}`), "auth.me");
    expect(result).toEqual({ id: "u1", email: EMAIL });
    expect(log).not.toHaveBeenCalled();
  });
});
