import type { ReactNode } from "react";
import { RouteLine } from "@/components/route-line";
import styles from "./auth.module.css";

const BENEFITS = [
  "Todos tus envíos en una sola lista",
  "Elige el día y la franja de entrega",
  "Guías, facturas y soportes a mano",
];

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className={styles.shell}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </header>
        {children}
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
      <aside className={styles.aside} aria-hidden="true">
        <RouteLine variant="hero" className={styles.asideRoute} />
        <p className={styles.asideTitle}>Tus paquetes, siempre a la vista.</p>
        <ul className={styles.benefits}>
          {BENEFITS.map((benefit, index) => (
            <li key={benefit}>
              <span className={styles.benefitNumber}>{String(index + 1).padStart(2, "0")}</span>
              {benefit}
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
