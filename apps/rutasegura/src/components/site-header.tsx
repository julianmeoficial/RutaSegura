import Link from "next/link";
import { MainNav } from "./main-nav";
import styles from "./site-header.module.css";

export function Logo({ gradientId = "rs-logo" }: { gradientId?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#1d63b4" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="7" fill={`url(#${gradientId})`} />
      <path
        d="M14 6.5 20 9v4.6c0 3.7-2.5 6.6-6 7.9-3.5-1.3-6-4.2-6-7.9V9l6-2.5Z"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m11 14 2.2 2.2L17.2 12" fill="none" stroke="#fff" strokeWidth="1.8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" fill="#1d63b4" />
      <path
        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        fill="none"
        stroke="#111418"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <Link href="/rastreo" className={styles.brand}>
          <Logo />
          RutaSegura
        </Link>
        <Link href="/portal" className={styles.account} aria-label="Mi cuenta">
          <LockIcon />
        </Link>
      </div>
      <MainNav />
    </header>
  );
}
