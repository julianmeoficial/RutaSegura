import { describe, expect, it } from "vitest";
import { isReschedulable, isValidDeliveryWindow, slotStart } from "./schedule";

// Miércoles 30 de septiembre de 2026, 09:00 en Bogotá.
const now = new Date("2026-09-30T14:00:00Z");

describe("isValidDeliveryWindow", () => {
  it("acepta una franja futura entre semana", () => {
    expect(isValidDeliveryWindow("2026-10-01", "08-10", now)).toBe(true);
    expect(isValidDeliveryWindow("2026-09-30", "10-12", now)).toBe(true);
  });

  it("rechaza sábados y domingos", () => {
    expect(isValidDeliveryWindow("2026-10-03", "10-12", now)).toBe(false);
    expect(isValidDeliveryWindow("2026-10-04", "10-12", now)).toBe(false);
  });

  it("exige que la franja empiece estrictamente en el futuro", () => {
    expect(isValidDeliveryWindow("2026-09-29", "16-18", now)).toBe(false);
    expect(isValidDeliveryWindow("2026-09-30", "08-10", now)).toBe(false);
    expect(isValidDeliveryWindow("2026-09-30", "08-10", new Date("2026-09-30T13:00:00Z"))).toBe(
      false,
    );
  });

  it("rechaza franjas inventadas y fechas imposibles", () => {
    expect(isValidDeliveryWindow("2026-10-01", "07-09", now)).toBe(false);
    expect(isValidDeliveryWindow("2026-10-01", "18-20", now)).toBe(false);
    expect(isValidDeliveryWindow("2026-02-30", "08-10", now)).toBe(false);
    expect(isValidDeliveryWindow("01/10/2026", "08-10", now)).toBe(false);
  });
});

describe("slotStart", () => {
  it("interpreta la franja en hora de Bogotá (UTC-5)", () => {
    expect(slotStart("2026-10-01", "14-16")?.toISOString()).toBe("2026-10-01T19:00:00.000Z");
  });
});

describe("isReschedulable", () => {
  it("bloquea envíos en reparto o entregados", () => {
    expect(isReschedulable("created")).toBe(true);
    expect(isReschedulable("in_transit")).toBe(true);
    expect(isReschedulable("exception")).toBe(true);
    expect(isReschedulable("out_for_delivery")).toBe(false);
    expect(isReschedulable("delivered")).toBe(false);
  });
});
