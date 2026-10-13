import type { Metadata } from "next";
import { Alert, Card, CardTitle, Muted, PageIntro } from "@/components/ui";
import { LogoutButton } from "@/features/portal/logout-button";
import styles from "@/features/portal/portal.module.css";
import { requirePortalUser } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "Seguridad" };

const ROLE_LABEL = { customer: "Cliente", operator: "Operador", admin: "Administrador" } as const;

export default async function SecurityPage() {
  const user = await requirePortalUser("/portal/seguridad");

  return (
    <>
      <PageIntro
        eyebrow="RF-14 · A07"
        title="Seguridad de tu cuenta"
        description="Cómo protegemos tu sesión y qué puedes hacer desde aquí."
      />
      <Card labelledBy="session-title">
        <CardTitle id="session-title">Sesión actual</CardTitle>
        <dl className={styles.dl}>
          <dt>Nombre</dt>
          <dd>{user.fullName}</dd>
          <dt>Correo</dt>
          <dd>{user.email}</dd>
          <dt>Rol</dt>
          <dd>{ROLE_LABEL[user.role]}</dd>
        </dl>
        <Muted>
          El acceso dura 15 minutos y se renueva solo mientras uses el portal, hasta 8 horas. Las
          cookies son HttpOnly: ni esta página ni un script inyectado pueden leerlas.
        </Muted>
        <Alert>
          Cerrar sesión revoca la sesión en el servidor: el token deja de servir de inmediato,
          aunque no haya vencido.
        </Alert>
        <div>
          <LogoutButton variant="danger" />
        </div>
      </Card>
    </>
  );
}
