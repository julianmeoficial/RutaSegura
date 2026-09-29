import { describe, expect, it } from "vitest";
import { corsHeaders, isAllowedOrigin, parseAllowedOrigins, preflightHeaders } from "./cors";

const APP_URL = "http://localhost:3000";

describe("parseAllowedOrigins", () => {
  it("por defecto permite solo el origen de la app", () => {
    expect(parseAllowedOrigins(undefined, APP_URL, { requireHttps: false })).toEqual([
      "http://localhost:3000",
    ]);
    expect(parseAllowedOrigins("", APP_URL, { requireHttps: false })).toEqual([
      "http://localhost:3000",
    ]);
  });

  it("normaliza y deduplica orígenes", () => {
    const origins = parseAllowedOrigins(
      " https://portal.example.org/ ,http://localhost:3000",
      APP_URL,
      { requireHttps: false },
    );
    expect(origins).toEqual(["http://localhost:3000", "https://portal.example.org"]);
  });

  it("rechaza comodines, rutas, protocolos no web y URLs inválidas", () => {
    const opts = { requireHttps: false };
    expect(() => parseAllowedOrigins("*", APP_URL, opts)).toThrow(/comodines/);
    expect(() => parseAllowedOrigins("https://*.example.org", APP_URL, opts)).toThrow(/comodines/);
    expect(() => parseAllowedOrigins("https://a.example.org/api", APP_URL, opts)).toThrow(/ruta/);
    expect(() => parseAllowedOrigins("https://a.example.org?x=1", APP_URL, opts)).toThrow(/ruta/);
    expect(() => parseAllowedOrigins("ftp://a.example.org", APP_URL, opts)).toThrow(/http/);
    expect(() => parseAllowedOrigins("no-es-url", APP_URL, opts)).toThrow(/inválida/);
  });

  it("exige https cuando se pide", () => {
    expect(() =>
      parseAllowedOrigins("http://a.example.org", "https://app.example.org", {
        requireHttps: true,
      }),
    ).toThrow(/https/);
  });
});

describe("isAllowedOrigin", () => {
  const allowlist = ["https://app.example.org"];

  it("compara el origen exacto", () => {
    expect(isAllowedOrigin("https://app.example.org", allowlist)).toBe(true);
    expect(isAllowedOrigin("https://app.example.org.evil.test", allowlist)).toBe(false);
    expect(isAllowedOrigin("http://app.example.org", allowlist)).toBe(false);
    expect(isAllowedOrigin("null", allowlist)).toBe(false);
    expect(isAllowedOrigin(null, allowlist)).toBe(false);
  });
});

describe("cabeceras CORS", () => {
  it("devuelven el origen exacto, nunca *, y varían por Origin", () => {
    const headers = corsHeaders("https://app.example.org");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://app.example.org");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(headers.Vary).toBe("Origin");
  });

  it("el preflight declara métodos, cabeceras y caché acotados", () => {
    const headers = preflightHeaders("https://app.example.org");
    expect(headers["Access-Control-Allow-Methods"]).toBe("GET, POST, PUT, PATCH, DELETE");
    expect(headers["Access-Control-Allow-Headers"]).toBe("Content-Type");
    expect(headers["Access-Control-Max-Age"]).toBe("600");
    expect(Object.values(headers)).not.toContain("*");
  });
});
