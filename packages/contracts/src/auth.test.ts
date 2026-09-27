import { describe, expect, it } from "vitest";
import { loginRequestSchema, registerRequestSchema } from "./auth";
import { trackingRequestSchema } from "./tracking";

const valid = {
  email: "  Ana.Perez@Example.org ",
  password: "caballo-bateria-grapa",
  fullName: "Ana Pérez",
};

describe("registerRequestSchema", () => {
  it("normaliza el correo", () => {
    expect(registerRequestSchema.parse(valid).email).toBe("ana.perez@example.org");
  });

  it("exige al menos 12 caracteres y como máximo 128", () => {
    expect(registerRequestSchema.safeParse({ ...valid, password: "corta" }).success).toBe(false);
    expect(registerRequestSchema.safeParse({ ...valid, password: "x".repeat(129) }).success).toBe(
      false,
    );
  });

  it("rechaza contraseñas comunes y las que contienen el correo", () => {
    expect(registerRequestSchema.safeParse({ ...valid, password: "Password1234" }).success).toBe(
      false,
    );
    expect(
      registerRequestSchema.safeParse({ ...valid, password: "ana.perez-segura-2026" }).success,
    ).toBe(false);
  });

  it("rechaza campos adicionales como el rol", () => {
    expect(registerRequestSchema.safeParse({ ...valid, role: "admin" }).success).toBe(false);
  });
});

describe("loginRequestSchema", () => {
  it("no aplica la política de contraseña, solo el largo máximo", () => {
    expect(loginRequestSchema.safeParse({ email: valid.email, password: "corta" }).success).toBe(
      true,
    );
    expect(
      loginRequestSchema.safeParse({ email: valid.email, password: "x".repeat(129) }).success,
    ).toBe(false);
  });
});

describe("trackingRequestSchema", () => {
  it("acepta guía y últimos 4 dígitos", () => {
    const parsed = trackingRequestSchema.parse({
      trackingNumber: "rs0000000001",
      phoneLast4: "4321",
    });
    expect(parsed.trackingNumber).toBe("RS0000000001");
  });

  it("rechaza formatos inválidos", () => {
    expect(
      trackingRequestSchema.safeParse({ trackingNumber: "RS1", phoneLast4: "4321" }).success,
    ).toBe(false);
    expect(
      trackingRequestSchema.safeParse({ trackingNumber: "RS0000000001", phoneLast4: "43a1" })
        .success,
    ).toBe(false);
  });
});
