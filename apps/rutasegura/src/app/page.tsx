import type { Metadata } from "next";
import { RouteLine } from "@/components/route-line";
import { ButtonLink, cx } from "@/components/ui";
import { TrackingPanel } from "@/features/tracking/tracking-panel";
import { HowItWorks } from "./how-it-works";
import styles from "./home.module.css";

export const metadata: Metadata = { title: { absolute: "RutaSegura · Rastreo de envíos" } };

/** Envíos ficticios de la maqueta: no corresponden a ninguna cuenta. */
const MOCK_ROWS = [
  { guide: "RS-****-0412", city: "Medellín", state: "En reparto", tone: "route" },
  { guide: "RS-****-0388", city: "Cali", state: "En tránsito", tone: "neutral" },
  { guide: "RS-****-0251", city: "Bogotá", state: "Entregado", tone: "ok" },
] as const;

export default function HomePage() {
  return (
    <main className={styles.home}>
      <section className={cx(styles.hero, styles.container)} aria-labelledby="home-title">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Seguimiento de paquetes en Colombia</p>
          <h1 id="home-title" className={styles.title}>
            <span className="visually-hidden">¿Dónde va tu paquete?</span>
            <span aria-hidden="true" className={styles.titleLines}>
              <span className={styles.titleLine}>¿Dónde va</span>
              <span className={styles.titleLine}>
                <span className={styles.highlight}>tu paquete</span>?
              </span>
            </span>
          </h1>
          <p className={styles.lead}>
            Escribe la guía y los últimos 4 dígitos del teléfono de quien lo recibe. No necesitas
            cuenta.
          </p>
          <div className={styles.tracker}>
            <TrackingPanel showSample variant="hero" />
          </div>
        </div>
        <div className={styles.heroRoute}>
          <RouteLine variant="hero" from="Bogotá" to="Medellín" />
        </div>
      </section>

      <section className={cx(styles.band, styles.sandBand)} aria-labelledby="portal-title">
        <div className={styles.sandText}>
          <p className={styles.eyebrow}>Tu cuenta</p>
          <h2 id="portal-title" className={styles.h2}>
            Todos tus envíos en una lista.
          </h2>
          <p className={styles.bandLead}>
            Vincula tus guías, mira en qué va cada una y agenda la entrega sin llamar a nadie.
          </p>
          <ButtonLink href="/registro" variant="ink">
            Crear cuenta gratis
          </ButtonLink>
        </div>
        <div
          className={styles.mockup}
          role="img"
          aria-label="Vista de ejemplo del portal con tres envíos y su estado"
        >
          <p className={styles.mockTitle}>Mis envíos</p>
          <p className={styles.mockCount}>3</p>
          <ul className={styles.mockRows}>
            {MOCK_ROWS.map((row) => (
              <li key={row.guide} className={styles.mockRow}>
                <span className={styles.mockGuide}>{row.guide}</span>
                <span className={styles.mockCity}>{row.city}</span>
                <span className={styles.mockState} data-tone={row.tone}>
                  {row.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HowItWorks />

      <section className={cx(styles.band, styles.inkBand)} aria-labelledby="privacy-title">
        <div className={styles.inkText}>
          <p className={styles.eyebrowInk}>Privacidad</p>
          <h2 id="privacy-title" className={styles.h2}>
            Tus datos viajan tapados.
          </h2>
          <p className={styles.inkLead}>
            En el rastreo público solo se ve el estado, la ciudad y la fecha. La guía completa, tu
            nombre y tu dirección se quedan dentro de tu cuenta.
          </p>
        </div>
        <dl className={styles.maskDemo} aria-label="Ejemplo de datos enmascarados">
          <div className={styles.maskRow}>
            <dt>Guía</dt>
            <dd>
              <span className={styles.maskFull} aria-hidden="true">
                RS0000000009
              </span>
              <span className={styles.maskHidden}>RS-****-0009</span>
            </dd>
          </div>
          <div className={styles.maskRow}>
            <dt>Recibe</dt>
            <dd>
              <span className={styles.maskFull} aria-hidden="true">
                Valentina Ríos
              </span>
              <span className={styles.maskHidden}>V******* R***</span>
            </dd>
          </div>
          <div className={styles.maskRow}>
            <dt>Teléfono</dt>
            <dd>
              <span className={styles.maskFull} aria-hidden="true">
                310 555 7070
              </span>
              <span className={styles.maskHidden}>*** *** 7070</span>
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
