import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

afterEach(() => {
  vi.unstubAllEnvs();
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

  it("emite HSTS solo sobre HTTPS", () => {
    const http = proxy(new NextRequest("http://localhost:3000/"));
    const https = proxy(
      new NextRequest("http://rutasegura.test/", { headers: { "x-forwarded-proto": "https" } }),
    );
    expect(http.headers.get("strict-transport-security")).toBeNull();
    expect(https.headers.get("strict-transport-security")).toContain("preload");
  });

  it("rechaza mutaciones de la API desde otro origen", async () => {
    const response = proxy(
      new NextRequest("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "https://atacante.example" },
      }),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).error.code).toBe("forbidden");
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

  it("pide no indexar fuera de producción", () => {
    vi.stubEnv("APP_ENV", "preview");
    expect(proxy(new NextRequest("http://localhost/")).headers.get("x-robots-tag")).toBe(
      "noindex, nofollow",
    );
    vi.stubEnv("APP_ENV", "production");
    expect(proxy(new NextRequest("http://localhost/")).headers.get("x-robots-tag")).toBeNull();
  });
});
