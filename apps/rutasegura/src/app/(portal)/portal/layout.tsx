import type { ReactNode } from "react";
import { initials } from "@/components/site-header";
import { Page } from "@/components/ui";
import { LogoutButton } from "@/features/portal/logout-button";
import { PortalNav } from "@/features/portal/portal-nav";
import styles from "@/features/portal/portal.module.css";
import { getCurrentUser } from "@/server/auth/current-user";

/**
 * Cabecera de la cuenta. Cada página exige la sesión con `requirePortalUser`
 * y redirige al login con su propia ruta en `next`.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <Page wide>
      {user ? (
        <div className={styles.account}>
          <PortalNav />
          <div className={styles.who}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(user.fullName)}
            </span>
            <p className={styles.whoName}>{user.fullName}</p>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      ) : null}
      {children}
    </Page>
  );
}
