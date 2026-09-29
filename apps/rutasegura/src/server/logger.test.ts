import { afterEach, describe, expect, it, vi } from "vitest";
import { REDACTED, errorKind, logger, redact } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("redact", () => {
  it("oculta claves sensibles, también anidadas", () => {
    expect(
      redact({
        route: "/api/v1/auth/login",
        email: "ana@example.org",
        password: "clave-super-secreta",
        headers: { cookie: "rs_access=abc", Authorization: "Bearer abc" },
        trackingNumber: "RS123",
        recipientName: "Ana",
        ip: "203.0.113.7",
        ipHash: "hmac",
        userId: "0f6c",
      }),
    ).toEqual({
      route: "/api/v1/auth/login",
      email: REDACTED,
      password: REDACTED,
      headers: { cookie: REDACTED, Authorization: REDACTED },
      trackingNumber: REDACTED,
      recipientName: REDACTED,
      ip: REDACTED,
      ipHash: "hmac",
      userId: "0f6c",
    });
  });
});

describe("logger", () => {
  it("nunca escribe tokens, cookies ni correos aunque se le pasen", () => {
    const write = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.warn("security.test", {
      reason: "invalid_token",
      accessToken: "eyJhbGciOi.secreto",
      email: "ana@example.org",
    });
    const line = String(write.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({ event: "security.test", reason: "invalid_token" });
    expect(line).not.toContain("secreto");
    expect(line).not.toContain("ana@example.org");
  });
});

describe("errorKind", () => {
  it("reduce el error a su nombre y código", () => {
    const error = Object.assign(new Error("postgres://usuario:clave@host"), {
      code: "ECONNREFUSED",
    });
    expect(errorKind(error)).toBe("Error:ECONNREFUSED");
  });
});
