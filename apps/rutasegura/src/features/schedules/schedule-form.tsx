"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { DeliverySlot, DeliveryWindow, ShipmentSummary } from "@rutasegura/contracts";
import { Actions, Alert, Button, Form } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import {
  DELIVERY_SLOTS,
  calendarDateLabel,
  isSlotPast,
  slotLabel,
  upcomingBusinessDays,
} from "@/lib/format";
import {
  ApiErrorAlert,
  useRateLimitActive,
  type ApiFailure,
} from "@/features/shared/api-error-alert";
import styles from "@/features/portal/portal.module.css";

const BUSINESS_DAYS = 10;

function firstAvailable(days: string[], now: Date): { date: string; slot: DeliverySlot } | null {
  for (const date of days) {
    const slot = DELIVERY_SLOTS.find((candidate) => !isSlotPast(date, candidate, now));
    if (slot) return { date, slot };
  }
  return null;
}

/**
 * Selector de franja. Solo se monta después de que el servidor verificó la
 * propiedad del envío; el servidor vuelve a validar fecha, franja y estado.
 */
export function ScheduleForm({
  shipmentId,
  current,
  nowIso,
}: {
  shipmentId: string;
  current: DeliveryWindow | null;
  /** Hora del servidor al renderizar, para que el HTML y la hidratación coincidan. */
  nowIso: string;
}) {
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const days = useMemo(() => upcomingBusinessDays(BUSINESS_DAYS, now), [now]);
  const initial = current ?? firstAvailable(days, now);
  const [date, setDate] = useState(initial?.date ?? days[0]!);
  const [slot, setSlot] = useState<DeliverySlot | null>(initial?.slot ?? null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "cancel" | null>(null);
  const limited = useRateLimitActive(failure);
  const dateOptions = current && !days.includes(current.date) ? [current.date, ...days] : days;

  async function submit(method: "PATCH" | "DELETE") {
    setPending(method === "PATCH" ? "save" : "cancel");
    setMessage(null);
    const result = await apiRequest<ShipmentSummary>(
      `/api/v1/shipments/${encodeURIComponent(shipmentId)}/schedule`,
      method === "PATCH" ? { method, body: { date, slot } } : { method },
    );
    setPending(null);
    if (result.ok) {
      setFailure(null);
      setMessage(
        method === "PATCH"
          ? `Franja confirmada: ${calendarDateLabel(date)} · ${slotLabel(slot!)}.`
          : "Cancelaste la franja de entrega.",
      );
      router.refresh();
    } else if (result.code === "unauthorized") {
      router.replace(`/ingresar?next=/portal/envios/${shipmentId}/agenda`);
    } else {
      setFailure({ ...result, at: Date.now() });
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slot) {
      setMessage(null);
      setFailure(null);
      return;
    }
    void submit("PATCH");
  }

  return (
    <Form onSubmit={onSubmit} label="Agendar franja de entrega">
      <fieldset className={styles.dates}>
        <legend className={styles.legend}>Día de entrega (lunes a viernes)</legend>
        {dateOptions.map((day) => (
          <label key={day} className={`${styles.option} ${styles.datePill}`}>
            <input
              type="radio"
              name="date"
              value={day}
              checked={date === day}
              onChange={() => {
                setDate(day);
                if (slot && isSlotPast(day, slot, now)) setSlot(null);
              }}
            />
            <span className={styles.optionBox}>
              <span className={styles.optionTitle}>{calendarDateLabel(day)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.slotGroup}>
        <legend className={styles.legend}>Franja para el {calendarDateLabel(date)}</legend>
        <ul className={styles.slots}>
          {DELIVERY_SLOTS.map((candidate) => {
            const past = isSlotPast(date, candidate, now);
            const isCurrent = current?.date === date && current.slot === candidate;
            return (
              <li key={candidate}>
                <label className={styles.option}>
                  <input
                    type="radio"
                    name="slot"
                    value={candidate}
                    checked={slot === candidate}
                    disabled={past}
                    onChange={() => setSlot(candidate)}
                  />
                  <span className={styles.optionBox}>
                    <span className={styles.optionTitle}>{slotLabel(candidate)}</span>
                    <span className={styles.optionMeta}>
                      {past ? "No disponible" : isCurrent ? "Tu franja actual" : "Disponible"}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {!slot ? <Alert>Elige una franja disponible para confirmar.</Alert> : null}
      {message ? (
        <Alert tone="success" live>
          {message}
        </Alert>
      ) : null}
      <ApiErrorAlert failure={failure} context="schedule" />

      <Actions>
        <Button type="submit" disabled={!slot || pending !== null || limited}>
          {pending === "save"
            ? "Confirmando…"
            : current
              ? "Reprogramar franja"
              : "Confirmar franja"}
        </Button>
        {current ? (
          <Button
            variant="danger"
            onClick={() => void submit("DELETE")}
            disabled={pending !== null || limited}
          >
            {pending === "cancel" ? "Cancelando…" : "Cancelar franja"}
          </Button>
        ) : null}
      </Actions>
    </Form>
  );
}
