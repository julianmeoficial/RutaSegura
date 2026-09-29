import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const validLocal = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://rutasegura:local_only_change_me@localhost:5432/rutasegura",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "replace_with_at_least_32_random_bytes",
  CSRF_SECRET: "replace_with_at_least_32_random_bytes",
  HMAC_SECRET: "replace_with_at_least_32_random_bytes",
};

const strongSecret = "q3Zp9vN1xT7sK2mB8wLc4RfYh6JdGa0E";

describe("parseEnv", () => {
  it("acepta la configuración local de ejemplo y aplica valores por defecto", () => {
    const env = parseEnv(validLocal);
    expect(env.APP_ENV).toBe("development");
    expect(env.SIGNED_URL_TTL_SECONDS).toBe(60);
    expect(env.TRACKING_RATE_LIMIT_MAX).toBe(5);
  });

  it("rechaza secretos cortos sin revelar su valor", () => {
    expect(() => parseEnv({ ...validLocal, SESSION_SECRET: "corto" })).toThrow(/SESSION_SECRET/);
    expect(() => parseEnv({ ...validLocal, SESSION_SECRET: "corto" })).not.toThrow(/corto/);
  });

  it("rechaza protocolos de base de datos inesperados", () => {
    expect(() => parseEnv({ ...validLocal, DATABASE_URL: "mysql://localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("en producción rechaza secretos de ejemplo y URLs sin https", () => {
    expect(() => parseEnv({ ...validLocal, APP_ENV: "production" })).toThrow(
      /SESSION_SECRET.*CSRF_SECRET.*HMAC_SECRET.*NEXT_PUBLIC_APP_URL/,
    );
  });

  it("en producción acepta secretos reales sobre https", () => {
    const env = parseEnv({
      ...validLocal,
      APP_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://rutasegura.example.org",
      SESSION_SECRET: strongSecret,
      CSRF_SECRET: strongSecret,
      HMAC_SECRET: strongSecret,
    });
    expect(env.APP_ENV).toBe("production");
  });

  it("aplica los valores por defecto de sesión, bloqueo y rate limit", () => {
    const env = parseEnv(validLocal);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.LOCKOUT_THRESHOLD).toBe(5);
    expect(env.LOGIN_RATE_LIMIT_IP_MAX).toBe(10);
  });

  it("no permite access tokens de más de una hora", () => {
    expect(() => parseEnv({ ...validLocal, ACCESS_TOKEN_TTL_SECONDS: "7200" })).toThrow(
      /ACCESS_TOKEN_TTL_SECONDS/,
    );
  });

  it("acepta una allowlist CORS de orígenes exactos", () => {
    const env = parseEnv({
      ...validLocal,
      CORS_ALLOWED_ORIGINS: "http://localhost:5173, https://portal.rutasegura.example.org",
    });
    expect(env.CORS_ALLOWED_ORIGINS).toContain("localhost:5173");
  });

  it("rechaza comodines y rutas en la allowlist CORS sin revelar el valor", () => {
    expect(() => parseEnv({ ...validLocal, CORS_ALLOWED_ORIGINS: "*" })).toThrow(
      /CORS_ALLOWED_ORIGINS/,
    );
    expect(() =>
      parseEnv({ ...validLocal, CORS_ALLOWED_ORIGINS: "https://secreto.example.org/api" }),
    ).not.toThrow(/secreto/);
    expect(() =>
      parseEnv({ ...validLocal, CORS_ALLOWED_ORIGINS: "https://secreto.example.org/api" }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it("en producción exige https en la allowlist CORS", () => {
    expect(() =>
      parseEnv({
        ...validLocal,
        APP_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://rutasegura.example.org",
        SESSION_SECRET: strongSecret,
        CSRF_SECRET: strongSecret,
        HMAC_SECRET: strongSecret,
        CORS_ALLOWED_ORIGINS: "http://portal.example.org",
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it("limita la vigencia de las URLs firmadas", () => {
    expect(() => parseEnv({ ...validLocal, SIGNED_URL_TTL_SECONDS: "3600" })).toThrow(
      /SIGNED_URL_TTL_SECONDS/,
    );
  });
});
