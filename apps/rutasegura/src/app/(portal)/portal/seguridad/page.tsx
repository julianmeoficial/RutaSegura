import type { Metadata } from "next";
import { PageIntro, Section } from "@/components/ui";
import { LogoutButton } from "@/features/portal/logout-button";
import styles from "@/features/portal/portal.module.css";
import { requirePortalUser } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "Seguridad" };

const TIPS = [
  {
    title: "Tu sesión se cierra sola",
    text: "Si dejas de usar RutaSegura por un rato, te pediremos entrar de nuevo. Como máximo, una sesión dura 8 horas.",
  },
  {
    title: "Bloqueo ante intentos fallidos",
    text: "Si alguien escribe mal tu contraseña 5 veces seguidas, pausamos el acceso unos minutos.",
  },
  {
    title: "Solo tú ves tus envíos",
    text: "Nadie más puede ver tus envíos ni tus documentos, aunque conozca la dirección de la página.",
  },
];

export default async function SecurityPage() {
  const user = await requirePortalUser("/portal/seguridad");

  return (
    <>
      <PageIntro
        eyebrow="Seguridad"
        title="Tu cuenta, protegida"
        description="Tu sesión y cómo cuidamos tu cuenta."
      />
      <Section
        id="session-title"
        title="Sesión actual"
        description="Si usas un equipo compartido, cierra la sesión al terminar."
        className={styles.session}
      >
        <dl className={styles.dl}>
          <dt>Correo</dt>
          <dd>{user.email}</dd>
        </dl>
        <div>
          <LogoutButton variant="danger" />
        </div>
      </Section>

      <ol className={styles.tips} aria-label="Cómo protegemos tu cuenta">
        {TIPS.map((tip, index) => (
          <li key={tip.title} className={styles.tip}>
            <span className={styles.tipNumber} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className={styles.tipTitle}>{tip.title}</p>
            <p className={styles.tipText}>{tip.text}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
