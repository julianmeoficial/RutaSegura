import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  API_ERRORS,
  apiErrorSchema,
  authUserResponseSchema,
  documentListResponseSchema,
  downloadUrlResponseSchema,
  healthResponseSchema,
  notificationListResponseSchema,
  registerResponseSchema,
  shipmentDetailSchema,
  shipmentListResponseSchema,
  shipmentSummarySchema,
  trackingResponseSchema,
  type ApiErrorCode,
} from "@rutasegura/contracts";

/**
 * Smoke de integración frontend-backend contra Docker (`scripts/smoke-auth.sh`).
 * Recorre por HTTP lo mismo que hace la UI (sesión con JWT, agenda y
 * documentos) y valida cada respuesta con los contratos que consume el
 * frontend: si la API cambia la forma de una respuesta, esta suite falla.
 */
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const ORIGIN = new URL(BASE_URL).origin;
/** IPs propias: no comparten cupos de rate limit con las otras suites. */
const INTEGRATION_IP = "198.51.100.31";
const RATE_LIMIT_IP = "198.51.100.32";
const GUIDE = { trackingNumber: "RS0000000008", phoneLast4: "6666" };
const UNKNOWN_ID = "01J8Z3K4M5N6P7Q8R9S0T1V2W3";

const runId = Date.now().toString(36);
const erin = {
  email: `erin.${runId}@smoke.test`,
  password: "caballo-bateria-grapa-08",
  fullName: "Erin Smoke",
};

type Jar = Map<string, string>;

function storeCookies(jar: Jar, response: Response) {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const index = pair!.indexOf("=");
    const value = pair!.slice(index + 1);
    if (value) jar.set(pair!.slice(0, index), value);
    else jar.delete(pair!.slice(0, index));
  }
}

async function call(
  method: string,
  path: string,
  {
    jar,
    body,
    ip = INTEGRATION_IP,
    origin = ORIGIN,
  }: {
    jar?: Jar;
    body?: unknown;
    ip?: string;
    origin?: string;
  } = {},
) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      origin,
      "x-forwarded-for": ip,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(jar ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (jar) storeCookies(jar, response);
  return response;
}

/**
 * La respuesta cumple el contrato del frontend y no trae campos de más: Zod
 * descarta las claves desconocidas, así que cualquier extra rompe la igualdad.
 */
async function expectContract<T extends z.ZodType>(response: Response, schema: T, status = 200) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const body: unknown = await response.json();
  const parsed = schema.parse(body);
  expect(parsed).toEqual(body);
  return parsed as z.infer<T>;
}

/** Error homogéneo: mismo formato, mensaje del catálogo, sin trazas ni detalles. */
async function expectApiError(response: Response, status: number, code: ApiErrorCode) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toMatch(/^application\/json/);
  const text = await response.text();
  const body = apiErrorSchema.strict().parse(JSON.parse(text));
  expect(body.error).toStrictEqual({ code, message: API_ERRORS[code].message });
  expect(text).not.toMatch(/stack|\bat \S+ \(|Error:|postgres|redis|minio/i);
  return response;
}

/** Fecha de Bogotá (UTC-5) dentro de `daysAhead` días que cae entre lunes y viernes. */
function bogotaWeekday(daysAhead: number): string {
  const date = new Date(Date.now() - 5 * 3600_000);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  while (![1, 2, 3, 4, 5].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

describe("smoke de integración frontend-backend", () => {
  const session: Jar = new Map();
  let firstRefresh = "";
  let shipmentId = "";

  it("la API está sana y responde el contrato de salud", async () => {
    await expectContract(await call("GET", "/api/v1/health"), healthResponseSchema);
  });

  describe("sesión con JWT de punta a punta", () => {
    it("registro y login: el JWT solo viaja en cookies HttpOnly, nunca en el cuerpo", async () => {
      await expectContract(
        await call("POST", "/api/v1/auth/register", { body: erin }),
        registerResponseSchema,
        201,
      );

      const login = await call("POST", "/api/v1/auth/login", {
        jar: session,
        body: { email: erin.email, password: erin.password },
      });
      const cookies = login.headers.getSetCookie();
      const { user } = await expectContract(login, authUserResponseSchema);
      expect(user).toMatchObject({ email: erin.email, fullName: erin.fullName, role: "customer" });

      expect(cookies.map((cookie) => cookie.split("=")[0]).sort()).toEqual(["rs_at", "rs_rt"]);
      for (const cookie of cookies) {
        expect(cookie).toMatch(/HttpOnly/);
        expect(cookie).toMatch(/SameSite=Lax/);
        expect(cookie).toMatch(/Path=\//);
      }
      firstRefresh = session.get("rs_rt")!;
      expect(JSON.stringify(user)).not.toContain(session.get("rs_at"));
    });

    it("la ruta protegida acepta el JWT y responde el contrato del usuario", async () => {
      const { user } = await expectContract(
        await call("GET", "/api/v1/auth/me", { jar: session }),
        authUserResponseSchema,
      );
      expect(user.email).toBe(erin.email);
    });

    it("JWT alterado o ausente: 401; el refresh renueva y rota la sesión", async () => {
      const [header, payload, signature] = session.get("rs_at")!.split(".");
      const forged = `${header}.${payload}.${signature![0] === "A" ? "B" : "A"}${signature!.slice(1)}`;
      await expectApiError(
        await call("GET", "/api/v1/auth/me", { jar: new Map([["rs_at", forged]]) }),
        401,
        "unauthorized",
      );

      // Como hace el navegador cuando vence la cookie de acceso: solo queda el refresh.
      session.delete("rs_at");
      await expectApiError(
        await call("GET", "/api/v1/auth/me", { jar: session }),
        401,
        "unauthorized",
      );

      const refreshed = await call("POST", "/api/v1/auth/refresh", { jar: session });
      await expectContract(refreshed, authUserResponseSchema);
      expect(session.get("rs_at")).toBeDefined();
      expect(session.get("rs_rt")).not.toBe(firstRefresh);
      await expectContract(
        await call("GET", "/api/v1/auth/me", { jar: session }),
        authUserResponseSchema,
      );
    });

    it("reutilizar un refresh ya rotado revoca la sesión entera", async () => {
      await expectApiError(
        await call("POST", "/api/v1/auth/refresh", { jar: new Map([["rs_rt", firstRefresh]]) }),
        401,
        "unauthorized",
      );
      await expectApiError(
        await call("GET", "/api/v1/auth/me", { jar: session }),
        401,
        "unauthorized",
      );

      session.clear();
      await expectContract(
        await call("POST", "/api/v1/auth/login", {
          jar: session,
          body: { email: erin.email, password: erin.password },
        }),
        authUserResponseSchema,
      );
    });
  });

  describe("agenda y documentos, como los consume la UI", () => {
    it("rastreo público con guía y segundo dato", async () => {
      const tracking = await expectContract(
        await call("POST", "/api/v1/tracking", { body: GUIDE }),
        trackingResponseSchema,
      );
      expect(tracking.trackingNumber).toBe(GUIDE.trackingNumber);
    });

    it("vincular la guía y verla en Mis envíos", async () => {
      const claimed = await expectContract(
        await call("POST", "/api/v1/shipments/claim", { jar: session, body: GUIDE }),
        shipmentSummarySchema,
      );
      expect(claimed.window).toBeNull();
      shipmentId = claimed.id;

      const { shipments } = await expectContract(
        await call("GET", "/api/v1/shipments", { jar: session }),
        shipmentListResponseSchema,
      );
      expect(shipments.map((shipment) => shipment.id)).toEqual([shipmentId]);
    });

    it("confirmar, reprogramar y cancelar la franja", async () => {
      const path = `/api/v1/shipments/${shipmentId}/schedule`;
      const first = { date: bogotaWeekday(2), slot: "10-12" };
      const second = { date: bogotaWeekday(4), slot: "14-16" };

      const scheduled = await expectContract(
        await call("PATCH", path, { jar: session, body: first }),
        shipmentSummarySchema,
      );
      expect(scheduled.window).toEqual(first);

      const rescheduled = await expectContract(
        await call("PATCH", path, { jar: session, body: second }),
        shipmentSummarySchema,
      );
      expect(rescheduled.window).toEqual(second);

      const cancelled = await expectContract(
        await call("DELETE", path, { jar: session }),
        shipmentSummarySchema,
      );
      expect(cancelled.window).toBeNull();
    });

    it("listar documentos, firmar y descargar el PDF", async () => {
      const { documents } = await expectContract(
        await call("GET", `/api/v1/shipments/${shipmentId}/documents`, { jar: session }),
        documentListResponseSchema,
      );
      expect(documents).toHaveLength(1);

      const signed = await expectContract(
        await call("POST", `/api/v1/documents/${documents[0]!.id}/download-url`, { jar: session }),
        downloadUrlResponseSchema,
      );
      expect(signed.expiresIn).toBe(60);

      const download = await fetch(signed.url);
      expect(download.status).toBe(200);
      expect(download.headers.get("content-disposition")).toMatch(/^attachment;/);
      expect(
        Buffer.from(await download.arrayBuffer())
          .subarray(0, 5)
          .toString(),
      ).toBe("%PDF-");
    });

    it("el detalle trae el recorrido y la bitácora refleja todo el flujo", async () => {
      const detail = await expectContract(
        await call("GET", `/api/v1/shipments/${shipmentId}`, { jar: session }),
        shipmentDetailSchema,
      );
      expect(detail.events.length).toBeGreaterThan(0);
      expect(detail.events.at(-1)?.status).toBe(detail.status);
      expect(detail.audit.map((event) => event.type)).toEqual([
        "claimed",
        "scheduled",
        "rescheduled",
        "unscheduled",
        "document_url_issued",
      ]);
    });

    it("los avisos simulados cumplen su contrato", async () => {
      const notifications = await expectContract(
        await call("GET", "/api/v1/notifications", { jar: session }),
        notificationListResponseSchema,
      );
      expect(notifications.notifications.length).toBeGreaterThan(0);
    });
  });

  describe("errores homogéneos", () => {
    it("400, 401, 403 y 404 con el formato y el mensaje del catálogo", async () => {
      await expectApiError(
        await call("POST", "/api/v1/shipments/claim", { jar: session, body: {} }),
        400,
        "bad_request",
      );
      await expectApiError(
        await call("PATCH", `/api/v1/shipments/${shipmentId}/schedule`, {
          jar: session,
          body: { date: bogotaWeekday(-7), slot: "10-12" },
        }),
        400,
        "invalid_schedule",
      );
      await expectApiError(await call("GET", "/api/v1/shipments"), 401, "unauthorized");
      await expectApiError(
        await call("POST", "/api/v1/auth/login", {
          body: { email: erin.email, password: "otra-clave-incorrecta" },
        }),
        401,
        "invalid_credentials",
      );
      await expectApiError(
        await call("POST", "/api/v1/shipments/claim", {
          jar: session,
          body: GUIDE,
          origin: "https://atacante.example",
        }),
        403,
        "forbidden",
      );
      await expectApiError(
        await call("GET", `/api/v1/shipments/${UNKNOWN_ID}`, { jar: session }),
        404,
        "not_found",
      );
      await expectApiError(
        await call("POST", "/api/v1/tracking", {
          body: { trackingNumber: GUIDE.trackingNumber, phoneLast4: "0000" },
        }),
        404,
        "tracking_not_found",
      );
    });

    it("429 con Retry-After y el mismo formato", async () => {
      let limited: Response | undefined;
      for (let i = 0; i < 10 && !limited; i++) {
        const response = await call("POST", "/api/v1/tracking", {
          ip: RATE_LIMIT_IP,
          body: { trackingNumber: "RS9999999998", phoneLast4: "0000" },
        });
        if (response.status === 429) limited = response;
      }
      expect(limited, "el rastreo nunca respondió 429").toBeDefined();
      expect(Number(limited!.headers.get("retry-after"))).toBeGreaterThan(0);
      await expectApiError(limited!, 429, "rate_limited");
    });
  });

  it("el logout revoca el JWT y el refresh de inmediato", async () => {
    const access = session.get("rs_at")!;
    const refresh = session.get("rs_rt")!;
    const logout = await call("POST", "/api/v1/auth/logout", { jar: session });
    expect(logout.status).toBe(204);

    await expectApiError(
      await call("GET", "/api/v1/auth/me", { jar: new Map([["rs_at", access]]) }),
      401,
      "unauthorized",
    );
    await expectApiError(
      await call("POST", "/api/v1/auth/refresh", { jar: new Map([["rs_rt", refresh]]) }),
      401,
      "unauthorized",
    );
  });
});
