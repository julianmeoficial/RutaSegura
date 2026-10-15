import { describe, expect, it } from "vitest";
import {
  claimRequestSchema,
  scheduleRequestSchema,
  shipmentDetailSchema,
  shipmentSummarySchema,
  ulidSchema,
} from "./shipments";

describe("ulidSchema", () => {
  it("acepta ULID de 26 caracteres y normaliza a mayúsculas", () => {
    expect(ulidSchema.parse("01j8z3k4m5n6p7q8r9s0t1v2w3")).toBe("01J8Z3K4M5N6P7Q8R9S0T1V2W3");
  });

  it("rechaza UUID, letras fuera de Crockford y desbordes del tiempo", () => {
    expect(ulidSchema.safeParse("5f0c7c1e-8f7a-4c1b-9d7e-2b1f4f0a9c3d").success).toBe(false);
    expect(ulidSchema.safeParse("01J8Z3K4M5N6P7Q8R9S0T1V2WI").success).toBe(false);
    expect(ulidSchema.safeParse("81J8Z3K4M5N6P7Q8R9S0T1V2W3").success).toBe(false);
  });
});

describe("claimRequestSchema", () => {
  it("rechaza que el cliente indique el dueño", () => {
    const base = { trackingNumber: "RS0000000001", phoneLast4: "4321" };
    expect(claimRequestSchema.safeParse(base).success).toBe(true);
    expect(claimRequestSchema.safeParse({ ...base, ownerId: "x" }).success).toBe(false);
    expect(claimRequestSchema.safeParse({ ...base, userId: "x" }).success).toBe(false);
  });
});

describe("scheduleRequestSchema", () => {
  it("acepta fecha y una de las cinco franjas", () => {
    expect(scheduleRequestSchema.safeParse({ date: "2026-10-01", slot: "08-10" }).success).toBe(
      true,
    );
  });

  it("rechaza franjas inventadas, instantes y fechas imposibles", () => {
    expect(scheduleRequestSchema.safeParse({ date: "2026-10-01", slot: "07-09" }).success).toBe(
      false,
    );
    expect(
      scheduleRequestSchema.safeParse({ date: "2026-10-01T08:00:00Z", slot: "08-10" }).success,
    ).toBe(false);
    expect(scheduleRequestSchema.safeParse({ date: "2026-02-30", slot: "08-10" }).success).toBe(
      false,
    );
  });

  it("rechaza ownerId y userId", () => {
    const base = { date: "2026-10-01", slot: "08-10" };
    expect(scheduleRequestSchema.safeParse({ ...base, ownerId: "x" }).success).toBe(false);
    expect(scheduleRequestSchema.safeParse({ ...base, userId: "x" }).success).toBe(false);
  });
});

describe("respuestas de envío", () => {
  const summary = {
    id: "01J8Z3K4M5N6P7Q8R9S0T1V2W3",
    trackingNumber: "RS0000000001",
    status: "in_transit",
    window: null,
  };

  it("no incluyen datos del destinatario", () => {
    const parsed = shipmentSummarySchema.parse({
      ...summary,
      recipientName: "Destinatario",
      recipientPhone: "3001234321",
    });
    expect(parsed).not.toHaveProperty("recipientName");
    expect(parsed).not.toHaveProperty("recipientPhone");
  });

  it("el detalle incluye el recorrido y la bitácora", () => {
    const detail = shipmentDetailSchema.parse({
      ...summary,
      events: [
        { status: "created", city: "Bogotá", occurredAt: "2026-09-26T12:00:00Z" },
        { status: "in_transit", city: "Medellín", occurredAt: "2026-09-27T09:00:00Z" },
      ],
      audit: [
        { type: "claimed", fromStatus: null, toStatus: null, createdAt: "2026-09-27T12:00:00Z" },
        {
          type: "unscheduled",
          fromStatus: null,
          toStatus: null,
          createdAt: "2026-09-27T12:05:00Z",
        },
      ],
    });
    expect(detail.events.map((event) => event.city)).toEqual(["Bogotá", "Medellín"]);
    expect(detail.audit.map((event) => event.type)).toEqual(["claimed", "unscheduled"]);
  });

  it("el detalle sin recorrido no es válido", () => {
    expect(shipmentDetailSchema.safeParse({ ...summary, audit: [] }).success).toBe(false);
  });
});
