import "server-only";
import { phoneLast4Digest } from "@rutasegura/database";
import type { TrackingRequest, TrackingResponse } from "@rutasegura/contracts";
import { recordAuthEvent } from "@/server/audit/auth-events";
import { safeEqual } from "@/server/auth/digest";
import { getEnv } from "@/server/env";
import { withRlsContext } from "@/server/repositories/db";
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
  const provided = phoneLast4Digest(HMAC_SECRET, input.trackingNumber, input.phoneLast4);

  const result = await withRlsContext({ mode: "public_tracking" }, async (tx) => {
    const shipment = await findShipmentByTrackingNumber(tx, input.trackingNumber);
    const matches = safeEqual(provided, shipment?.recipientPhoneLast4Hmac ?? "");
    if (!shipment || !matches) return null;

    const events = await listShipmentEvents(tx, shipment.id);
    return {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      events: events.map((event) => ({
        status: event.status,
        city: event.city,
        occurredAt: event.occurredAt.toISOString(),
      })),
    };
  });

  const audit = { subject: input.trackingNumber, ip: ctx.ip, userAgent: ctx.userAgent };
  await recordAuthEvent({ type: result ? "tracking_success" : "tracking_failure", ...audit });
  return result;
}
