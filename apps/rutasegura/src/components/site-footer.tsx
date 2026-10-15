import Link from "next/link";
import { FooterTrack } from "./footer-track";
import { RouteLine } from "./route-line";
import styles from "./site-footer.module.css";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Envíos",
    links: [
      { href: "/rastreo", label: "Rastrear una guía" },
      { href: "/ayuda#estados", label: "Estados de un envío" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { href: "/portal", label: "Mis envíos" },
      { href: "/ingresar", label: "Ingresar" },
      { href: "/registro", label: "Crear cuenta" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { href: "/ayuda", label: "Ayuda" },
      { href: "/ayuda#preguntas", label: "Preguntas" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/ayuda#privacidad", label: "Privacidad" },
      { href: "/ayuda#terminos", label: "Términos de uso" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <h2 className={styles.question}>¿Tienes una guía a la mano?</h2>
          <FooterTrack />
        </div>

        <nav className={styles.columns} aria-label="Pie de página">
          {COLUMNS.map((column) => (
            <div key={column.title} className={styles.column}>
              <p className={styles.columnTitle}>{column.title}</p>
              <ul className={styles.columnLinks}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.base}>
          <p>© {year} RutaSegura</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- es JSON de la API, no una página */}
          <a href="/api/v1/health" className={styles.health}>
            <span className={styles.healthDot} aria-hidden="true" />
            Estado del servicio
          </a>
        </div>
      </div>

      <div className={styles.mark} aria-hidden="true">
        <RouteLine variant="footer" />
        <span className={styles.markText}>RutaSegura</span>
      </div>
    </footer>
  );
}
