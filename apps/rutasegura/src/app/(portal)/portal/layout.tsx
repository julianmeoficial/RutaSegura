import type { ReactNode } from "react";
import { Logo } from "@/components/site-header";
import { Card, Page } from "@/components/ui";
import { LogoutButton } from "@/features/portal/logout-button";
import { PortalNav } from "@/features/portal/portal-nav";
import styles from "@/features/portal/portal.module.css";
import { getCurrentUser } from "@/server/auth/current-user";

const ROLE_LABEL = { customer: "Cliente", operator: "Operador", admin: "Administrador" } as const;

/**
 * Cabecera de la cuenta. Cada página exige la sesión con `requirePortalUser`
 * y redirige al login con su propia ruta en `next`.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <Page>
      {user ? (
        <Card as="div">
          <div className={styles.accountTop}>
            <div className={styles.who}>
              <Logo gradientId="rs-logo-account" />
              <div>
                <p className={styles.whoName}>Mi cuenta</p>
                <p className={styles.whoMeta}>
                  {user.fullName} · {ROLE_LABEL[user.role]}
                </p>
              </div>
            </div>
            <LogoutButton />
          </div>
          <PortalNav />
        </Card>
      ) : null}
      {children}
    </Page>
  );
}
