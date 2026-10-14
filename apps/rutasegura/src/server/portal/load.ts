import "server-only";
import { notFound } from "next/navigation";
import { ulidSchema, type DocumentSummary, type ShipmentDetail } from "@rutasegura/contracts";
import { OwnershipError } from "@/server/authorization/ownership";
import { logger } from "@/server/logger";
import { listDocumentsForShipment } from "@/server/services/documents";
import { pageFailure } from "./page-data";
import { getShipmentForUser } from "@/server/services/shipments";

/**
 * Envío propio y sus documentos para una página del portal. Ajeno, inexistente
 * o con ULID mal formado: la misma página 404, igual que la API.
 */
export async function loadOwnedShipment(
  rawId: string,
  userId: string,
  route: string,
): Promise<{ shipment: ShipmentDetail; documents: DocumentSummary[] }> {
  const id = ulidSchema.safeParse(rawId);
  if (!id.success) notFound();
  try {
    const [shipment, documents] = await Promise.all([
      getShipmentForUser(id.data, userId),
      listDocumentsForShipment(id.data, userId),
    ]);
    return { shipment, documents };
  } catch (error) {
    if (error instanceof OwnershipError) {
      logger.warn("security.access_denied", { source: "page", route, reason: "ownership" });
      notFound();
    }
    throw pageFailure(route, error);
  }
}
