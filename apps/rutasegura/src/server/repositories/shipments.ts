import "server-only";
import { and, asc, desc, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { schema } from "@rutasegura/database";
import type { Tx } from "./db";

const { shipments, shipmentEvents, shipmentAuditEvents } = schema;

export type ShipmentStatus = (typeof schema.shipmentStatus.enumValues)[number];
export type ShipmentAuditType = (typeof schema.shipmentAuditEventType.enumValues)[number];

const shipmentColumns = {
  id: shipments.id,
  publicId: shipments.publicId,
  trackingNumber: shipments.trackingNumber,
  status: shipments.status,
  ownerId: shipments.ownerId,
  windowDate: shipments.windowDate,
  windowSlot: shipments.windowSlot,
};

export type ShipmentRow = {
  id: string;
  publicId: string | null;
  trackingNumber: string;
  status: ShipmentStatus;
  ownerId: string | null;
  windowDate: string | null;
  windowSlot: string | null;
};

export async function findShipmentByTrackingNumber(tx: Tx, trackingNumber: string) {
  const [shipment] = await tx
    .select({ ...shipmentColumns, recipientPhoneLast4Hmac: shipments.recipientPhoneLast4Hmac })
    .from(shipments)
    .where(eq(shipments.trackingNumber, trackingNumber))
    .limit(1);
  return shipment;
}

export async function findShipmentByPublicId(
  tx: Tx,
  publicId: string,
): Promise<ShipmentRow | undefined> {
  const [shipment] = await tx
    .select(shipmentColumns)
    .from(shipments)
    .where(eq(shipments.publicId, publicId))
    .limit(1);
  return shipment;
}

export async function findShipmentById(tx: Tx, id: string): Promise<ShipmentRow | undefined> {
  const [shipment] = await tx
    .select(shipmentColumns)
    .from(shipments)
    .where(eq(shipments.id, id))
    .limit(1);
  return shipment;
}

export async function listShipmentsByOwner(tx: Tx, ownerId: string): Promise<ShipmentRow[]> {
  return tx
    .select(shipmentColumns)
    .from(shipments)
    .where(eq(shipments.ownerId, ownerId))
    .orderBy(desc(shipments.createdAt));
}

const NOT_RESCHEDULABLE: ShipmentStatus[] = ["out_for_delivery", "delivered"];

/** Asigna dueño solo si la guía sigue libre; `undefined` si otro la reclamó antes. */
export async function claimShipment(
  tx: Tx,
  id: string,
  ownerId: string,
  publicId: string,
): Promise<ShipmentRow | undefined> {
  const [shipment] = await tx
    .update(shipments)
    .set({ ownerId, publicId: sql`coalesce(${shipments.publicId}, ${publicId})` })
    .where(and(eq(shipments.id, id), isNull(shipments.ownerId)))
    .returning(shipmentColumns);
  return shipment;
}

export async function updateShipmentWindow(
  tx: Tx,
  id: string,
  ownerId: string,
  window: { date: string; slot: string },
): Promise<ShipmentRow | undefined> {
  const [shipment] = await tx
    .update(shipments)
    .set({ windowDate: window.date, windowSlot: window.slot })
    .where(
      and(
        eq(shipments.id, id),
        eq(shipments.ownerId, ownerId),
        notInArray(shipments.status, NOT_RESCHEDULABLE),
      ),
    )
    .returning(shipmentColumns);
  return shipment;
}

/** Quita la franja solo si el envío es del dueño, sigue siendo reprogramable y tiene franja. */
export async function clearShipmentWindow(
  tx: Tx,
  id: string,
  ownerId: string,
): Promise<ShipmentRow | undefined> {
  const [shipment] = await tx
    .update(shipments)
    .set({ windowDate: null, windowSlot: null })
    .where(
      and(
        eq(shipments.id, id),
        eq(shipments.ownerId, ownerId),
        notInArray(shipments.status, NOT_RESCHEDULABLE),
        isNotNull(shipments.windowDate),
      ),
    )
    .returning(shipmentColumns);
  return shipment;
}

export async function updateShipmentStatus(tx: Tx, id: string, status: ShipmentStatus) {
  await tx.update(shipments).set({ status }).where(eq(shipments.id, id));
}

export async function insertShipmentEvent(
  tx: Tx,
  event: { shipmentId: string; status: ShipmentStatus; city: string; occurredAt: Date },
) {
  await tx.insert(shipmentEvents).values(event);
}

export async function listShipmentEvents(tx: Tx, shipmentId: string) {
  return tx
    .select({
      status: shipmentEvents.status,
      city: shipmentEvents.city,
      occurredAt: shipmentEvents.occurredAt,
    })
    .from(shipmentEvents)
    .where(eq(shipmentEvents.shipmentId, shipmentId))
    .orderBy(asc(shipmentEvents.occurredAt));
}

export async function insertShipmentAudit(
  tx: Tx,
  event: {
    shipmentId: string;
    actorUserId: string | null;
    type: ShipmentAuditType;
    fromStatus?: ShipmentStatus | null;
    toStatus?: ShipmentStatus | null;
  },
) {
  await tx.insert(shipmentAuditEvents).values({
    shipmentId: event.shipmentId,
    actorUserId: event.actorUserId,
    type: event.type,
    fromStatus: event.fromStatus ?? null,
    toStatus: event.toStatus ?? null,
  });
}

export async function listShipmentAudit(tx: Tx, shipmentId: string) {
  return tx
    .select({
      type: shipmentAuditEvents.type,
      fromStatus: shipmentAuditEvents.fromStatus,
      toStatus: shipmentAuditEvents.toStatus,
      createdAt: shipmentAuditEvents.createdAt,
    })
    .from(shipmentAuditEvents)
    .where(eq(shipmentAuditEvents.shipmentId, shipmentId))
    .orderBy(asc(shipmentAuditEvents.createdAt));
}
