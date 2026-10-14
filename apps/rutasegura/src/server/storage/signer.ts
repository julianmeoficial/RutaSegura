import "server-only";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@/server/env";

export type StorageConfig = {
  /** Host con el que se firma la URL; debe ser el que abre el navegador. */
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  ttlSeconds: number;
};

/** El almacenamiento no está configurado: la ruta responde 503, nunca una URL pública. */
export class StorageUnavailableError extends Error {
  constructor() {
    super("storage_unavailable");
    this.name = "StorageUnavailableError";
  }
}

export function storageConfig(): StorageConfig {
  const env = getEnv();
  const endpoint = env.STORAGE_PUBLIC_ENDPOINT ?? env.STORAGE_ENDPOINT;
  const { STORAGE_REGION, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY } = env;
  if (
    !endpoint ||
    !STORAGE_REGION ||
    !STORAGE_BUCKET ||
    !STORAGE_ACCESS_KEY_ID ||
    !STORAGE_SECRET_ACCESS_KEY
  ) {
    throw new StorageUnavailableError();
  }
  return {
    endpoint,
    region: STORAGE_REGION,
    bucket: STORAGE_BUCKET,
    accessKeyId: STORAGE_ACCESS_KEY_ID,
    secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
    ttlSeconds: env.SIGNED_URL_TTL_SECONDS,
  };
}

const clients = new Map<string, S3Client>();

function clientFor(config: StorageConfig): S3Client {
  const key = `${config.endpoint}|${config.region}|${config.accessKeyId}`;
  let client = clients.get(key);
  if (!client) {
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      // MinIO y la mayoría de proveedores compatibles no usan subdominio por bucket.
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    clients.set(key, client);
  }
  return client;
}

/** Nombre seguro para `Content-Disposition`: ASCII imprimible sin comillas ni barras. */
export function contentDisposition(fileName: string): string {
  const ascii = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\/;]/g, "_")
    .trim();
  const fallback = ascii.length > 0 ? ascii : "documento";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export type SignedDownload = { url: string; expiresAt: string; expiresIn: number };

/**
 * URL firmada de descarga (SigV4, `X-Amz-Expires`). La URL no se guarda ni se
 * registra en logs: quien la tenga puede descargar hasta que venza.
 */
export async function presignDownload(
  config: StorageConfig,
  object: { objectKey: string; fileName: string; mimeType: string },
  now: Date = new Date(),
): Promise<SignedDownload> {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: object.objectKey,
    ResponseContentDisposition: contentDisposition(object.fileName),
    ResponseContentType: object.mimeType,
    ResponseCacheControl: "no-store",
  });
  const url = await getSignedUrl(clientFor(config), command, {
    expiresIn: config.ttlSeconds,
    signingDate: now,
  });
  return {
    url,
    expiresAt: new Date(now.getTime() + config.ttlSeconds * 1000).toISOString(),
    expiresIn: config.ttlSeconds,
  };
}
