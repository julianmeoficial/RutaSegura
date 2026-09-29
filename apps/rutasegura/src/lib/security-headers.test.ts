import { describe, expect, it } from "vitest";
import { buildDocumentPolicy, createNonce, staticSecurityHeaders } from "./security-headers";

describe("buildDocumentPolicy", () => {
  it("en producción no admite unsafe-inline ni unsafe-eval", () => {
    const policy = buildDocumentPolicy({ nonce: "abc", isDevelopment: false, isHttps: true });
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-abc'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it("restringe connect-src e img-src sin comodines https:", () => {
    const policy = buildDocumentPolicy({ nonce: "abc", isDevelopment: false, isHttps: true });
    expect(policy).toContain("connect-src 'self'");
    expect(policy).not.toMatch(/https:(?!\/\/)/);
  });

  it("solo emite upgrade-insecure-requests sobre HTTPS", () => {
    expect(buildDocumentPolicy({ nonce: "n", isDevelopment: false, isHttps: true })).toContain(
      "upgrade-insecure-requests",
    );
    expect(buildDocumentPolicy({ nonce: "n", isDevelopment: false, isHttps: false })).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("habilita las excepciones de React solo en desarrollo", () => {
    const policy = buildDocumentPolicy({ nonce: "n", isDevelopment: true, isHttps: false });
    expect(policy).toContain("'unsafe-eval'");
  });
});

describe("createNonce", () => {
  it("genera valores distintos en base64", () => {
    const first = createNonce();
    expect(first).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(first).not.toBe(createNonce());
  });
});

describe("staticSecurityHeaders", () => {
  it("incluye el aislamiento de origen completo", () => {
    const keys = staticSecurityHeaders.map((header) => header.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "Cross-Origin-Opener-Policy",
        "Cross-Origin-Embedder-Policy",
        "Cross-Origin-Resource-Policy",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ]),
    );
  });

  it("incluye HSTS con preload para los recursos estáticos", () => {
    const hsts = staticSecurityHeaders.find((header) => header.key === "Strict-Transport-Security");
    expect(hsts?.value).toBe("max-age=63072000; includeSubDomains; preload");
  });
});
