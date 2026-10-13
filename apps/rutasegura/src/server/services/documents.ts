import "server-only";
import type { DocumentMimeType, DocumentSummary, DownloadUrlResponse } from "@rutasegura/contracts";
import { assertOwnership } from "@/server/authorization/ownership";
import { withRlsContext } from "@/server/repositories/db";
import {
  findDocumentByPublicId,
  listDocumentsByOwner,
  listDocumentsByShipment,
  type DocumentRow,
} from "@/server/repositories/documents";
import { findShipmentByPublicId, insertShipmentAudit } from "@/server/repositories/shipments";
import { presignDownload, storageConfig } from "@/server/storage/signer";

function toSummary(row: DocumentRow): DocumentSummary {
  if (!row.shipmentPublicId) throw new Error("Documento de un envío sin identificador público");
  return {
    id: row.publicId,
    shipmentId: row.shipmentPublicId,
    fileName: row.fileName,
    mimeType: row.mimeType as DocumentMimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Lanza `OwnershipError` si el envío no existe o no es del usuario. */
export async function listDocumentsForShipment(
  shipmentPublicId: string,
  userId: string,
): Promise<DocumentSummary[]> {
  return withRlsContext({ userId }, async (tx) => {
    const shipment = await findShipmentByPublicId(tx, shipmentPublicId);
    assertOwnership(shipment, userId);
    const rows = await listDocumentsByShipment(tx, shipment.id);
    return rows.map(toSummary);
  });
}

export async function listDocumentsForUser(userId: string): Promise<DocumentSummary[]> {
  const rows = await withRlsContext({ userId }, (tx) => listDocumentsByOwner(tx, userId));
  return rows.map(toSummary);
}

/**
 * Emite una URL firmada de descarga. La propiedad se comprueba sobre el envío
 * padre antes de firmar; documento ajeno o inexistente lanza `OwnershipError`.
 * Cada emisión queda en la bitácora del envío. Si el almacenamiento no está
 * configurado lanza `StorageUnavailableError`, y la bitácora no se escribe.
 */
export async function issueDownloadUrl(
  documentPublicId: string,
  userId: string,
  now: Date = new Date(),
): Promise<DownloadUrlResponse> {
  return withRlsContext({ userId }, async (tx) => {
    const document = await findDocumentByPublicId(tx, documentPublicId);
    assertOwnership(document, userId);

    const config = storageConfig();
    await insertShipmentAudit(tx, {
      shipmentId: document.shipmentId,
      actorUserId: userId,
      type: "document_url_issued",
    });
    return presignDownload(
      config,
      { objectKey: document.objectKey, fileName: document.fileName, mimeType: document.mimeType },
      now,
    );
  });
}
