import "server-only";
import { z } from "zod";
import { parseAllowedOrigins } from "@/lib/cors";

const PLACEHOLDER_PATTERN = /replace|change_me|example/i;

const secret = z.string().min(32, "debe tener al menos 32 caracteres");
const positiveInt = z.coerce.number().int().positive();

const STORAGE_KEYS = [
  "STORAGE_ENDPOINT",
  "STORAGE_REGION",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
] as const;

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["development", "preview", "production"]).default("development"),
    NEXT_PUBLIC_APP_URL: z.url(),
    /** Orígenes extra con acceso CORS a la API, separados por comas. */
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    /**
     * Si es true, `clientIp` confía en X-Forwarded-For / X-Real-IP (Vercel, nginx).
     * Si se omite: true en production/preview, false en development.
     */
    TRUST_PROXY: z.preprocess((value) => {
      if (value === undefined || value === "") return undefined;
      if (value === true || value === "true" || value === "1") return true;
      if (value === false || value === "false" || value === "0") return false;
      return value;
    }, z.boolean().optional()),

    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }),

    SESSION_SECRET: secret,
    CSRF_SECRET: secret,
    HMAC_SECRET: secret,
    ACCESS_TOKEN_TTL_SECONDS: positiveInt.max(3600).default(900),
    SESSION_TTL_SECONDS: positiveInt.default(28_800),

    LOCKOUT_THRESHOLD: positiveInt.default(5),
    LOCKOUT_BASE_SECONDS: positiveInt.default(300),
    LOCKOUT_MAX_SECONDS: positiveInt.default(3600),

    LOGIN_RATE_LIMIT_IP_MAX: positiveInt.default(10),
    LOGIN_RATE_LIMIT_EMAIL_MAX: positiveInt.default(10),
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: positiveInt.default(900),
    REGISTER_RATE_LIMIT_MAX: positiveInt.default(5),
    REGISTER_RATE_LIMIT_WINDOW_SECONDS: positiveInt.default(3600),
    TRACKING_RATE_LIMIT_MAX: positiveInt.default(5),
    TRACKING_RATE_LIMIT_WINDOW_SECONDS: positiveInt.default(900),
    SHIPMENTS_RATE_LIMIT_MAX: positiveInt.default(60),
    SHIPMENTS_RATE_LIMIT_WINDOW_SECONDS: positiveInt.default(60),
    NOTIFICATIONS_RATE_LIMIT_MAX: positiveInt.default(60),
    NOTIFICATIONS_RATE_LIMIT_WINDOW_SECONDS: positiveInt.default(60),

    STORAGE_ENDPOINT: z.url({ protocol: /^https?$/ }).optional(),
    /** Host con el que se firman las URLs: el que abre el navegador. */
    STORAGE_PUBLIC_ENDPOINT: z.url({ protocol: /^https?$/ }).optional(),
    STORAGE_REGION: z.string().min(1).optional(),
    STORAGE_BUCKET: z.string().min(1).optional(),
    STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    SIGNED_URL_TTL_SECONDS: positiveInt.max(300).default(60),
    DOCUMENTS_RATE_LIMIT_MAX: positiveInt.default(30),
    DOCUMENTS_RATE_LIMIT_WINDOW_SECONDS: positiveInt.default(60),

    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((env, ctx) => {
    try {
      parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS, env.NEXT_PUBLIC_APP_URL, {
        requireHttps: env.APP_ENV === "production",
      });
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["CORS_ALLOWED_ORIGINS"],
        message: error instanceof Error ? error.message : "inválida",
      });
    }

    if (env.APP_ENV !== "production") return;

    for (const key of ["SESSION_SECRET", "CSRF_SECRET", "HMAC_SECRET"] as const) {
      if (PLACEHOLDER_PATTERN.test(env[key])) {
        ctx.addIssue({ code: "custom", path: [key], message: "usa un valor de ejemplo" });
      }
    }
    if (!env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_APP_URL"],
        message: "debe usar https en producción",
      });
    }

    for (const key of STORAGE_KEYS) {
      const value = env[key];
      if (!value) {
        ctx.addIssue({ code: "custom", path: [key], message: "es obligatoria en producción" });
      } else if (PLACEHOLDER_PATTERN.test(value)) {
        ctx.addIssue({ code: "custom", path: [key], message: "usa un valor de ejemplo" });
      }
    }
    const publicEndpoint = env.STORAGE_PUBLIC_ENDPOINT ?? env.STORAGE_ENDPOINT;
    if (publicEndpoint && !publicEndpoint.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_PUBLIC_ENDPOINT"],
        message: "debe usar https en producción",
      });
    }
  });

export type Env = Omit<z.infer<typeof envSchema>, "TRUST_PROXY"> & { TRUST_PROXY: boolean };

/**
 * Valida las variables de entorno. El mensaje de error nombra las claves
 * inválidas y nunca incluye sus valores.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuración de entorno inválida. ${details}`);
  }
  const env = result.data;
  return {
    ...env,
    TRUST_PROXY:
      env.TRUST_PROXY ?? (env.APP_ENV === "production" || env.APP_ENV === "preview"),
  };
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
