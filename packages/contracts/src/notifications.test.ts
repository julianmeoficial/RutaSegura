import { describe, expect, it } from "vitest";
import { notificationListQuerySchema, notificationSchema } from "./notifications";

describe("notificationListQuerySchema", () => {
  it("usa 20 por defecto y convierte el límite de la URL", () => {
    expect(notificationListQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(notificationListQuerySchema.parse({ limit: "5" })).toEqual({ limit: 5 });
  });

  it("rechaza límites fuera de 1 a 50", () => {
    for (const limit of ["0", "51", "-1", "2.5", "abc"]) {
      expect(notificationListQuerySchema.safeParse({ limit }).success).toBe(false);
    }
  });

  it("rechaza que el cliente pida los avisos de otro usuario", () => {
    expect(notificationListQuerySchema.safeParse({ userId: "x" }).success).toBe(false);
    expect(notificationListQuerySchema.safeParse({ ownerId: "x" }).success).toBe(false);
  });
});

describe("notificationSchema", () => {
  it("no expone destinatario ni identificadores internos", () => {
    const parsed = notificationSchema.parse({
      kind: "shipment_scheduled",
      body: "Hay una novedad en uno de tus envíos.",
      createdAt: "2026-09-27T12:00:00Z",
      read: false,
      id: "5f0c7c1e-8f7a-4c1b-9d7e-2b1f4f0a9c3d",
      userId: "7d2a5e90-1c3b-4f6a-8e2d-9a0b1c2d3e4f",
    });
    expect(Object.keys(parsed).sort()).toEqual(["body", "createdAt", "kind", "read"]);
  });
});
