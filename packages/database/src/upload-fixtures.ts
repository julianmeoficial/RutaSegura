import { readdirSync, readFileSync } from "node:fs";
import {
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
  type S3ServiceException,
} from "@aws-sdk/client-s3";
import { loadRootEnv } from "./load-env";

/**
 * Sube los PDF ficticios de la semilla a un almacenamiento S3 compatible fuera
 * de Docker (por ejemplo Supabase Storage), con la misma clave opaca que usa
 * `scripts/minio-init.sh`: `documents/<nombre sin extensión>`. Los objetos que
 * ya existen no se vuelven a subir.
 */
const FIXTURES = new URL("../fixtures/documents/", import.meta.url);
const REQUIRED = [
  "STORAGE_ENDPOINT",
  "STORAGE_REGION",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
] as const;

async function exists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (
      error instanceof NotFound ||
      (error as S3ServiceException).$metadata?.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
  }
}

async function main() {
  loadRootEnv();
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de almacenamiento: ${missing.join(", ")}.`);
  }
  const bucket = process.env.STORAGE_BUCKET!;
  const client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT!,
    region: process.env.STORAGE_REGION!,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  const files = readdirSync(FIXTURES).filter((name) => name.endsWith(".pdf"));
  let uploaded = 0;
  for (const name of files) {
    const key = `documents/${name.slice(0, -".pdf".length)}`;
    if (await exists(client, bucket, key)) continue;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: readFileSync(new URL(name, FIXTURES)),
        ContentType: "application/pdf",
      }),
    );
    uploaded++;
  }
  console.log(`Documentos: ${uploaded} subidos, ${files.length - uploaded} ya existían.`);
}

await main();
