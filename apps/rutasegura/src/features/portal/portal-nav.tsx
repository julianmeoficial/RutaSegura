"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./portal.module.css";

const TABS: { href: string; label: string; match: (p: string) => boolean }[] = [
  {
    href: "/portal",
    label: "Mis envíos",
    match: (p) => p === "/portal" || (p.startsWith("/portal/envios/") && !p.endsWith("/agenda")),
  },
  {
    href: "/portal/agenda",
    label: "Agenda",
    match: (p) => p === "/portal/agenda" || p.endsWith("/agenda"),
  },
  {
    href: "/portal/documentos",
    label: "Documentos",
    match: (p) => p === "/portal/documentos",
  },
  {
    href: "/portal/avisos",
    label: "Avisos",
    match: (p) => p === "/portal/avisos",
  },
  {
    href: "/portal/seguridad",
    label: "Seguridad",
    match: (p) => p === "/portal/seguridad",
  },
];

export function PortalNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Mi cuenta" className={styles.tabsNav}>
      <ul className={styles.tabs}>
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className={styles.tab}
              aria-current={tab.match(pathname) ? "page" : undefined}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
