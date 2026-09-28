import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadRootEnv } from "./load-env";
import * as schema from "./schema";
import { phoneLast4Digest } from "./tracking-digest";

type SeedShipment = {
  trackingNumber: string;
  recipientName: string;
  phoneLast4: string;
  events: { status: (typeof schema.shipmentStatus.enumValues)[number]; city: string; at: string }[];
};

/** Datos ficticios para desarrollo y pruebas smoke. Nunca datos reales. */
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
];

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
    for (const item of SEED_SHIPMENTS) {
      const last = item.events.at(-1);
      const [shipment] = await db
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
        })
        .onConflictDoNothing({ target: schema.shipments.trackingNumber })
        .returning({ id: schema.shipments.id });

      if (!shipment) continue;

      await db.insert(schema.shipmentEvents).values(
        item.events.map((event) => ({
          shipmentId: shipment.id,
          status: event.status,
          city: event.city,
          occurredAt: new Date(event.at),
        })),
      );
    }
    console.log(`Semilla aplicada: ${SEED_SHIPMENTS.length} envíos ficticios.`);
  } finally {
    await client.end();
  }
}

await main();
