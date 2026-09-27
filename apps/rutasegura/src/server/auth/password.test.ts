import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("usa Argon2id con los parámetros de OWASP y sal aleatoria", async () => {
    const first = await hashPassword("caballo-bateria-grapa");
    const second = await hashPassword("caballo-bateria-grapa");
    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second);
  });

  it("verifica la contraseña correcta y rechaza la incorrecta", async () => {
    const stored = await hashPassword("caballo-bateria-grapa");
    expect(await verifyPassword(stored, "caballo-bateria-grapa")).toBe(true);
    expect(await verifyPassword(stored, "caballo-bateria-grap")).toBe(false);
  });

  it("rechaza sin lanzar cuando la cuenta no existe o el hash está corrupto", async () => {
    expect(await verifyPassword(null, "cualquier-cosa")).toBe(false);
    expect(await verifyPassword("no-es-un-hash", "cualquier-cosa")).toBe(false);
  });
});
