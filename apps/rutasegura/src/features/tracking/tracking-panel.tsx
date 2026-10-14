"use client";

import { useState, type FormEvent } from "react";
import { trackingRequestSchema, type TrackingResponse } from "@rutasegura/contracts";
import {
  Alert,
  Actions,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Chip,
  Field,
  Form,
  Mono,
  Muted,
  Timeline,
  type TimelineItem,
} from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import { STATUS_LABEL, dateTimeLabel } from "@/lib/format";
import {
  ApiErrorAlert,
  useRateLimitActive,
  type ApiFailure,
} from "@/features/shared/api-error-alert";

const STATUS_HEADLINE: Record<TrackingResponse["status"], string> = {
  created: "Envío registrado",
  in_transit: "Tu envío va en camino",
  out_for_delivery: "Llega hoy",
  delivered: "Entregado",
  exception: "Tu envío tiene una novedad",
};

function timelineItems(result: TrackingResponse): TimelineItem[] {
  const items: TimelineItem[] = result.events.map((event, index) => ({
    key: `${event.occurredAt}-${index}`,
    title: `${STATUS_LABEL[event.status].label} · ${event.city}`,
    meta: dateTimeLabel(event.occurredAt),
  }));
  if (result.status !== "delivered") {
    items.push({ key: "pending-delivery", title: "Entrega", meta: "Pendiente", pending: true });
  }
  return items;
}

export function TrackingPanel() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ trackingNumber?: string; phoneLast4?: string }>(
    {},
  );
  const [result, setResult] = useState<TrackingResponse | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);
  const limited = useRateLimitActive(failure);

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

  return (
    <>
      <Card>
        <Form onSubmit={onSubmit} label="Consulta de rastreo">
          <Field
            id="trackingNumber"
            label="Número de guía"
            name="trackingNumber"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="RS0000000001"
            hint="Formato opaco; no usamos números secuenciales expuestos."
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            error={fieldErrors.trackingNumber}
            required
          />
          <Field
            id="phoneLast4"
            label="Últimos 4 dígitos del teléfono"
            name="phoneLast4"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="4321"
            hint="Se usan solo para validar esta consulta."
            value={phoneLast4}
            onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, ""))}
            error={fieldErrors.phoneLast4}
            required
          />
          <Actions>
            <Button type="submit" disabled={pending || limited}>
              {pending ? "Consultando…" : "Consultar estado"}
            </Button>
            <Button variant="secondary" onClick={onClear}>
              Limpiar
            </Button>
          </Actions>
          <Alert>
            Máximo 5 intentos por 15 minutos. Los errores no revelan si una guía existe.
          </Alert>
          <ApiErrorAlert failure={failure} context="tracking" />
        </Form>
      </Card>

      {result ? (
        <Card labelledBy="tracking-result">
          <CardHeader>
            <div>
              <CardTitle id="tracking-result">{STATUS_HEADLINE[result.status]}</CardTitle>
              <Muted>
                Guía <Mono>{result.trackingNumber}</Mono>
              </Muted>
            </div>
            <Chip tone={STATUS_LABEL[result.status].tone}>{STATUS_LABEL[result.status].label}</Chip>
          </CardHeader>
          <Timeline items={timelineItems(result)} label="Recorrido del envío" />
          <Muted>
            Solo mostramos estado, ciudad y fecha. Nunca nombre, teléfono ni dirección del
            destinatario.
          </Muted>
        </Card>
      ) : null}
    </>
  );
}
