import "server-only";
import { asc, eq } from "drizzle-orm";
import { schema } from "@rutasegura/database";
import { db } from "./db";

const { shipments, shipmentEvents } = schema;

export async function findShipmentByTrackingNumber(trackingNumber: string) {
  const [shipment] = await db()
    .select({
      id: shipments.id,
      trackingNumber: shipments.trackingNumber,
      status: shipments.status,
      recipientPhoneLast4Hmac: shipments.recipientPhoneLast4Hmac,
    })
    .from(shipments)
    .where(eq(shipments.trackingNumber, trackingNumber))
    .limit(1);
  return shipment;
}

export async function listShipmentEvents(shipmentId: string) {
  return db()
    .select({
      status: shipmentEvents.status,
      city: shipmentEvents.city,
      occurredAt: shipmentEvents.occurredAt,
    })
    .from(shipmentEvents)
    .where(eq(shipmentEvents.shipmentId, shipmentId))
    .orderBy(asc(shipmentEvents.occurredAt));
}
