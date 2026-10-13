import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "q3Zp9vN1xT7sK2mB8wLc4RfYh6JdGa0E";
vi.mock("@/server/env", () => ({ getEnv: () => ({ HMAC_SECRET: SECRET }) }));

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.token-de-prueba";
let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieValue === undefined ? undefined : { value: cookieValue }),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));

class RedirectSignal extends Error {}
const redirect = vi.fn((url: string) => {
  throw new RedirectSignal(url);
});
vi.mock("next/navigation", () => ({
  redirect,
  unstable_rethrow: (error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  },
}));

const authenticateAccessToken = vi.fn();
vi.mock("./require-user", () => ({ authenticateAccessToken }));

const { pageRoute, requirePortalUser } = await import("./current-user");

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  cookieValue = ACCESS_TOKEN;
  log = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  log.mockRestore();
});

function loggedEntries() {
  return log.mock.calls.map((call: unknown[]) => JSON.parse(String(call[0])));
}

describe("requirePortalUser", () => {
  it("sin cookie redirige al login sin registrar nada", async () => {
    cookieValue = undefined;
    authenticateAccessToken.mockResolvedValue({ ok: false, reason: "missing_token" });

    await expect(requirePortalUser("/portal/documentos")).rejects.toBeInstanceOf(RedirectSignal);
    expect(redirect).toHaveBeenCalledWith("/ingresar?next=%2Fportal%2Fdocumentos");
    expect(log).not.toHaveBeenCalled();
  });

  it.each(["invalid_token", "session_inactive", "user_not_found"])(
    "cookie rechazada (%s): redirige y registra security.auth_failure de página",
    async (reason) => {
      authenticateAccessToken.mockResolvedValue({ ok: false, reason });
      const path = "/portal/envios/01J8Z3K4M5N6P7Q8R9S0T1V2W3/agenda";

      await expect(requirePortalUser(path)).rejects.toBeInstanceOf(RedirectSignal);

      const [entry] = loggedEntries();
      expect(entry).toMatchObject({
        level: "warn",
        event: "security.auth_failure",
        source: "page",
        route: "page:/portal/envios/:id/agenda",
        method: "GET",
        reason,
      });
      expect(entry.ipHash).toMatch(/^[A-Za-z0-9_-]+$/);
      const raw = JSON.stringify(log.mock.calls);
      expect(raw).not.toContain(ACCESS_TOKEN);
      expect(raw).not.toContain("203.0.113.9");
      expect(raw).not.toContain("01J8Z3K4M5N6P7Q8R9S0T1V2W3");
    },
  );

  it("con sesión válida devuelve el usuario sin registrar nada", async () => {
    const user = { id: "u1", email: "ana@example.org", fullName: "Ana", role: "customer" };
    authenticateAccessToken.mockResolvedValue({ ok: true, user });

    await expect(requirePortalUser("/portal")).resolves.toEqual(user);
    expect(log).not.toHaveBeenCalled();
  });

  it("con la base caída lanza un error sin detalles y no registra la consulta", async () => {
    const sessionId = "966c1c5d-7187-469f-9591-2d65bd40b271";
    authenticateAccessToken.mockRejectedValue(
      new Error(`Failed query: select "id" from "sessions"\nparams: ${sessionId},1`),
    );

    const failure = await requirePortalUser("/portal").catch((error: unknown) => error);
    expect(failure).toMatchObject({ name: "PageDataError", message: "internal_error" });
    expect(redirect).not.toHaveBeenCalled();
    expect(loggedEntries()).toEqual([
      expect.objectContaining({ event: "page.unhandled_error", route: "page:session" }),
    ]);
    const raw = JSON.stringify(log.mock.calls);
    expect(raw).not.toContain(sessionId);
    expect(raw).not.toContain("Failed query");
  });
});

describe("pageRoute", () => {
  it("quita identificadores y query de la ruta", () => {
    expect(pageRoute("/portal/envios/abc'\"<x>/agenda?x=1")).toBe("page:/portal/envios/:id/agenda");
    expect(pageRoute("/portal")).toBe("page:/portal");
  });
});
