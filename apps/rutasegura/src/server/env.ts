import "server-only";
import { z } from "zod";

const PLACEHOLDER_PATTERN = /replace|change_me|example/i;

const secret = z.string().min(32, "debe tener al menos 32 caracteres");
const positiveInt = z.coerce.number().int().positive();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["development", "preview", "production"]).default("development"),
    NEXT_PUBLIC_APP_URL: z.url(),

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

    STORAGE_ENDPOINT: z.url().optional(),
    STORAGE_REGION: z.string().optional(),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_ACCESS_KEY_ID: z.string().optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
    SIGNED_URL_TTL_SECONDS: positiveInt.max(300).default(60),

    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((env, ctx) => {
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
  });

export type Env = z.infer<typeof envSchema>;

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
  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
