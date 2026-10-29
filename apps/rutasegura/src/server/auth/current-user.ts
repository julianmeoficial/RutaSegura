import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { AuthUser } from "@rutasegura/contracts";
import { logPageAuthFailure } from "@/server/audit/security-log";
import { pageData } from "@/server/portal/page-data";
import { cookieNames } from "./cookies";
import { authenticateAccessToken, type AuthResult } from "./require-user";

async function isHttps(): Promise<boolean> {
  if (process.env.APP_ENV === "production") return true;
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");
}

/** Resultado de autenticar la cookie de acceso, memorizado por petición. */
const currentSession = cache(async (): Promise<AuthResult> => {
  const store = await cookies();
  const token = store.get(cookieNames(await isHttps()).access)?.value;
  return pageData("page:session", () => authenticateAccessToken(token));
});

/**
 * Usuario de la sesión para Server Components, con la misma verificación que
 * la API (firma, vencimiento y sesión vigente).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const result = await currentSession();
  return result.ok ? result.user : null;
}

/** Ruta lógica para el log: sin identificadores que vienen de la URL. */
export function pageRoute(nextPath: string): string {
  const [path = ""] = nextPath.split("?");
  return `page:${path.replace(/\/envios\/[^/]+/, "/envios/:id")}`;
}

/**
 * Usuario de la sesión o redirección al login con `next` interno. El login
 * intenta renovar la sesión con el refresh token antes de pedir credenciales.
 * Una visita sin cookie es normal (no hay sesión); una cookie inválida, vencida
 * o de una sesión revocada queda en el log de seguridad, como en la API.
 */
export async function requirePortalUser(nextPath: string): Promise<AuthUser> {
  const result = await currentSession();
  if (result.ok) return result.user;
  if (result.reason !== "missing_token") {
    logPageAuthFailure(await headers(), pageRoute(nextPath), result.reason);
  }
  redirect(`/ingresar?next=${encodeURIComponent(nextPath)}`);
}
