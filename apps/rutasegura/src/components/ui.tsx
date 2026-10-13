import Link from "next/link";
import type { ButtonHTMLAttributes, FormEvent, InputHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Page({ children }: { children: ReactNode }) {
  return <main className={styles.page}>{children}</main>;
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <header className={styles.intro}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={styles.title}>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
    </header>
  );
}

export function Card({
  children,
  tone = "default",
  labelledBy,
  as: Tag = "section",
}: {
  children: ReactNode;
  tone?: "default" | "info";
  labelledBy?: string;
  as?: "section" | "article" | "div";
}) {
  return (
    <Tag
      className={cx(styles.card, tone === "info" && styles.cardInfo)}
      aria-labelledby={labelledBy}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className={styles.cardHeader}>{children}</div>;
}

export function CardTitle({
  children,
  id,
  level = 2,
}: {
  children: ReactNode;
  id?: string;
  level?: 2 | 3;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id} className={styles.cardTitle}>
      {children}
    </Tag>
  );
}

type Variant = "primary" | "secondary" | "soft" | "danger";

const VARIANT_CLASS: Record<Variant, string | undefined> = {
  primary: styles.primary,
  secondary: styles.secondary,
  soft: styles.soft,
  danger: styles.danger,
};

export function Button({
  variant = "primary",
  block = false,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  return (
    <button
      type={type}
      className={cx(styles.button, VARIANT_CLASS[variant], block && styles.block, className)}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  block = false,
  children,
}: {
  href: string;
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(styles.button, VARIANT_CLASS[variant], block && styles.block)}>
      {children}
    </Link>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASS: Record<Tone, string | undefined> = {
  success: styles.success,
  warning: styles.warning,
  danger: styles.dangerTone,
  neutral: styles.neutral,
  info: styles.info,
};

export function Chip({
  tone,
  children,
  dot = true,
}: {
  tone: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={cx(styles.chip, TONE_CLASS[tone], !dot && styles.chipPlain)}>{children}</span>
  );
}

export function Alert({
  tone = "info",
  children,
  live = false,
}: {
  tone?: "info" | "error" | "warning" | "success";
  children: ReactNode;
  /** Anuncia el cambio a lectores de pantalla. */
  live?: boolean;
}) {
  return (
    <div
      className={cx(
        styles.alert,
        tone === "error" && styles.alertError,
        tone === "warning" && styles.alertWarning,
        tone === "success" && styles.alertSuccess,
      )}
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
    >
      {children}
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
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

export type TimelineItem = { key: string; title: string; meta: string; pending?: boolean };

export function Timeline({ items, label }: { items: TimelineItem[]; label: string }) {
  return (
    <ol className={styles.timeline} aria-label={label}>
      {items.map((item) => (
        <li
          key={item.key}
          className={cx(styles.timelineItem, item.pending && styles.timelinePending)}
        >
          <span className={styles.timelineDot} aria-hidden="true" />
          <div>
            <p className={styles.timelineTitle}>{item.title}</p>
            <p className={styles.timelineMeta}>{item.meta}</p>
          </div>
        </li>
      ))}
    </ol>
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
      <CardTitle level={3}>{title}</CardTitle>
      <p className={styles.muted}>{description}</p>
      {action}
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className={styles.muted}>{children}</p>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className={styles.mono}>{children}</span>;
}

export function Grid({ children, columns = 1 }: { children: ReactNode; columns?: 1 | 2 | 3 }) {
  return (
    <div
      className={cx(
        styles.grid,
        columns === 2 && styles.gridTwo,
        columns === 3 && styles.gridThree,
      )}
    >
      {children}
    </div>
  );
}

export function Form({
  children,
  onSubmit,
  label,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  label: string;
}) {
  return (
    <form className={styles.form} onSubmit={onSubmit} aria-label={label} noValidate>
      {children}
    </form>
  );
}
