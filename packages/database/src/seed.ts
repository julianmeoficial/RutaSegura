import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadRootEnv } from "./load-env";
import * as schema from "./schema";
import { phoneLast4Digest } from "./tracking-digest";

type SeedDocument = { key: string; fileName: string };

type SeedShipment = {
  trackingNumber: string;
  recipientName: string;
  phoneLast4: string;
  events: { status: (typeof schema.shipmentStatus.enumValues)[number]; city: string; at: string }[];
  /** Archivos de `fixtures/documents`, que minio-init sube al bucket privado. */
  documents?: SeedDocument[];
};

/**
 * Datos ficticios para desarrollo y pruebas. Nunca datos reales. RS0000000003
 * es de la prueba smoke de documentos; RS0000000004 y RS0000000005, de los
 * flujos E2E en Chromium y WebKit; RS0000000006 y RS0000000007, del smoke de UI
 * de flujos críticos (uno por motor), y RS0000000008, del smoke de integración.
 * RS0000000009 a RS0000000012 ya están vinculadas a las cuentas demo.
 */
const SEED_SHIPMENTS: SeedShipment[] = [
  {
    trackingNumber: "RS0000000001",
    recipientName: "Destinatario de prueba 1",
    phoneLast4: "4321",
    events: [
      { status: "created", city: "Bogotá", at: "2026-09-20T13:00:00Z" },
      { status: "in_transit", city: "Bogotá", at: "2026-09-21T09:30:00Z" },
      { status: "in_transit", city: "Medellín", at: "2026-09-22T07:15:00Z" },
    ],
    documents: [
      { key: "k7q2m9x4v1c8b3n6", fileName: "Guía de transporte.pdf" },
      { key: "p4w8z1r6t3y9h2j5", fileName: "Factura.pdf" },
    ],
  },
  {
    trackingNumber: "RS0000000002",
    recipientName: "Destinatario de prueba 2",
    phoneLast4: "9876",
    events: [
      { status: "created", city: "Cali", at: "2026-09-18T15:00:00Z" },
      { status: "in_transit", city: "Cali", at: "2026-09-19T10:00:00Z" },
      { status: "delivered", city: "Barranquilla", at: "2026-09-21T16:40:00Z" },
    ],
  },
  {
    trackingNumber: "RS0000000003",
    recipientName: "Destinatario de prueba 3",
    phoneLast4: "5555",
    events: [
      { status: "created", city: "Bogotá", at: "2026-09-24T12:00:00Z" },
      { status: "in_transit", city: "Cartagena", at: "2026-09-25T08:00:00Z" },
    ],
    documents: [{ key: "f6d3s8a1g5h9j2k4", fileName: "Soporte de entrega.pdf" }],
  },
  {
    trackingNumber: "RS0000000004",
    recipientName: "Destinatario de prueba 4",
    phoneLast4: "1111",
    events: [
      { status: "created", city: "Medellín", at: "2026-09-24T12:00:00Z" },
      { status: "in_transit", city: "Turbaco", at: "2026-09-25T08:00:00Z" },
    ],
    documents: [{ key: "n2b7v4c9x1z6m3q8", fileName: "Guía de transporte.pdf" }],
  },
  {
    trackingNumber: "RS0000000005",
    recipientName: "Destinatario de prueba 5",
    phoneLast4: "2222",
    events: [
      { status: "created", city: "Cali", at: "2026-09-24T12:00:00Z" },
      { status: "in_transit", city: "Pasto", at: "2026-09-25T08:00:00Z" },
    ],
    documents: [{ key: "r9t2y5u8i1o4p7a3", fileName: "Guía de transporte.pdf" }],
  },
  {
    trackingNumber: "RS0000000006",
    recipientName: "Destinatario de prueba 6",
    phoneLast4: "3333",
    events: [
      { status: "created", city: "Bogotá", at: "2026-10-01T12:00:00Z" },
      { status: "in_transit", city: "Tunja", at: "2026-10-02T08:00:00Z" },
    ],
    documents: [{ key: "h3k8m2q7w4z9c1v6", fileName: "Guía de transporte.pdf" }],
  },
  {
    trackingNumber: "RS0000000007",
    recipientName: "Destinatario de prueba 7",
    phoneLast4: "4444",
    events: [
      { status: "created", city: "Medellín", at: "2026-10-01T12:00:00Z" },
      { status: "in_transit", city: "Manizales", at: "2026-10-02T08:00:00Z" },
    ],
    documents: [{ key: "t5n1b8x3r7y2d9f4", fileName: "Guía de transporte.pdf" }],
  },
  {
    trackingNumber: "RS0000000008",
    recipientName: "Destinatario de prueba 8",
    phoneLast4: "6666",
    events: [
      { status: "created", city: "Cali", at: "2026-10-01T12:00:00Z" },
      { status: "in_transit", city: "Popayán", at: "2026-10-02T08:00:00Z" },
    ],
    documents: [{ key: "w9c4j7p2k5m8s1g3", fileName: "Guía de transporte.pdf" }],
  },
  {
    trackingNumber: "RS0000000009",
    recipientName: "Destinatario de prueba 9",
    phoneLast4: "7070",
    events: [
      { status: "created", city: "Bogotá", at: "2026-10-08T14:00:00Z" },
      { status: "in_transit", city: "Bogotá", at: "2026-10-09T06:30:00Z" },
      { status: "in_transit", city: "La Dorada", at: "2026-10-10T11:10:00Z" },
      { status: "in_transit", city: "Medellín", at: "2026-10-12T08:45:00Z" },
      { status: "out_for_delivery", city: "Medellín", at: "2026-10-14T12:20:00Z" },
    ],
    documents: [
      { key: "a8d2f6h1j9k3m5n7", fileName: "Guía de transporte.pdf" },
      { key: "b4c7e1g9i3k6m2p8", fileName: "Factura.pdf" },
    ],
  },
  {
    trackingNumber: "RS0000000010",
    recipientName: "Destinatario de prueba 10",
    phoneLast4: "8080",
    events: [
      { status: "created", city: "Cali", at: "2026-10-01T15:00:00Z" },
      { status: "in_transit", city: "Cali", at: "2026-10-02T09:00:00Z" },
      { status: "in_transit", city: "Armenia", at: "2026-10-03T13:30:00Z" },
      { status: "out_for_delivery", city: "Pereira", at: "2026-10-05T13:00:00Z" },
      { status: "delivered", city: "Pereira", at: "2026-10-05T19:40:00Z" },
    ],
    documents: [{ key: "c9e3g7j2l5n8q1s4", fileName: "Soporte de entrega.pdf" }],
  },
  {
    trackingNumber: "RS0000000011",
    recipientName: "Destinatario de prueba 11",
    phoneLast4: "9090",
    events: [
      { status: "created", city: "Barranquilla", at: "2026-10-06T16:00:00Z" },
      { status: "in_transit", city: "Barranquilla", at: "2026-10-07T07:00:00Z" },
      { status: "in_transit", city: "Cartagena", at: "2026-10-08T10:30:00Z" },
      { status: "exception", city: "Cartagena", at: "2026-10-09T15:15:00Z" },
    ],
    documents: [{ key: "d2f5h8k1m4p7r9t3", fileName: "Guía de transporte.pdf" }],
  },
  {
    trackingNumber: "RS0000000012",
    recipientName: "Destinatario de prueba 12",
    phoneLast4: "1212",
    events: [{ status: "created", city: "Bucaramanga", at: "2026-10-13T17:00:00Z" }],
  },
];

/**
 * Cuentas demo con contraseña pública, sembradas en todos los entornos a
 * propósito para mostrar el portal (docs/datos-de-prueba.md). El hash es
 * Argon2id con los parámetros de la app (m=19456, t=2, p=1) para
 * `RutaSegura-Demo-2026`.
 */
const DEMO_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$tGU8Em/LF3n4wgc1Vejkww$qCvom8chWsXnauQJ7+TY7zhCO6b3q0UERzTd+jBDL1E";

const DEMO_USERS: { email: string; fullName: string; trackingNumbers: string[] }[] = [
  {
    email: "ana.demo@rutasegura.test",
    fullName: "Ana Demo",
    trackingNumbers: ["RS0000000009", "RS0000000010"],
  },
  {
    email: "luis.demo@rutasegura.test",
    fullName: "Luis Demo",
    trackingNumbers: ["RS0000000011", "RS0000000012"],
  },
];

const DEMO_NOTIFICATION_BODY =
  "Hay una novedad en uno de tus envíos. Entra a RutaSegura para ver el detalle.";

const FIXTURES = new URL("../fixtures/documents/", import.meta.url);
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** ULID: 48 bits de tiempo y 80 aleatorios, igual que el de la app. */
function ulid(now = Date.now()): string {
  let time = "";
  for (let value = now, i = 0; i < 10; i++, value = Math.floor(value / 32)) {
    time = CROCKFORD[value % 32] + time;
  }
  const random = randomBytes(16);
  let rest = "";
  for (let i = 0; i < 16; i++) rest += CROCKFORD[random[i]! % 32];
  return time + rest;
}

async function main() {
  loadRootEnv();
  const databaseUrl = process.env.DATABASE_URL;
  const hmacSecret = process.env.HMAC_SECRET;
  if (!databaseUrl || !hmacSecret) {
    throw new Error("DATABASE_URL y HMAC_SECRET son obligatorias para la semilla.");
  }

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    const owners = new Map<string, string>();
    for (const demo of DEMO_USERS) {
      const [created] = await db
        .insert(schema.users)
        .values({ email: demo.email, fullName: demo.fullName, passwordHash: DEMO_PASSWORD_HASH })
        .onConflictDoNothing({ target: schema.users.email })
        .returning({ id: schema.users.id });
      const [user] = created
        ? [created]
        : await db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.email, demo.email));
      if (!user) continue;
      for (const trackingNumber of demo.trackingNumbers) owners.set(trackingNumber, user.id);
      if (created) {
        await db.insert(schema.notifications).values({
          userId: user.id,
          kind: "shipment_status_changed",
          body: DEMO_NOTIFICATION_BODY,
        });
      }
    }

    let documentCount = 0;
    for (const item of SEED_SHIPMENTS) {
      const last = item.events.at(-1);
      const ownerId = owners.get(item.trackingNumber) ?? null;
      const [inserted] = await db
        .insert(schema.shipments)
        .values({
          trackingNumber: item.trackingNumber,
          recipientName: item.recipientName,
          recipientPhoneLast4Hmac: phoneLast4Digest(
            hmacSecret,
            item.trackingNumber,
            item.phoneLast4,
          ),
          status: last?.status ?? "created",
          ownerId,
          publicId: ownerId ? ulid() : null,
        })
        .onConflictDoNothing({ target: schema.shipments.trackingNumber })
        .returning({ id: schema.shipments.id });

      if (inserted) {
        await db.insert(schema.shipmentEvents).values(
          item.events.map((event) => ({
            shipmentId: inserted.id,
            status: event.status,
            city: event.city,
            occurredAt: new Date(event.at),
          })),
        );
        if (ownerId) {
          await db
            .insert(schema.shipmentAuditEvents)
            .values({ shipmentId: inserted.id, actorUserId: ownerId, type: "claimed" });
        }
      }

      if (!item.documents?.length) continue;
      const [shipment] = await db
        .select({ id: schema.shipments.id })
        .from(schema.shipments)
        .where(eq(schema.shipments.trackingNumber, item.trackingNumber));
      if (!shipment) continue;

      for (const document of item.documents) {
        const content = readFileSync(new URL(`${document.key}.pdf`, FIXTURES));
        await db
          .insert(schema.documents)
          .values({
            publicId: ulid(),
            shipmentId: shipment.id,
            objectKey: `documents/${document.key}`,
            fileName: document.fileName,
            mimeType: "application/pdf",
            sizeBytes: content.byteLength,
            sha256: createHash("sha256").update(content).digest("hex"),
          })
          .onConflictDoNothing({ target: schema.documents.objectKey });
        documentCount++;
      }
    }
    console.log(
      `Semilla aplicada: ${SEED_SHIPMENTS.length} envíos, ${documentCount} documentos y ${DEMO_USERS.length} cuentas demo ficticias.`,
    );
  } finally {
    await client.end();
  }
}

await main();
