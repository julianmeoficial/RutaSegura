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
