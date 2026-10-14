import { z } from "zod";
import { ulidSchema } from "./shipments";

export const documentMimeTypeSchema = z.enum(["application/pdf", "image/jpeg", "image/png"]);

export type DocumentMimeType = z.infer<typeof documentMimeTypeSchema>;

/** Soporte visto por el dueño del envío. Nunca la clave del objeto ni una URL. */
export const documentSummarySchema = z.object({
  id: ulidSchema,
  shipmentId: ulidSchema,
  fileName: z.string(),
  mimeType: documentMimeTypeSchema,
  sizeBytes: z.number().int().positive(),
  createdAt: z.iso.datetime(),
});

export type DocumentSummary = z.infer<typeof documentSummarySchema>;

export const documentListResponseSchema = z.object({
  documents: z.array(documentSummarySchema),
});

export type DocumentListResponse = z.infer<typeof documentListResponseSchema>;

/** URL firmada de un solo uso práctico: vence en `expiresIn` segundos. */
export const downloadUrlResponseSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  expiresAt: z.iso.datetime(),
  expiresIn: z.number().int().positive().max(300),
});

export type DownloadUrlResponse = z.infer<typeof downloadUrlResponseSchema>;
