import { schema } from "@rutasegura/database";
import { drizzle } from "drizzle-orm/postgres-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Evidencia contra inyección SQL: se ejecutan los repositorios reales contra
 * una instancia de Drizzle sin conexión y se captura el SQL que generan.
 * Cada carga maliciosa debe viajar como parámetro (`$n`), nunca en el texto.
 */
type Captured = { query: string; params: unknown[] };
const captured: Captured[] = [];

const mockDb = drizzle.mock({
  schema,
  logger: { logQuery: (query, params) => captured.push({ query, params }) },
});

vi.mock("./db", () => ({
  db: () => mockDb,
  withRlsContext: (_context: unknown, fn: (tx: unknown) => unknown) => fn(mockDb),
}));

const { findUserByEmail, findUserById } = await import("./users");
const { findShipmentByPublicId, findShipmentByTrackingNumber, claimShipment } =
  await import("./shipments");
const { findDocumentByPublicId, listDocumentsByShipment, listDocumentsByOwner } =
  await import("./documents");

const PAYLOADS = [
  "' OR 1=1 --",
  "'; DROP TABLE users; --",
  "admin'/*",
  "x' UNION SELECT password_hash FROM users --",
];

/** Sin conexión la ejecución falla después de generar y registrar el SQL. */
async function capture(run: () => Promise<unknown>): Promise<Captured> {
  captured.length = 0;
  await run().catch(() => undefined);
  const last = captured.at(-1);
  if (!last) throw new Error("no se generó SQL");
  return last;
}

function expectParameterized({ query, params }: Captured, payload: string) {
  expect(query).not.toContain(payload);
  expect(query).toMatch(/\$\d+/);
  expect(params).toContain(payload);
}

beforeEach(() => {
  captured.length = 0;
});

describe("repositorios: consultas parametrizadas", () => {
  it.each(PAYLOADS)("búsqueda por correo: %s", async (payload) => {
    expectParameterized(await capture(() => findUserByEmail(payload)), payload);
  });

  it.each(PAYLOADS)("búsqueda por id: %s", async (payload) => {
    expectParameterized(await capture(() => findUserById(payload)), payload);
  });

  it.each(PAYLOADS)("búsqueda por guía: %s", async (payload) => {
    expectParameterized(
      await capture(() => findShipmentByTrackingNumber(mockDb as never, payload)),
      payload,
    );
  });

  it.each(PAYLOADS)("búsqueda por publicId: %s", async (payload) => {
    expectParameterized(
      await capture(() => findShipmentByPublicId(mockDb as never, payload)),
      payload,
    );
  });

  it.each(PAYLOADS)("documento por publicId: %s", async (payload) => {
    expectParameterized(
      await capture(() => findDocumentByPublicId(mockDb as never, payload)),
      payload,
    );
  });

  it.each(PAYLOADS)("documentos de un envío: %s", async (payload) => {
    expectParameterized(
      await capture(() => listDocumentsByShipment(mockDb as never, payload)),
      payload,
    );
  });

  it.each(PAYLOADS)("documentos de un dueño: %s", async (payload) => {
    expectParameterized(
      await capture(() => listDocumentsByOwner(mockDb as never, payload)),
      payload,
    );
  });

  it("los valores dentro de la etiqueta sql`` también son parámetros", async () => {
    const payload = PAYLOADS[1]!;
    expectParameterized(
      await capture(() => claimShipment(mockDb as never, "id", "owner", payload)),
      payload,
    );
  });
});

describe("contexto RLS", () => {
  it("set_config recibe user_id y mode como parámetros", async () => {
    vi.resetModules();
    vi.doMock("@/server/env", () => ({ getEnv: () => ({ DATABASE_URL: "postgres://x/y" }) }));
    vi.doMock("@rutasegura/database", () => ({
      getDatabase: () => ({
        transaction: (fn: (tx: unknown) => unknown) => fn(mockDb),
      }),
    }));
    vi.doUnmock("./db");
    const { withRlsContext } = await import("./db");

    const payload = "x', true); DROP TABLE shipments; --";
    const result = await capture(() =>
      withRlsContext({ userId: payload, mode: "claim" }, async () => undefined),
    );
    expect(result.query).toContain("set_config('app.user_id', $1, true)");
    expectParameterized(result, payload);
    expect(result.params).toContain("claim");
  });
});
