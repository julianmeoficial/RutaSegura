import "server-only";
import { phoneLast4Digest } from "@rutasegura/database";
import type {
  ClaimRequest,
  DeliverySlot,
  ScheduleRequest,
  ShipmentDetail,
  ShipmentSummary,
} from "@rutasegura/contracts";
import { recordAuthEvent } from "@/server/audit/auth-events";
import { safeEqual } from "@/server/auth/digest";
import { assertOwnership } from "@/server/authorization/ownership";
import { getEnv } from "@/server/env";
import { generateUlid } from "@/server/ids/ulid";
import { enqueueNotification } from "@/server/notifications/simulate";
import { withRlsContext } from "@/server/repositories/db";
import {
  claimShipment,
  clearShipmentWindow,
  findShipmentById,
  findShipmentByPublicId,
  findShipmentByTrackingNumber,
  insertShipmentAudit,
  insertShipmentEvent,
  listShipmentAudit,
  listShipmentEvents,
  listShipmentsByOwner,
  updateShipmentStatus,
  updateShipmentWindow,
  type ShipmentRow,
  type ShipmentStatus,
} from "@/server/repositories/shipments";
import type { RequestContext } from "./auth";
import { isReschedulable, isValidDeliveryWindow } from "./schedule";

function toSummary(row: ShipmentRow): ShipmentSummary {
  if (!row.publicId) throw new Error("Envío reclamado sin identificador público");
  return {
    id: row.publicId,
    trackingNumber: row.trackingNumber,
    status: row.status,
    window:
      row.windowDate && row.windowSlot
        ? { date: row.windowDate, slot: row.windowSlot as DeliverySlot }
        : null,
  };
}

/**
 * Reclamo de una guía existente con el mismo doble dato del rastreo, y con el
 * mismo coste: el HMAC se calcula siempre. Guía inexistente, dígitos
 * incorrectos y guía de otro usuario devuelven igual `null`. Reclamar una guía
 * propia es idempotente.
 */
export async function claimShipmentForUser(
  input: ClaimRequest,
  userId: string,
  ctx: RequestContext,
): Promise<ShipmentSummary | null> {
  const { HMAC_SECRET } = getEnv();
  const provided = phoneLast4Digest(HMAC_SECRET, input.trackingNumber, input.phoneLast4);

  const result = await withRlsContext({ userId, mode: "claim" }, async (tx) => {
    const shipment = await findShipmentByTrackingNumber(tx, input.trackingNumber);
    const matches = safeEqual(provided, shipment?.recipientPhoneLast4Hmac ?? "");
    if (!shipment || !matches) return null;
    if (shipment.ownerId === userId) return toSummary(shipment);
    if (shipment.ownerId !== null) return null;

    const claimed = await claimShipment(tx, shipment.id, userId, generateUlid());
    if (!claimed) {
      const current = await findShipmentById(tx, shipment.id);
      return current?.ownerId === userId ? toSummary(current) : null;
    }
    await insertShipmentAudit(tx, { shipmentId: claimed.id, actorUserId: userId, type: "claimed" });
    return toSummary(claimed);
  });

  if (!result) {
    await recordAuthEvent({
      type: "tracking_failure",
      userId,
      subject: input.trackingNumber,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
  return result;
}

export async function listShipmentsForUser(userId: string): Promise<ShipmentSummary[]> {
  const rows = await withRlsContext({ userId }, (tx) => listShipmentsByOwner(tx, userId));
  return rows.map(toSummary);
}

/** Lanza `OwnershipError` si el envío no existe o no es del usuario. */
export async function getShipmentForUser(
  publicId: string,
  userId: string,
): Promise<ShipmentDetail> {
  return withRlsContext({ userId }, async (tx) => {
    const shipment = await findShipmentByPublicId(tx, publicId);
    assertOwnership(shipment, userId);
    const events = await listShipmentEvents(tx, shipment.id);
    const audit = await listShipmentAudit(tx, shipment.id);
    return {
      ...toSummary(shipment),
      events: events.map((event) => ({
        status: event.status,
        city: event.city,
        occurredAt: event.occurredAt.toISOString(),
      })),
      audit: audit.map((event) => ({
        type: event.type,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  });
}

export type ScheduleResult = { ok: true; shipment: ShipmentSummary } | { ok: false };

/**
 * Crea o cambia la franja de entrega. `{ ok: false }` cubre, sin distinguirlas,
 * franja inválida, fin de semana, franja pasada y envío que ya no se puede
 * reprogramar. Lanza `OwnershipError` si el envío no es del usuario.
 */
export async function scheduleShipment(
  publicId: string,
  userId: string,
  request: ScheduleRequest,
  now: Date = new Date(),
): Promise<ScheduleResult> {
  return withRlsContext({ userId }, async (tx): Promise<ScheduleResult> => {
    const shipment = await findShipmentByPublicId(tx, publicId);
    assertOwnership(shipment, userId);

    if (!isReschedulable(shipment.status)) return { ok: false };
    if (!isValidDeliveryWindow(request.date, request.slot, now)) return { ok: false };
    if (shipment.windowDate === request.date && shipment.windowSlot === request.slot) {
      return { ok: true, shipment: toSummary(shipment) };
    }

    const updated = await updateShipmentWindow(tx, shipment.id, userId, request);
    if (!updated) return { ok: false };

    const rescheduled = shipment.windowDate !== null;
    await insertShipmentAudit(tx, {
      shipmentId: shipment.id,
      actorUserId: userId,
      type: rescheduled ? "rescheduled" : "scheduled",
    });
    await enqueueNotification(tx, {
      userId,
      kind: rescheduled ? "shipment_rescheduled" : "shipment_scheduled",
    });
    return { ok: true, shipment: toSummary(updated) };
  });
}

/**
 * Cancela la franja de entrega. Sin franja es idempotente: responde el envío sin
 * escribir nada. `{ ok: false }` si el envío ya está en reparto o entregado.
 * Lanza `OwnershipError` si el envío no es del usuario.
 */
export async function unscheduleShipment(
  publicId: string,
  userId: string,
): Promise<ScheduleResult> {
  return withRlsContext({ userId }, async (tx): Promise<ScheduleResult> => {
    const shipment = await findShipmentByPublicId(tx, publicId);
    assertOwnership(shipment, userId);

    if (!isReschedulable(shipment.status)) return { ok: false };
    if (shipment.windowDate === null) return { ok: true, shipment: toSummary(shipment) };

    const updated = await clearShipmentWindow(tx, shipment.id, userId);
    if (!updated) return { ok: false };

    await insertShipmentAudit(tx, {
      shipmentId: shipment.id,
      actorUserId: userId,
      type: "unscheduled",
    });
    await enqueueNotification(tx, { userId, kind: "shipment_unscheduled" });
    return { ok: true, shipment: toSummary(updated) };
  });
}

/**
 * Cambio de estado logístico. Es una operación de operador: ningún endpoint
 * HTTP del cliente la expone. Deja evento de rastreo, bitácora y aviso al dueño.
 */
export async function transitionShipmentStatus(input: {
  shipmentId: string;
  toStatus: ShipmentStatus;
  city: string;
  actorUserId?: string | null;
  occurredAt?: Date;
}): Promise<boolean> {
  const actorUserId = input.actorUserId ?? null;
  return withRlsContext({ userId: actorUserId, mode: "operator" }, async (tx) => {
    const shipment = await findShipmentById(tx, input.shipmentId);
    if (!shipment) return false;

    await updateShipmentStatus(tx, shipment.id, input.toStatus);
    await insertShipmentEvent(tx, {
      shipmentId: shipment.id,
      status: input.toStatus,
      city: input.city,
      occurredAt: input.occurredAt ?? new Date(),
    });
    await insertShipmentAudit(tx, {
      shipmentId: shipment.id,
      actorUserId,
      type: "status_changed",
      fromStatus: shipment.status,
      toStatus: input.toStatus,
    });
    if (shipment.ownerId) {
      await enqueueNotification(tx, { userId: shipment.ownerId, kind: "shipment_status_changed" });
    }
    return true;
  });
}
