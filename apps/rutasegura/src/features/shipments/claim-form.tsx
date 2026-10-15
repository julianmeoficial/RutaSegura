"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { claimRequestSchema, type ShipmentSummary } from "@rutasegura/contracts";
import { IconChevronDown, IconPlus } from "@/components/icons";
import { Alert, Button, Field, Form } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import {
  ApiErrorAlert,
  useRateLimitActive,
  type ApiFailure,
} from "@/features/shared/api-error-alert";
import styles from "@/features/portal/portal.module.css";

/** Agrega una guía existente a la cuenta con la guía y los 4 dígitos, igual que el rastreo. */
export function ClaimForm() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [claimed, setClaimed] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const limited = useRateLimitActive(failure);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = claimRequestSchema.safeParse({ trackingNumber, phoneLast4 });
    if (!parsed.success) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setPending(true);
    const result = await apiRequest<ShipmentSummary>("/api/v1/shipments/claim", {
      method: "POST",
      body: parsed.data,
    });
    setPending(false);
    if (result.ok) {
      setFailure(null);
      setClaimed(result.data.trackingNumber);
      setTrackingNumber("");
      setPhoneLast4("");
      router.refresh();
    } else if (result.code === "unauthorized") {
      router.replace("/ingresar?next=/portal");
    } else {
      setClaimed(null);
      setFailure({ ...result, at: Date.now() });
    }
  }

  return (
    <Form onSubmit={onSubmit} label="Agregar un envío">
      <div className={styles.claimFields}>
        <Field
          id="claim-tracking"
          label="Número de guía"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="RS0000000000"
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value.toUpperCase())}
          required
        />
        <Field
          id="claim-phone"
          label="Últimos 4 dígitos del teléfono"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="0000"
          value={phoneLast4}
          onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, ""))}
          required
        />
      </div>
      {invalid ? (
        <Alert tone="error">
          Escribe la guía (RS seguido de 10 dígitos) y los últimos 4 dígitos del teléfono.
        </Alert>
      ) : null}
      {claimed ? (
        <Alert tone="success" live>
          La guía {claimed} quedó vinculada a tu cuenta.
        </Alert>
      ) : null}
      <ApiErrorAlert failure={failure} context="claim" />
      <div>
        <Button type="submit" disabled={pending || limited} loading={pending}>
          {pending ? "Vinculando…" : "Vincular guía"}
        </Button>
      </div>
    </Form>
  );
}

/** Panel plegable; abierto de entrada cuando la cuenta aún no tiene envíos. */
export function ClaimPanel({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      id="agregar"
      className={styles.claim}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={styles.claimSummary}>
        <span className={styles.claimIcon}>
          <IconPlus size={20} />
        </span>
        <span className={styles.claimText}>
          <span className={styles.claimTitle}>Agregar un envío</span>
          <span className={styles.claimHint}>
            Usa la guía y los últimos 4 dígitos del teléfono de quien recibe.
          </span>
        </span>
        <IconChevronDown size={20} className={styles.claimChevron} />
      </summary>
      <div className={styles.claimBody}>
        <ClaimForm />
      </div>
    </details>
  );
}
