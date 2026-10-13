"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { claimRequestSchema, type ShipmentSummary } from "@rutasegura/contracts";
import { Actions, Alert, Button, Field, Form } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import {
  ApiErrorAlert,
  useRateLimitActive,
  type ApiFailure,
} from "@/features/shared/api-error-alert";

/** Vincula una guía existente a la cuenta con el mismo doble dato del rastreo. */
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
    <Form onSubmit={onSubmit} label="Vincular una guía">
      <Field
        id="claim-tracking"
        label="Número de guía"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="RS0000000001"
        value={trackingNumber}
        onChange={(event) => setTrackingNumber(event.target.value)}
        required
      />
      <Field
        id="claim-phone"
        label="Últimos 4 dígitos del teléfono"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={phoneLast4}
        onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, ""))}
        required
      />
      {invalid ? (
        <Alert tone="error">
          Usa una guía RS de 10 dígitos y exactamente 4 dígitos del teléfono.
        </Alert>
      ) : null}
      {claimed ? (
        <Alert tone="success" live>
          La guía {claimed} quedó vinculada a tu cuenta.
        </Alert>
      ) : null}
      <ApiErrorAlert failure={failure} context="claim" />
      <Actions>
        <Button type="submit" disabled={pending || limited}>
          {pending ? "Vinculando…" : "Vincular guía"}
        </Button>
      </Actions>
    </Form>
  );
}
