import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("proxy", () => {
  it("aplica CSP con nonce a los documentos", () => {
    const response = proxy(new NextRequest("http://localhost:3000/"));
    const policy = response.headers.get("content-security-policy");
    expect(policy).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(response.headers.get("cache-control")).toBeNull();
  });

  it("marca las respuestas de API como no cacheables y sin contenido activo", () => {
    const response = proxy(new NextRequest("http://localhost:3000/api/v1/health"));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  });

  it("emite HSTS en todas las respuestas, también sobre HTTP y en errores", () => {
    const http = proxy(new NextRequest("http://localhost:3000/"));
    const https = proxy(
      new NextRequest("http://rutasegura.test/", { headers: { "x-forwarded-proto": "https" } }),
    );
    const api = proxy(new NextRequest("http://localhost:3000/api/v1/health"));
    const forbidden = proxy(
      new NextRequest("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "https://atacante.example" },
      }),
    );
    for (const response of [http, https, api, forbidden]) {
      expect(response.headers.get("strict-transport-security")).toBe(
        "max-age=63072000; includeSubDomains; preload",
      );
    }
  });

  it("rechaza mutaciones de la API desde otro origen y lo registra sin datos sensibles", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = proxy(
      new NextRequest("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://atacante.example",
          cookie: "rs_access=secreto",
        },
      }),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect((await response.json()).error.code).toBe("forbidden");

    const entry = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      event: "security.access_denied",
      route: "/api/v1/auth/login",
      method: "POST",
      reason: "cross_site_mutation",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secreto");
  });

  it("rechaza mutaciones marcadas como cross-site por el navegador", () => {
    const response = proxy(
      new NextRequest("http://localhost:3000/api/v1/auth/logout", {
        method: "POST",
        headers: { host: "localhost:3000", "sec-fetch-site": "cross-site" },
      }),
    );
    expect(response.status).toBe(403);
  });

  it("deja pasar mutaciones del mismo origen, clientes sin Origin y lecturas", () => {
    const sameOrigin = proxy(
      new NextRequest("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "http://localhost:3000" },
      }),
    );
    const noOrigin = proxy(
      new NextRequest("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { host: "localhost:3000" },
      }),
    );
    const crossRead = proxy(
      new NextRequest("http://localhost:3000/api/v1/health", {
        headers: { host: "localhost:3000", origin: "https://otro.example" },
      }),
    );
    expect(sameOrigin.status).toBe(200);
    expect(noOrigin.status).toBe(200);
    expect(crossRead.status).toBe(200);
  });

  describe("CORS", () => {
    const allowed = "https://portal.rutasegura.test";

    function preflight(origin: string) {
      return proxy(
        new NextRequest("http://localhost:3000/api/v1/shipments", {
          method: "OPTIONS",
          headers: {
            host: "localhost:3000",
            origin,
            "access-control-request-method": "POST",
            "access-control-request-headers": "content-type",
          },
        }),
      );
    }

    it("acepta el preflight de un origen de la allowlist", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
      vi.stubEnv("CORS_ALLOWED_ORIGINS", allowed);
      const response = preflight(allowed);
      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(allowed);
      expect(response.headers.get("access-control-allow-credentials")).toBe("true");
      expect(response.headers.get("access-control-allow-methods")).toContain("POST");
      expect(response.headers.get("vary")).toBe("Origin");
      expect(response.headers.get("strict-transport-security")).toContain("preload");
    });

    it("rechaza y registra el preflight de un origen fuera de la allowlist", () => {
      vi.stubEnv("CORS_ALLOWED_ORIGINS", allowed);
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = preflight("https://atacante.example");
      expect(response.status).toBe(403);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect(JSON.parse(String(log.mock.calls[0]?.[0])).reason).toBe("cors_origin_rejected");
    });

    it("nunca responde con comodín y sin allowlist solo admite el mismo origen", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
      vi.stubEnv("CORS_ALLOWED_ORIGINS", "");
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(preflight(allowed).status).toBe(403);

      const read = proxy(
        new NextRequest("http://localhost:3000/api/v1/health", {
          headers: { host: "localhost:3000", origin: "https://otro.example" },
        }),
      );
      expect(read.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("añade cabeceras CORS y deja pasar mutaciones de un origen de la allowlist", () => {
      vi.stubEnv("CORS_ALLOWED_ORIGINS", allowed);
      const response = proxy(
        new NextRequest("http://localhost:3000/api/v1/shipments/claim", {
          method: "POST",
          headers: { host: "localhost:3000", origin: allowed, "sec-fetch-site": "cross-site" },
        }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe(allowed);
      expect(response.headers.get("vary")).toBe("Origin");
    });

    it("una allowlist inválida cae al mismo origen", () => {
      vi.stubEnv("CORS_ALLOWED_ORIGINS", "*");
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(preflight("https://cualquiera.example").status).toBe(403);
    });
  });

  it("pide no indexar fuera de producción", () => {
    vi.stubEnv("APP_ENV", "preview");
    expect(proxy(new NextRequest("http://localhost/")).headers.get("x-robots-tag")).toBe(
      "noindex, nofollow",
    );
    vi.stubEnv("APP_ENV", "production");
    expect(proxy(new NextRequest("http://localhost/")).headers.get("x-robots-tag")).toBeNull();
  });
});
