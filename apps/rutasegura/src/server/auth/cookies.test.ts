import { describe, expect, it } from "vitest";
import {
  clearSessionCookies,
  cookieNames,
  isHttpsRequest,
  readCookie,
  setSessionCookies,
} from "./cookies";

const cookies = { accessToken: "at", accessMaxAge: 900, refreshToken: "rt", refreshMaxAge: 28800 };

describe("cookies de sesión", () => {
  it("sobre HTTPS usan el prefijo __Host- y Secure", () => {
    const headers = new Headers();
    setSessionCookies(headers, true, cookies);
    const [access, refresh] = headers.getSetCookie();
    expect(access).toBe("__Host-rs_at=at; Path=/; Max-Age=900; HttpOnly; SameSite=Lax; Secure");
    expect(refresh).toContain("__Host-rs_rt=rt");
  });

  it("sobre HTTP omiten Secure para que WebKit no las descarte en localhost", () => {
    const headers = new Headers();
    setSessionCookies(headers, false, cookies);
    for (const cookie of headers.getSetCookie()) {
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).not.toContain("Secure");
    }
    expect(cookieNames(false)).toEqual({ access: "rs_at", refresh: "rs_rt" });
  });

  it("isHttpsRequest fuerza HTTPS cuando APP_ENV es production", () => {
    const previous = process.env.APP_ENV;
    process.env.APP_ENV = "production";
    try {
      expect(isHttpsRequest(new Request("http://localhost/"))).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = previous;
    }
  });

  it("el cierre de sesión expira ambas cookies", () => {
    const headers = new Headers();
    clearSessionCookies(headers, false);
    expect(headers.getSetCookie().every((cookie) => cookie.includes("Max-Age=0"))).toBe(true);
  });

  it("lee una cookie por nombre exacto", () => {
    const request = new Request("http://localhost/", {
      headers: { cookie: "xrs_at=otro; rs_at=valor; rs_rt=" },
    });
    expect(readCookie(request, "rs_at")).toBe("valor");
    expect(readCookie(request, "rs_rt")).toBeUndefined();
  });
});
