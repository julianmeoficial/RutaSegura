"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-header.module.css";

const LINKS = [
  { href: "/rastreo", label: "Rastreo Seguro", match: (path: string) => path === "/rastreo" },
  {
    href: "/portal",
    label: "Portal Cliente",
    match: (path: string) =>
      path.startsWith("/portal") && !path.startsWith("/portal/agenda") && !path.endsWith("/agenda"),
  },
  {
    href: "/portal/agenda",
    label: "Agenda",
    match: (path: string) => path.startsWith("/portal/agenda") || path.endsWith("/agenda"),
  },
  { href: "/estados", label: "Estados y Errores", match: (path: string) => path === "/estados" },
];

export function MainNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className={styles.nav} aria-label="Secciones">
      <ul className={styles.tabs}>
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={styles.tab}
              aria-current={link.match(pathname) ? "page" : undefined}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
