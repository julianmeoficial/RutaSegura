"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconBell, IconClose, IconMenu } from "./icons";
import { Wordmark, cx } from "./ui";
import styles from "./site-header.module.css";

type HeaderSession = { firstName: string; initials: string; unread: number } | null;

const LINKS = [
  { href: "/rastreo", label: "Rastrear", match: (p: string) => p === "/rastreo" },
  {
    href: "/portal",
    label: "Mis envíos",
    match: (p: string) => p.startsWith("/portal") && !p.endsWith("/agenda"),
  },
  {
    href: "/portal/agenda",
    label: "Agenda",
    match: (p: string) => p.startsWith("/portal") && p.endsWith("/agenda"),
  },
  { href: "/ayuda", label: "Ayuda", match: (p: string) => p === "/ayuda" },
];

/** En la portada y en Rastrear el formulario ya está a la vista: la acción pasa a crear cuenta. */
function visitorAction(pathname: string): { href: string; label: string } {
  return pathname === "/" || pathname === "/rastreo"
    ? { href: "/registro", label: "Crear cuenta" }
    : { href: "/rastreo", label: "Rastrear guía" };
}

// En el servidor useLayoutEffect avisa; el indicador solo se mide en el navegador.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function HeaderBar({ session }: { session: HeaderSession }) {
  const pathname = usePathname() ?? "";
  const [compact, setCompact] = useState(false);
  // Recuerda en qué ruta se abrió el menú: al navegar deja de coincidir y se cierra solo.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const [measured, setMeasured] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const activeIndex = LINKS.findIndex((link) => link.match(pathname));

  // La CSP bloquea atributos style, no el CSSOM: el indicador se mueve con element.style.
  const placeIndicator = useCallback(() => {
    const target = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const pill = indicator.current;
    if (!pill) return;
    if (!target) {
      pill.style.opacity = "0";
      return;
    }
    pill.style.width = `${target.offsetWidth}px`;
    pill.style.transform = `translateX(${target.offsetLeft}px)`;
    pill.style.opacity = "1";
    setMeasured(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    placeIndicator();
  }, [activeIndex, compact, placeIndicator]);

  useEffect(() => {
    const element = list.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => placeIndicator());
    observer.observe(element);
    return () => observer.disconnect();
  }, [placeIndicator]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry!.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    sheet.current?.querySelector<HTMLElement>("a, button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuPath(null);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const action = visitorAction(pathname);

  return (
    <>
      <div ref={sentinel} className={styles.sentinel} aria-hidden="true" />
      <header className={styles.header} data-compact={compact || undefined}>
        <Link href="/" className={styles.brand} aria-label="RutaSegura, inicio">
          <Wordmark />
        </Link>

        <nav className={styles.nav} aria-label="Secciones" data-measured={measured || undefined}>
          <span ref={indicator} className={styles.indicator} aria-hidden="true" />
          <ul ref={list} className={styles.links}>
            {LINKS.map((link, index) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={styles.link}
                  aria-current={index === activeIndex ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          {session ? (
            <>
              <Link
                href="/portal/avisos"
                className={styles.iconLink}
                aria-label={
                  session.unread > 0
                    ? `Avisos, ${session.unread} sin leer`
                    : "Avisos, ninguno sin leer"
                }
              >
                <IconBell />
                {session.unread > 0 ? (
                  <span className={styles.badge} aria-hidden="true">
                    {session.unread > 9 ? "9+" : session.unread}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/portal"
                className={styles.avatar}
                aria-label={`Mi cuenta, ${session.firstName}`}
              >
                {session.initials}
              </Link>
            </>
          ) : (
            <>
              <Link href="/ingresar" className={cx(styles.login, styles.secondaryLabel)}>
                Ingresar
              </Link>
              <Link href={action.href} className={cx(styles.cta, styles.desktopOnly)}>
                {action.label}
              </Link>
            </>
          )}
          <button
            ref={menuButton}
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            onClick={() => setMenuPath(menuOpen ? null : pathname)}
          >
            {menuOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
            <span>Menú</span>
          </button>
        </div>
      </header>

      <div className={styles.sheetLayer} data-open={menuOpen || undefined}>
        <button
          type="button"
          className={styles.backdrop}
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setMenuPath(null)}
        />
        <div
          ref={sheet}
          id="menu-principal"
          className={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
          inert={!menuOpen}
        >
          <nav aria-label="Menú principal">
            <ul className={styles.sheetLinks}>
              {LINKS.map((link, index) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={styles.sheetLink}
                    aria-current={index === activeIndex ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {session ? null : (
            <div className={styles.sheetActions}>
              <Link href="/registro" className={styles.sheetPrimary}>
                Crear cuenta
              </Link>
              <Link href="/ingresar" className={styles.sheetSecondary}>
                Ingresar
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
