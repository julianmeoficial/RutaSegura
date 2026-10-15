"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { IconArrowRight } from "./icons";
import styles from "./site-footer.module.css";

/** Clave con la que el rastreo recoge la guía escrita en el pie. Nunca viaja en la URL. */
export const FOOTER_GUIDE_KEY = "rs:guide";
export const FOOTER_GUIDE_EVENT = "rs:guide";

export function FooterTrack() {
  const router = useRouter();
  const pathname = usePathname();
  const [guide, setGuide] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = guide.trim().toUpperCase();
    try {
      sessionStorage.setItem(FOOTER_GUIDE_KEY, value);
    } catch {
      // Sin almacenamiento (modo privado estricto): el rastreo abre vacío.
    }
    setGuide("");
    if (pathname === "/rastreo") {
      window.dispatchEvent(new Event(FOOTER_GUIDE_EVENT));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/rastreo");
    }
  }

  return (
    <form className={styles.track} onSubmit={onSubmit} aria-label="Rastrear desde el pie de página">
      <label htmlFor="footer-guide" className={styles.trackLabel}>
        Tu guía
      </label>
      <div className={styles.trackPill}>
        <input
          id="footer-guide"
          className={styles.trackInput}
          name="guide"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="RS0000000000"
          value={guide}
          onChange={(event) => setGuide(event.target.value.toUpperCase())}
        />
        <button type="submit" className={styles.trackButton}>
          Rastrear
          <IconArrowRight size={18} />
        </button>
      </div>
      <p className={styles.trackHint}>
        Te pediremos los 4 dígitos del teléfono en el siguiente paso.
      </p>
    </form>
  );
}
