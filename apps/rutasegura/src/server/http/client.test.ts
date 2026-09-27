import { describe, expect, it } from "vitest";
import { clientIp, readJson } from "./client";

describe("clientIp", () => {
  it("toma el valor que añade el último salto, no el que envía el cliente", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.7" },
    });
    expect(clientIp(request)).toBe("10.0.0.7");
  });
});

describe("readJson", () => {
  it("lee JSON válido", async () => {
    const request = new Request("http://localhost/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });
    expect(await readJson(request)).toEqual({ ok: true });
  });

  it("descarta otro tipo de contenido, JSON inválido y cuerpos de más de 16 KiB", async () => {
    const form = new Request("http://localhost/", { method: "POST", body: "a=1" });
    const broken = new Request("http://localhost/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    const huge = new Request("http://localhost/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: "x".repeat(17 * 1024) }),
    });
    expect(await readJson(form)).toBeUndefined();
    expect(await readJson(broken)).toBeUndefined();
    expect(await readJson(huge)).toBeUndefined();
  });
});
