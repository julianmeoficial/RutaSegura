"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { trackingRequestSchema, type TrackingResponse } from "@rutasegura/contracts";
import { FOOTER_GUIDE_EVENT, FOOTER_GUIDE_KEY } from "@/components/footer-track";
import { IconMapPin, IconShield } from "@/components/icons";
import { Button, ButtonLink, Chip, Field, Form, Mono, Muted, Skeleton, cx } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import { STATUS_INFO, STATUS_LABEL, dateTimeLabel, maskTracking } from "@/lib/format";
import {
  ApiErrorAlert,
  useRateLimitActive,
  type ApiFailure,
} from "@/features/shared/api-error-alert";
import { RouteTimeline } from "@/features/shipments/route-timeline";
import { ShipmentProgress } from "@/features/shipments/shipment-progress";
import styles from "./tracking.module.css";

/** Guía demo documentada en docs/datos-de-prueba.md. */
const SAMPLE = { trackingNumber: "RS0000000009", phoneLast4: "7070" };

export function TrackingPanel({
  showSample = false,
  variant = "page",
}: {
  showSample?: boolean;
  /** `hero`: formulario en una sola fila sobre la portada. */
  variant?: "hero" | "page";
}) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ trackingNumber?: string; phoneLast4?: string }>(
    {},
  );
  const [result, setResult] = useState<TrackingResponse | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);
  const limited = useRateLimitActive(failure);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!result) return;
    resultHeading.current?.focus({ preventScroll: true });
    resultHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  // La guía escrita en el pie llega por sessionStorage, nunca por la URL.
  useEffect(() => {
    function pickUp() {
      let guide: string | null = null;
      try {
        guide = sessionStorage.getItem(FOOTER_GUIDE_KEY);
        sessionStorage.removeItem(FOOTER_GUIDE_KEY);
      } catch {
        return;
      }
      if (!guide) return;
      setTrackingNumber(guide);
      setResult(null);
      setFailure(null);
      document.getElementById("phoneLast4")?.focus();
    }
    pickUp();
    window.addEventListener(FOOTER_GUIDE_EVENT, pickUp);
    return () => window.removeEventListener(FOOTER_GUIDE_EVENT, pickUp);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = trackingRequestSchema.safeParse({ trackingNumber, phoneLast4 });
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.path[0]);
      setFieldErrors({
        trackingNumber: issues.includes("trackingNumber")
          ? "Escribe la guía con el formato RS seguido de 10 dígitos."
          : undefined,
        phoneLast4: issues.includes("phoneLast4") ? "Escribe exactamente 4 dígitos." : undefined,
      });
      return;
    }

    setFieldErrors({});
    setPending(true);
    const response = await apiRequest<TrackingResponse>("/api/v1/tracking", {
      method: "POST",
      body: parsed.data,
      refreshOnUnauthorized: false,
    });
    setPending(false);

    if (response.ok) {
      setResult(response.data);
      setFailure(null);
    } else {
      setResult(null);
      setFailure({ ...response, at: Date.now() });
    }
  }

  function onClear() {
    setTrackingNumber("");
    setPhoneLast4("");
    setFieldErrors({});
    setResult(null);
    setFailure(null);
  }

  function onSample() {
    setTrackingNumber(SAMPLE.trackingNumber);
    setPhoneLast4(SAMPLE.phoneLast4);
    setFieldErrors({});
  }

  const latest = result?.events.at(-1);
  const status = result ? STATUS_LABEL[result.status] : null;

  return (
    <div className={cx(styles.panel, variant === "hero" && styles.hero)}>
      <Form onSubmit={onSubmit} label="Consulta de rastreo" className={styles.form}>
        <div className={styles.fields}>
          <Field
            id="trackingNumber"
            label="Número de guía"
            name="trackingNumber"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="RS0000000000"
            hint="Está en tu comprobante y empieza por RS."
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value.toUpperCase())}
            error={fieldErrors.trackingNumber}
            className={styles.guideInput}
            required
          />
          <Field
            id="phoneLast4"
            label="Últimos 4 dígitos del teléfono"
            name="phoneLast4"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="0000"
            hint="De quien recibe el paquete."
            value={phoneLast4}
            onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, ""))}
            error={fieldErrors.phoneLast4}
            className={styles.digitsInput}
            required
          />
          <div className={styles.submit}>
            <Button type="submit" disabled={pending || limited} loading={pending} block>
              {pending ? "Consultando…" : "Consultar estado"}
            </Button>
          </div>
        </div>
        <div className={styles.formFoot}>
          <p className={styles.note}>
            <IconShield size={18} />
            <span>Los 4 dígitos aseguran que solo quien espera el paquete vea su estado.</span>
          </p>
          {result || failure ? (
            <Button variant="ghost" onClick={onClear}>
              Limpiar
            </Button>
          ) : showSample ? (
            <Button variant="ghost" onClick={onSample}>
              Usar una guía de ejemplo
            </Button>
          ) : null}
        </div>
        <ApiErrorAlert failure={failure} context="tracking" />
      </Form>

      {pending && !result ? <Skeleton rows={3} label="Consultando el envío" /> : null}

      {result && status && latest ? (
        <section className={styles.result} aria-labelledby="tracking-result">
          <div className={styles.resultTop}>
            <Chip tone={status.tone}>{status.label}</Chip>
            <Muted small>
              Guía <Mono>{maskTracking(result.trackingNumber)}</Mono>
            </Muted>
          </div>
          <h2 id="tracking-result" ref={resultHeading} tabIndex={-1} className={styles.resultTitle}>
            {STATUS_INFO[result.status].headline}
          </h2>
          <p className={styles.resultText}>{STATUS_INFO[result.status].description}</p>
          <p className={styles.lastUpdate}>
            <IconMapPin size={18} />
            <span className={styles.whereText}>
              <span>{latest.city}</span>
              <span aria-hidden="true" className={styles.whereSep}>
                ·
              </span>
              <Mono>{dateTimeLabel(latest.occurredAt)}</Mono>
            </span>
          </p>

          <ShipmentProgress status={result.status} />

          <div className={styles.split}>
            <div className={styles.history}>
              <h3 className={styles.historyTitle}>Recorrido</h3>
              <RouteTimeline events={result.events} />
            </div>
            <aside className={styles.claim} aria-labelledby="claim-title">
              <h3 id="claim-title" className={styles.claimTitle}>
                ¿Este envío es tuyo?
              </h3>
              <p className={styles.claimText}>
                Agrégalo a tu cuenta para elegir la franja de entrega y descargar sus documentos.
              </p>
              <ButtonLink href="/portal" variant="secondary">
                Agregar a mi cuenta
              </ButtonLink>
              <Muted small>
                Aquí solo mostramos el estado, la ciudad y la fecha de cada movimiento.
              </Muted>
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  );
}
