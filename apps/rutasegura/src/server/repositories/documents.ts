import "server-only";
import { asc, eq } from "drizzle-orm";
import { schema } from "@rutasegura/database";
import type { Tx } from "./db";

const { documents, shipments } = schema;

const documentColumns = {
  id: documents.id,
  publicId: documents.publicId,
  shipmentId: documents.shipmentId,
  shipmentPublicId: shipments.publicId,
  ownerId: shipments.ownerId,
  objectKey: documents.objectKey,
  fileName: documents.fileName,
  mimeType: documents.mimeType,
  sizeBytes: documents.sizeBytes,
  createdAt: documents.createdAt,
};

/** Documento con el dueño de su envío padre, que decide la autorización. */
export type DocumentRow = {
  id: string;
  publicId: string;
  shipmentId: string;
  shipmentPublicId: string | null;
  ownerId: string | null;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

export async function findDocumentByPublicId(
  tx: Tx,
  publicId: string,
): Promise<DocumentRow | undefined> {
  const [document] = await tx
    .select(documentColumns)
    .from(documents)
    .innerJoin(shipments, eq(shipments.id, documents.shipmentId))
    .where(eq(documents.publicId, publicId))
    .limit(1);
  return document;
}

export async function listDocumentsByShipment(tx: Tx, shipmentId: string): Promise<DocumentRow[]> {
  return tx
    .select(documentColumns)
    .from(documents)
    .innerJoin(shipments, eq(shipments.id, documents.shipmentId))
    .where(eq(documents.shipmentId, shipmentId))
    .orderBy(asc(documents.createdAt));
}

/** Documentos de todos los envíos del dueño. */
export async function listDocumentsByOwner(tx: Tx, ownerId: string): Promise<DocumentRow[]> {
  return tx
    .select(documentColumns)
    .from(documents)
    .innerJoin(shipments, eq(shipments.id, documents.shipmentId))
    .where(eq(shipments.ownerId, ownerId))
    .orderBy(asc(documents.createdAt));
}
