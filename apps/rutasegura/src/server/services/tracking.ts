import "server-only";
import { phoneLast4Digest } from "@rutasegura/database";
import type { TrackingRequest, TrackingResponse } from "@rutasegura/contracts";
import { recordAuthEvent } from "@/server/audit/auth-events";
import { safeEqual } from "@/server/auth/digest";
import { getEnv } from "@/server/env";
import { findShipmentByTrackingNumber, listShipmentEvents } from "@/server/repositories/shipments";
import type { RequestContext } from "./auth";

/**
 * Consulta de guía con doble dato. Guía inexistente y dígitos incorrectos
 * devuelven lo mismo (`null`) y cuestan lo mismo: siempre se calcula y compara
 * un HMAC, aunque la guía no exista.
 */
export async function trackShipment(
  input: TrackingRequest,
  ctx: RequestContext,
): Promise<TrackingResponse | null> {
  const { HMAC_SECRET } = getEnv();
  const shipment = await findShipmentByTrackingNumber(input.trackingNumber);
  const provided = phoneLast4Digest(HMAC_SECRET, input.trackingNumber, input.phoneLast4);
  const matches = safeEqual(provided, shipment?.recipientPhoneLast4Hmac ?? "");

  const audit = { subject: input.trackingNumber, ip: ctx.ip, userAgent: ctx.userAgent };

  if (!shipment || !matches) {
    await recordAuthEvent({ type: "tracking_failure", ...audit });
    return null;
  }

  const events = await listShipmentEvents(shipment.id);
  await recordAuthEvent({ type: "tracking_success", ...audit });
  return {
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    events: events.map((event) => ({
      status: event.status,
      city: event.city,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}
