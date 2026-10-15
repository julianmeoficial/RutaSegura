import type { ReactNode } from "react";
import { cx } from "./ui";
import styles from "./status-screen.module.css";

/** Ruta interrumpida: el trazo no llega al destino. */
function BrokenRoute() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 600 160"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16 120 C 140 120, 170 30, 300 44 S 430 130, 470 96" className={styles.path} />
      <circle cx="16" cy="120" r="10" className={styles.start} />
      <circle cx="560" cy="60" r="12" className={styles.end} />
    </svg>
  );
}

export function StatusScreen({
  kind,
  title,
  children,
  actions,
  embedded = false,
}: {
  kind: "missing" | "error";
  title: string;
  children: ReactNode;
  actions: ReactNode;
  /** Dentro de un layout que ya tiene su propio `<main>`. */
  embedded?: boolean;
}) {
  const Tag = embedded ? "div" : "main";
  return (
    <Tag className={cx(styles.screen, embedded && styles.embedded)}>
      <div className={styles.band} data-kind={kind}>
        <p className={styles.code} aria-hidden="true">
          {kind === "missing" ? "Fuera de ruta" : "Desvío"}
        </p>
        <BrokenRoute />
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>{actions}</div>
      </div>
    </Tag>
  );
}
