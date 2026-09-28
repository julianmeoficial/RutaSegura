import { describe, expect, it } from "vitest";

/**
 * Pruebas smoke contra el entorno Docker (`scripts/smoke-auth.sh`). Recorren el
 * flujo real: HTTP, Next, PostgreSQL y Redis, sin simulaciones.
 */
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const ORIGIN = new URL(BASE_URL).origin;

const runId = Date.now().toString(36);
const alice = {
  email: `alice.${runId}@smoke.test`,
  password: "caballo-bateria-grapa-01",
  fullName: "Alice Smoke",
};
const bob = {
  email: `bob.${runId}@smoke.test`,
  password: "caballo-bateria-grapa-02",
  fullName: "Bob Smoke",
};

type Jar = Map<string, string>;

function storeCookies(jar: Jar, response: Response) {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const index = pair!.indexOf("=");
    const name = pair!.slice(0, index);
    const value = pair!.slice(index + 1);
    if (value) jar.set(name, value);
    else jar.delete(name);
  }
}

function cookieHeader(jar: Jar): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function post(path: string, body?: unknown, jar?: Jar, headers: Record<string, string> = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      origin: ORIGIN,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(jar ? { cookie: cookieHeader(jar) } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (jar) storeCookies(jar, response);
  return response;
}

async function me(jar: Jar) {
  return fetch(`${BASE_URL}/api/v1/auth/me`, { headers: { cookie: cookieHeader(jar) } });
}

/**
 * IP propia para los casos de envíos: así no consumen el cupo por IP que las
 * pruebas de login y rastreo agotan a propósito.
 */
const SHIPMENTS_IP = { "x-forwarded-for": "198.51.100.19" };

async function request(method: string, path: string, jar?: Jar, body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      origin: ORIGIN,
      ...SHIPMENTS_IP,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(jar ? { cookie: cookieHeader(jar) } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Fecha de Bogotá (UTC-5) dentro de `daysAhead` días que cae en el día `weekdays`. */
function bogotaDate(daysAhead: number, weekdays: number[]): string {
  const date = new Date(Date.now() - 5 * 3600_000);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  while (!weekdays.includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

describe("smoke de autenticación en Docker", () => {
  const session: Jar = new Map();
  let firstRefresh = "";

  it("el servicio está sano", async () => {
    const response = await fetch(`${BASE_URL}/api/v1/health`);
    expect(response.status).toBe(200);
  });

  it("registra con hash seguro y rechaza contraseñas débiles", async () => {
    const weak = await post("/api/v1/auth/register", { ...alice, password: "corta" });
    expect(weak.status).toBe(400);

    for (const user of [alice, bob]) {
      const response = await post("/api/v1/auth/register", user);
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ status: "accepted" });
    }

    const duplicate = await post("/api/v1/auth/register", alice);
    expect(duplicate.status).toBe(201);
    expect(await duplicate.json()).toEqual({ status: "accepted" });
  });

  it("el login emite el JWT en cookies HttpOnly y SameSite=Lax", async () => {
    const response = await post(
      "/api/v1/auth/login",
      { email: alice.email, password: alice.password },
      session,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.email).toBe(alice.email);
    expect(body.user).not.toHaveProperty("passwordHash");

    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
    }
    expect(response.headers.get("ratelimit-limit")).not.toBeNull();

    const jwt = session.get("rs_at")!;
    expect(JSON.parse(Buffer.from(jwt.split(".")[0]!, "base64url").toString()).alg).toBe("HS256");
    firstRefresh = session.get("rs_rt")!;
  });

  it("la ruta protegida valida el JWT", async () => {
    const ok = await me(session);
    expect(ok.status).toBe(200);
    expect((await ok.json()).user.email).toBe(alice.email);

    const anonymous = await fetch(`${BASE_URL}/api/v1/auth/me`);
    expect(anonymous.status).toBe(401);

    const [header, payload, signature] = session.get("rs_at")!.split(".");
    const claims = JSON.parse(Buffer.from(payload!, "base64url").toString());
    claims.role = "admin";
    const forged = [
      header,
      Buffer.from(JSON.stringify(claims)).toString("base64url"),
      signature,
    ].join(".");
    const tampered = await me(new Map([["rs_at", forged]]));
    expect(tampered.status).toBe(401);
  });

  it("rota el refresh token y detecta su reutilización", async () => {
    const rotated = await post("/api/v1/auth/refresh", undefined, session);
    expect(rotated.status).toBe(200);
    expect(session.get("rs_rt")).not.toBe(firstRefresh);
    expect((await me(session)).status).toBe(200);

    const replay = await post(
      "/api/v1/auth/refresh",
      undefined,
      new Map([["rs_rt", firstRefresh]]),
    );
    expect(replay.status).toBe(401);

    // La reutilización revoca toda la familia: la sesión rotada también cae.
    expect((await me(session)).status).toBe(401);
  });

  it("el logout invalida la sesión de inmediato", async () => {
    const fresh: Jar = new Map();
    await post("/api/v1/auth/login", { email: alice.email, password: alice.password }, fresh);
    const stolenAccess = fresh.get("rs_at")!;
    expect((await me(fresh)).status).toBe(200);

    const response = await post("/api/v1/auth/logout", undefined, fresh);
    expect(response.status).toBe(204);
    expect((await me(new Map([["rs_at", stolenAccess]]))).status).toBe(401);
  });

  // Agenda de entregas (Phase 9). Va antes de las pruebas de rastreo, que agotan
  // el límite por guía de RS0000000001 que el reclamo comparte.
  const aliceShipments: Jar = new Map();
  const bobShipments: Jar = new Map();
  let aliceShipmentId = "";

  it("los endpoints de envíos exigen sesión", async () => {
    const fakeId = "01J8Z3K4M5N6P7Q8R9S0T1V2W3";
    const responses = await Promise.all([
      request("GET", "/api/v1/shipments"),
      request("GET", `/api/v1/shipments/${fakeId}`),
      request("PATCH", `/api/v1/shipments/${fakeId}/schedule`, undefined, {
        date: "2030-01-01",
        slot: "08-10",
      }),
      request("POST", "/api/v1/shipments/claim", undefined, {
        trackingNumber: "RS0000000001",
        phoneLast4: "4321",
      }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("unauthorized");
    }
  });

  it("Alice reclama RS0000000001 y el reclamo es idempotente", async () => {
    for (const [user, jar] of [
      [alice, aliceShipments],
      [bob, bobShipments],
    ] as const) {
      const login = await post(
        "/api/v1/auth/login",
        { email: user.email, password: user.password },
        jar,
        SHIPMENTS_IP,
      );
      expect(login.status).toBe(200);
    }

    const claim = await request("POST", "/api/v1/shipments/claim", aliceShipments, {
      trackingNumber: "RS0000000001",
      phoneLast4: "4321",
    });
    expect(claim.status).toBe(200);
    const shipment = await claim.json();
    expect(shipment).toEqual({
      id: expect.stringMatching(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/),
      trackingNumber: "RS0000000001",
      status: "in_transit",
      window: null,
    });
    aliceShipmentId = shipment.id;

    const again = await request("POST", "/api/v1/shipments/claim", aliceShipments, {
      trackingNumber: "RS0000000001",
      phoneLast4: "4321",
    });
    expect(again.status).toBe(200);
    expect((await again.json()).id).toBe(aliceShipmentId);
  });

  it("Alice agenda y reprograma; las franjas inválidas se rechazan", async () => {
    const path = `/api/v1/shipments/${aliceShipmentId}/schedule`;
    const first = bogotaDate(2, [1, 2, 3, 4, 5]);
    const later = bogotaDate(3, [1, 2, 3, 4, 5]);

    const scheduled = await request("PATCH", path, aliceShipments, { date: first, slot: "08-10" });
    expect(scheduled.status).toBe(200);
    expect((await scheduled.json()).window).toEqual({ date: first, slot: "08-10" });

    const rescheduled = await request("PATCH", path, aliceShipments, {
      date: later,
      slot: "14-16",
    });
    expect(rescheduled.status).toBe(200);

    const weekend = await request("PATCH", path, aliceShipments, {
      date: bogotaDate(1, [6]),
      slot: "10-12",
    });
    expect(weekend.status).toBe(400);
    expect((await weekend.json()).error.code).toBe("invalid_schedule");

    const past = await request("PATCH", path, aliceShipments, {
      date: bogotaDate(-7, [1, 2, 3, 4, 5]),
      slot: "10-12",
    });
    expect((await past.json()).error.code).toBe("invalid_schedule");

    const withOwner = await request("PATCH", path, aliceShipments, {
      date: later,
      slot: "08-10",
      ownerId: "cualquiera",
    });
    expect(withOwner.status).toBe(400);
    expect((await withOwner.json()).error.code).toBe("bad_request");
  });

  it("el detalle de Alice trae la bitácora, sin datos del destinatario", async () => {
    const response = await request("GET", `/api/v1/shipments/${aliceShipmentId}`, aliceShipments);
    expect(response.status).toBe(200);
    const detail = await response.json();
    expect(detail.window.slot).toBe("14-16");
    expect(detail.audit.map((event: { type: string }) => event.type)).toEqual([
      "claimed",
      "scheduled",
      "rescheduled",
    ]);
    expect(JSON.stringify(detail)).not.toMatch(/recipient|Destinatario|4321|ownerId/);
  });

  it("Bob recibe 404 sobre el envío de Alice, igual que con un ULID inexistente", async () => {
    const unknownId = "01J8Z3K4M5N6P7Q8R9S0T1V2W3";

    const read = await request("GET", `/api/v1/shipments/${aliceShipmentId}`, bobShipments);
    const readUnknown = await request("GET", `/api/v1/shipments/${unknownId}`, bobShipments);
    expect(read.status).toBe(404);
    expect(readUnknown.status).toBe(404);
    expect(await read.json()).toEqual(await readUnknown.json());

    const body = { date: bogotaDate(4, [1, 2, 3, 4, 5]), slot: "16-18" };
    const write = await request(
      "PATCH",
      `/api/v1/shipments/${aliceShipmentId}/schedule`,
      bobShipments,
      body,
    );
    const writeUnknown = await request(
      "PATCH",
      `/api/v1/shipments/${unknownId}/schedule`,
      bobShipments,
      body,
    );
    expect(write.status).toBe(404);
    expect(writeUnknown.status).toBe(404);
    expect(await write.json()).toEqual(await writeUnknown.json());

    const steal = await request("POST", "/api/v1/shipments/claim", bobShipments, {
      trackingNumber: "RS0000000001",
      phoneLast4: "4321",
    });
    expect(steal.status).toBe(404);

    const bobList = await request("GET", "/api/v1/shipments", bobShipments);
    expect((await bobList.json()).shipments).toEqual([]);

    const unchanged = await request("GET", `/api/v1/shipments/${aliceShipmentId}`, aliceShipments);
    expect((await unchanged.json()).window.slot).toBe("14-16");
  });

  it("la lista de Alice solo incluye sus envíos reclamados", async () => {
    const response = await request("GET", "/api/v1/shipments", aliceShipments);
    expect(response.status).toBe(200);
    expect(response.headers.get("ratelimit-limit")).not.toBeNull();
    const { shipments } = await response.json();
    expect(shipments.map((s: { trackingNumber: string }) => s.trackingNumber)).toEqual([
      "RS0000000001",
    ]);
  });

  it("los avisos exigen sesión", async () => {
    const list = await request("GET", "/api/v1/notifications");
    const read = await request("POST", "/api/v1/notifications/read");
    expect(list.status).toBe(401);
    expect(read.status).toBe(401);
  });

  it("Alice ve sus avisos genéricos y Bob no ve ni marca los de Alice", async () => {
    const aliceList = await request("GET", "/api/v1/notifications", aliceShipments);
    expect(aliceList.status).toBe(200);
    expect(aliceList.headers.get("ratelimit-limit")).not.toBeNull();
    const alice = await aliceList.json();
    expect(alice.unreadCount).toBe(2);
    expect(alice.notifications.map((n: { kind: string }) => n.kind)).toEqual([
      "shipment_rescheduled",
      "shipment_scheduled",
    ]);
    expect(JSON.stringify(alice)).not.toMatch(
      /RS\d{10}|[0-7][0-9A-HJKMNP-TV-Z]{25}|Destinatario|4321|userId|\d{2}-\d{2}"/,
    );

    const bobList = await request("GET", "/api/v1/notifications", bobShipments);
    expect(await bobList.json()).toEqual({ notifications: [], unreadCount: 0 });

    const bobRead = await request("POST", "/api/v1/notifications/read", bobShipments);
    expect(bobRead.status).toBe(200);
    const stillUnread = await request("GET", "/api/v1/notifications", aliceShipments);
    expect((await stillUnread.json()).unreadCount).toBe(2);

    const forged = await request("GET", `/api/v1/notifications?userId=${"x"}`, bobShipments);
    expect(forged.status).toBe(400);
  });

  it("Alice marca sus avisos como leídos", async () => {
    const read = await request("POST", "/api/v1/notifications/read", aliceShipments);
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual({ unreadCount: 0 });

    const after = await request("GET", "/api/v1/notifications?limit=1", aliceShipments);
    const body = await after.json();
    expect(body.unreadCount).toBe(0);
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].read).toBe(true);
  });

  it("cancelar la agenda exige sesión", async () => {
    const response = await request("DELETE", `/api/v1/shipments/${aliceShipmentId}/schedule`);
    expect(response.status).toBe(401);
  });

  it("Bob no puede cancelar la agenda de Alice: 404 igual que con un ULID inexistente", async () => {
    const unknownId = "01J8Z3K4M5N6P7Q8R9S0T1V2W3";

    const cancel = await request(
      "DELETE",
      `/api/v1/shipments/${aliceShipmentId}/schedule`,
      bobShipments,
    );
    const cancelUnknown = await request(
      "DELETE",
      `/api/v1/shipments/${unknownId}/schedule`,
      bobShipments,
    );
    expect(cancel.status).toBe(404);
    expect(cancelUnknown.status).toBe(404);
    expect(await cancel.json()).toEqual(await cancelUnknown.json());

    const unchanged = await request("GET", `/api/v1/shipments/${aliceShipmentId}`, aliceShipments);
    expect((await unchanged.json()).window.slot).toBe("14-16");
  });

  it("Alice cancela su agenda de forma idempotente", async () => {
    const path = `/api/v1/shipments/${aliceShipmentId}/schedule`;

    const cancelled = await request("DELETE", path, aliceShipments);
    expect(cancelled.status).toBe(200);
    expect(cancelled.headers.get("ratelimit-limit")).not.toBeNull();
    expect(await cancelled.json()).toEqual({
      id: aliceShipmentId,
      trackingNumber: "RS0000000001",
      status: expect.any(String),
      window: null,
    });

    const again = await request("DELETE", path, aliceShipments);
    expect(again.status).toBe(200);
    expect((await again.json()).window).toBeNull();
  });

  it("la cancelación queda en la bitácora y genera un único aviso genérico", async () => {
    const detail = await request("GET", `/api/v1/shipments/${aliceShipmentId}`, aliceShipments);
    expect((await detail.json()).audit.map((event: { type: string }) => event.type)).toEqual([
      "claimed",
      "scheduled",
      "rescheduled",
      "unscheduled",
    ]);

    const list = await request("GET", "/api/v1/notifications?limit=1", aliceShipments);
    const body = await list.json();
    expect(body.unreadCount).toBe(1);
    expect(body.notifications[0].kind).toBe("shipment_unscheduled");
    expect(JSON.stringify(body)).not.toMatch(/RS\d{10}|[0-7][0-9A-HJKMNP-TV-Z]{25}|userId/);
  });

  it("bloquea la cuenta tras 5 fallos con una respuesta idéntica", async () => {
    const bodies = [];
    for (let i = 0; i < 5; i++) {
      const response = await post("/api/v1/auth/login", {
        email: bob.email,
        password: `incorrecta-${i}`,
      });
      expect(response.status).toBe(401);
      bodies.push(await response.json());
    }

    const locked = await post("/api/v1/auth/login", { email: bob.email, password: bob.password });
    expect(locked.status).toBe(401);
    expect(await locked.json()).toEqual(bodies[0]);

    const unknown = await post("/api/v1/auth/login", {
      email: `nadie.${runId}@smoke.test`,
      password: "x",
    });
    expect(unknown.status).toBe(401);
    expect(await unknown.json()).toEqual(bodies[0]);
  });

  it("rechaza mutaciones desde otro origen", async () => {
    const response = await post(
      "/api/v1/auth/login",
      { email: alice.email, password: alice.password },
      undefined,
      { origin: "https://atacante.example" },
    );
    expect(response.status).toBe(403);
  });

  it("aplica rate limit al login con Retry-After", async () => {
    let limited: Response | undefined;
    for (let i = 0; i < 15 && !limited; i++) {
      const response = await post("/api/v1/auth/login", {
        email: alice.email,
        password: "incorrecta",
      });
      if (response.status === 429) limited = response;
    }
    expect(limited, "el login nunca respondió 429").toBeDefined();
    expect(Number(limited!.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(limited!.headers.get("ratelimit-remaining")).toBe("0");
    expect((await limited!.json()).error.code).toBe("rate_limited");
  });

  it("el límite por correo resiste IPs falsificadas en X-Forwarded-For", async () => {
    const target = `victima.${runId}@smoke.test`;
    let limited: Response | undefined;
    for (let i = 0; i < 15 && !limited; i++) {
      const response = await post(
        "/api/v1/auth/login",
        { email: target, password: "incorrecta" },
        undefined,
        { "x-forwarded-for": `203.0.113.${i + 1}` },
      );
      if (response.status === 429) limited = response;
    }
    expect(limited, "el límite por correo nunca respondió 429").toBeDefined();
  });

  it("el rastreo exige guía y segundo dato, con respuesta uniforme", async () => {
    const ok = await post("/api/v1/tracking", {
      trackingNumber: "RS0000000001",
      phoneLast4: "4321",
    });
    expect(ok.status).toBe(200);
    const shipment = await ok.json();
    expect(shipment.trackingNumber).toBe("RS0000000001");
    expect(shipment.events.length).toBeGreaterThan(0);
    expect(JSON.stringify(shipment)).not.toMatch(/recipient|Destinatario|4321/);

    const wrongDigits = await post("/api/v1/tracking", {
      trackingNumber: "RS0000000001",
      phoneLast4: "0000",
    });
    const unknownGuide = await post("/api/v1/tracking", {
      trackingNumber: "RS9999999999",
      phoneLast4: "4321",
    });
    expect(wrongDigits.status).toBe(404);
    expect(unknownGuide.status).toBe(404);
    expect(await wrongDigits.json()).toEqual(await unknownGuide.json());
  });

  it("aplica rate limit al rastreo por guía", async () => {
    let limited: Response | undefined;
    for (let i = 0; i < 8 && !limited; i++) {
      const response = await post("/api/v1/tracking", {
        trackingNumber: "RS0000000001",
        phoneLast4: "1111",
      });
      if (response.status === 429) limited = response;
    }
    expect(limited, "el rastreo nunca respondió 429").toBeDefined();
    expect(Number(limited!.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
