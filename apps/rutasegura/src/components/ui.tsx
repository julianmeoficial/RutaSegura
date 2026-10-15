import Link from "next/link";
import type { ButtonHTMLAttributes, FormEvent, InputHTMLAttributes, ReactNode } from "react";
import { IconAlert, IconCheckCircle, IconInfo } from "./icons";
import styles from "./ui.module.css";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Wordmark de la marca con el punto naranja de la ruta. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx(styles.wordmark, className)}>
      RutaSegura
      <span className={styles.wordmarkDot} aria-hidden="true" />
    </span>
  );
}

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main className={cx(styles.page, wide && styles.pageWide)}>{children}</main>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Columna estrecha a la derecha (8/4), por ejemplo un número grande. */
  aside?: ReactNode;
}) {
  return (
    <header className={cx(styles.intro, aside ? styles.introSplit : null)}>
      <div className={styles.introText}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
        {actions ? <div className={styles.introActions}>{actions}</div> : null}
      </div>
      {aside ? <div className={styles.introAside}>{aside}</div> : null}
    </header>
  );
}

/** Bloque de contenido: se separa con espacio y tipografía, sin caja. */
export function Section({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx(styles.section, className)} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <div>
          <h2 id={id} className={styles.sectionTitle}>
            {title}
          </h2>
          {description ? <p className={styles.sectionText}>{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

type Variant = "primary" | "secondary" | "soft" | "danger" | "ghost" | "ink";

const VARIANT_CLASS: Record<Variant, string | undefined> = {
  primary: styles.primary,
  secondary: styles.secondary,
  soft: styles.secondary,
  danger: styles.danger,
  ghost: styles.ghost,
  ink: styles.ink,
};

/** Tres puntos que laten dentro de un botón ocupado. Nunca va solo. */
export function Spinner() {
  return (
    <span className={styles.dots} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function Button({
  variant = "primary",
  block = false,
  loading = false,
  className,
  type = "button",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  block?: boolean;
  /** Muestra un indicador de carga junto al texto. */
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      className={cx(styles.button, VARIANT_CLASS[variant], block && styles.block, className)}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  block = false,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  block?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(styles.button, VARIANT_CLASS[variant], block && styles.block, className)}
    >
      {children}
    </Link>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export type Tone = "success" | "warning" | "danger" | "neutral" | "route";

const TONE_CLASS: Record<Tone, string | undefined> = {
  success: styles.toneOk,
  warning: styles.toneWarn,
  danger: styles.toneBad,
  neutral: styles.toneNeutral,
  route: styles.toneRoute,
};

/** Estado como punto y palabra. Sin punto es una etiqueta sobre arena. */
export function Chip({
  tone,
  children,
  dot = true,
}: {
  tone: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  if (!dot) return <span className={cx(styles.tag, TONE_CLASS[tone])}>{children}</span>;
  return (
    <span className={cx(styles.status, TONE_CLASS[tone])}>
      <span className={styles.statusDot} aria-hidden="true" />
      {children}
    </span>
  );
}

type AlertTone = "info" | "error" | "warning" | "success";

const ALERT_ICON: Record<AlertTone, ReactNode> = {
  info: <IconInfo />,
  error: <IconAlert />,
  warning: <IconAlert />,
  success: <IconCheckCircle />,
};

const ALERT_CLASS: Record<AlertTone, string | undefined> = {
  info: undefined,
  error: styles.alertError,
  warning: styles.alertWarning,
  success: styles.alertSuccess,
};

export function Alert({
  tone = "info",
  children,
  live = false,
}: {
  tone?: AlertTone;
  children: ReactNode;
  /** Anuncia el cambio a lectores de pantalla. */
  live?: boolean;
}) {
  return (
    <div
      className={cx(styles.alert, ALERT_CLASS[tone])}
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
    >
      <span className={styles.alertIcon}>{ALERT_ICON[tone]}</span>
      <div className={styles.alertBody}>{children}</div>
    </div>
  );
}

export type BandTone = "sand" | "ink" | "ok" | "warn" | "bad";

const BAND_CLASS: Record<BandTone, string | undefined> = {
  sand: undefined,
  ink: styles.bandInk,
  ok: styles.bandOk,
  warn: styles.bandWarn,
  bad: styles.bandBad,
};

/** Estado diseñado (vacío, 401, 403, 429, expirado, red): banda de color con titular y salida. */
export function StatusBand({
  tone = "sand",
  title,
  children,
  action,
  live,
  headingLevel = 2,
}: {
  tone?: BandTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  live?: "polite" | "assertive";
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className={cx(styles.band, BAND_CLASS[tone])}
      role={live === "assertive" ? "alert" : live ? "status" : undefined}
    >
      <Heading className={styles.bandTitle}>{title}</Heading>
      {children ? <div className={styles.bandText}>{children}</div> : null}
      {action ? <div className={styles.bandAction}>{action}</div> : null}
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  trailing,
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Control junto al campo, por ejemplo mostrar la contraseña. */
  trailing?: ReactNode;
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          className={cx(styles.input, trailing ? styles.inputWithTrailing : null, className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...input}
        />
        {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type TimelineItem = {
  key: string;
  title: string;
  meta: string;
  detail?: string;
  pending?: boolean;
  tone?: "default" | "danger" | "success";
};

/** Lista cronológica sobre una línea de 3 px; el primer elemento puede ser el actual. */
export function Timeline({
  items,
  label,
  highlightFirst = false,
}: {
  items: TimelineItem[];
  label: string;
  highlightFirst?: boolean;
}) {
  return (
    <ol className={styles.timeline} aria-label={label}>
      {items.map((item, index) => (
        <li
          key={item.key}
          className={cx(
            styles.timelineItem,
            item.pending && styles.timelinePending,
            highlightFirst && index === 0 && !item.pending && styles.timelineCurrent,
            item.tone === "danger" && styles.timelineDanger,
            item.tone === "success" && styles.timelineSuccess,
          )}
        >
          <span className={styles.timelineDot} aria-hidden="true" />
          <div className={styles.timelineBody}>
            <p className={styles.timelineTitle}>{item.title}</p>
            {item.detail ? <p className={styles.timelineDetail}>{item.detail}</p> : null}
            <p className={styles.timelineMeta}>{item.meta}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Ruta que no llega a su destino: la ilustración de los estados vacíos. */
function IncompleteRoute() {
  return (
    <svg
      className={styles.emptyArt}
      viewBox="0 0 240 64"
      width="240"
      height="64"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 44 C 60 44, 70 14, 120 18 S 170 50, 200 34" className={styles.emptyPath} />
      <circle cx="12" cy="44" r="7" className={styles.emptyStart} />
      <circle cx="228" cy="26" r="7" className={styles.emptyEnd} />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <IncompleteRoute />
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyText}>{description}</p>
      {action}
    </div>
  );
}

/** Esqueleto de carga con formas pill que laten. */
export function Skeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div className={styles.skeleton} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

export function Muted({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return <p className={cx(styles.muted, small && styles.small)}>{children}</p>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className={styles.mono}>{children}</span>;
}

export function Form({
  children,
  onSubmit,
  label,
  className,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  label: string;
  className?: string;
}) {
  return (
    <form className={cx(styles.form, className)} onSubmit={onSubmit} aria-label={label} noValidate>
      {children}
    </form>
  );
}
