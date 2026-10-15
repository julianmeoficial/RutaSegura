import { unstable_rethrow } from "next/navigation";
import type { AuthUser } from "@rutasegura/contracts";
import { getCurrentUser } from "@/server/auth/current-user";
import { listNotificationsForUser } from "@/server/services/notifications";
import { HeaderBar } from "./header-bar";

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function initials(fullName: string): string {
  const letters = fullName
    .split(/\s+/)
    .map((part) => part.match(/\p{L}/u)?.[0] ?? "")
    .filter(Boolean);
  return ((letters[0] ?? "") + (letters.length > 1 ? letters.at(-1)! : "")).toUpperCase() || "?";
}

/**
 * Sesión y avisos sin leer para la cabecera. Si la base no responde, la
 * cabecera se pinta como visitante: el error lo muestra la página, no ella.
 */
async function headerSession(): Promise<{ user: AuthUser; unread: number } | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const { unreadCount } = await listNotificationsForUser(user.id, 1);
    return { user, unread: unreadCount };
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function SiteHeader() {
  const session = await headerSession();
  return (
    <HeaderBar
      session={
        session
          ? {
              firstName: firstName(session.user.fullName),
              initials: initials(session.user.fullName),
              unread: session.unread,
            }
          : null
      }
    />
  );
}
