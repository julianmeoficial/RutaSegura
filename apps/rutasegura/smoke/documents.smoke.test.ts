import { describe, expect, it } from "vitest";

/**
 * Smoke del módulo de documentos contra Docker (`scripts/smoke-auth.sh`): app,
 * PostgreSQL, Redis y MinIO reales. Comprueba que el bucket no es público y que
 * la URL firmada es la única vía de descarga, solo para el dueño y por poco tiempo.
 */
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const ORIGIN = new URL(BASE_URL).origin;
/** IP propia: no comparte cupos con la suite de autenticación. */
const DOCUMENTS_IP = { "x-forwarded-for": "198.51.100.23" };
const UNKNOWN_ID = "01J8Z3K4M5N6P7Q8R9S0T1V2W3";

const runId = Date.now().toString(36);
const carol = {
  email: `carol.${runId}@smoke.test`,
  password: "caballo-bateria-grapa-03",
  fullName: "Carol Smoke",
};
const dave = {
  email: `dave.${runId}@smoke.test`,
  password: "caballo-bateria-grapa-04",
  fullName: "Dave Smoke",
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

async function request(method: string, path: string, jar?: Jar, body?: unknown) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      origin: ORIGIN,
      ...DOCUMENTS_IP,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(jar ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (jar) storeCookies(jar, response);
  return response;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("smoke de documentos con URL firmada", () => {
  const carolJar: Jar = new Map();
  const daveJar: Jar = new Map();
  let shipmentId = "";
  let documentId = "";
  let signed: { url: string; expiresAt: string; expiresIn: number };

  it("Carol reclama RS0000000003; Dave no tiene envíos", async () => {
    for (const [user, jar] of [
      [carol, carolJar],
      [dave, daveJar],
    ] as const) {
      expect((await request("POST", "/api/v1/auth/register", undefined, user)).status).toBe(201);
      const login = await request("POST", "/api/v1/auth/login", jar, {
        email: user.email,
        password: user.password,
      });
      expect(login.status).toBe(200);
    }
    const claim = await request("POST", "/api/v1/shipments/claim", carolJar, {
      trackingNumber: "RS0000000003",
      phoneLast4: "5555",
    });
    expect(claim.status).toBe(200);
    shipmentId = (await claim.json()).id;
  });

  it("los endpoints de documentos exigen sesión", async () => {
    const list = await request("GET", `/api/v1/shipments/${shipmentId}/documents`);
    const download = await request("POST", `/api/v1/documents/${UNKNOWN_ID}/download-url`);
    expect(list.status).toBe(401);
    expect(download.status).toBe(401);
  });

  it("Carol lista sus documentos sin rutas internas del almacenamiento", async () => {
    const response = await request("GET", `/api/v1/shipments/${shipmentId}/documents`, carolJar);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const { documents } = await response.json();
    expect(documents).toHaveLength(1);
    expect(Object.keys(documents[0]).sort()).toEqual(
      ["createdAt", "fileName", "id", "mimeType", "shipmentId", "sizeBytes"].sort(),
    );
    expect(documents[0].mimeType).toBe("application/pdf");
    documentId = documents[0].id;
    expect(JSON.stringify(documents)).not.toMatch(/documents\/|objectKey|sha256|ownerId|:9000/);
  });

  it("Dave recibe el mismo 404 sobre los documentos de Carol que con un ULID inexistente", async () => {
    const list = await request("GET", `/api/v1/shipments/${shipmentId}/documents`, daveJar);
    const listUnknown = await request("GET", `/api/v1/shipments/${UNKNOWN_ID}/documents`, daveJar);
    expect(list.status).toBe(404);
    expect(listUnknown.status).toBe(404);
    expect(await list.json()).toEqual(await listUnknown.json());

    const steal = await request("POST", `/api/v1/documents/${documentId}/download-url`, daveJar);
    const stealUnknown = await request(
      "POST",
      `/api/v1/documents/${UNKNOWN_ID}/download-url`,
      daveJar,
    );
    expect(steal.status).toBe(404);
    expect(stealUnknown.status).toBe(404);
    expect(await steal.json()).toEqual(await stealUnknown.json());
  });

  it("Carol obtiene una URL firmada de 60 s que descarga el PDF como adjunto", async () => {
    const response = await request(
      "POST",
      `/api/v1/documents/${documentId}/download-url`,
      carolJar,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    signed = await response.json();
    expect(signed.expiresIn).toBe(60);
    const issuedFor = new Date(signed.expiresAt).getTime() - Date.now();
    expect(issuedFor).toBeGreaterThan(50_000);
    expect(issuedFor).toBeLessThanOrEqual(60_000);

    const url = new URL(signed.url);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("60");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);

    const download = await fetch(signed.url);
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toBe("application/pdf");
    expect(download.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(download.headers.get("cache-control")).toBe("no-store");
    expect(
      Buffer.from(await download.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
  });

  it("el bucket no es público: sin firma, el objeto y el listado responden 403", async () => {
    const url = new URL(signed.url);
    const bucket = url.pathname.split("/")[1]!;
    const unsigned = await fetch(`${url.origin}${url.pathname}`);
    expect(unsigned.status).toBe(403);
    expect(await unsigned.text()).toContain("AccessDenied");

    for (const listing of [`${url.origin}/${bucket}`, `${url.origin}/${bucket}?list-type=2`]) {
      const response = await fetch(listing);
      expect(response.status).toBe(403);
    }
    expect((await fetch(`${url.origin}/`)).status).toBe(403);
  });

  it("una firma alterada o un plazo ampliado se rechazan", async () => {
    const tampered = new URL(signed.url);
    const signature = tampered.searchParams.get("X-Amz-Signature")!;
    tampered.searchParams.set(
      "X-Amz-Signature",
      `${signature[0] === "0" ? "1" : "0"}${signature.slice(1)}`,
    );
    expect((await fetch(tampered)).status).toBe(403);

    const extended = new URL(signed.url);
    extended.searchParams.set("X-Amz-Expires", "604800");
    expect((await fetch(extended)).status).toBe(403);
  });

  it("la URL firmada deja de servir al vencer", async () => {
    const wait = new Date(signed.expiresAt).getTime() - Date.now() + 2_000;
    await sleep(Math.max(0, wait));
    const expired = await fetch(signed.url);
    expect(expired.status).toBe(403);
    expect(await expired.text()).toMatch(/AccessDenied|expired/i);
  }, 90_000);

  it("cada URL emitida queda en la bitácora del envío", async () => {
    const detail = await request("GET", `/api/v1/shipments/${shipmentId}`, carolJar);
    const types = (await detail.json()).audit.map((event: { type: string }) => event.type);
    expect(types).toEqual(["claimed", "document_url_issued"]);
  });

  it("aplica rate limit a la emisión de URLs con Retry-After", async () => {
    let limited: Response | undefined;
    for (let i = 0; i < 40 && !limited; i++) {
      const response = await request(
        "POST",
        `/api/v1/documents/${UNKNOWN_ID}/download-url`,
        daveJar,
      );
      if (response.status === 429) limited = response;
    }
    expect(limited, "la emisión de URLs nunca respondió 429").toBeDefined();
    expect(Number(limited!.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
