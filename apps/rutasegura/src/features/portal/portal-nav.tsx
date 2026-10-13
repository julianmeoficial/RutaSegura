"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./portal.module.css";

const TABS = [
  {
    href: "/portal",
    label: "Mis envíos",
    match: (p: string) =>
      p === "/portal" || (p.startsWith("/portal/envios/") && !p.endsWith("/agenda")),
  },
  {
    href: "/portal/agenda",
    label: "Agenda",
    match: (p: string) => p === "/portal/agenda" || p.endsWith("/agenda"),
  },
  {
    href: "/portal/documentos",
    label: "Documentos",
    match: (p: string) => p === "/portal/documentos",
  },
  {
    href: "/portal/seguridad",
    label: "Seguridad",
    match: (p: string) => p === "/portal/seguridad",
  },
];

export function PortalNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Mi cuenta">
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
