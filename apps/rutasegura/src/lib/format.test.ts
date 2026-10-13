import { describe, expect, it } from "vitest";
import {
  bogotaToday,
  calendarDateLabel,
  countdownLabel,
  dateLabel,
  isSlotPast,
  safeNextPath,
  slotLabel,
  upcomingBusinessDays,
} from "./format";

describe("fechas sin depender del locale del entorno", () => {
  it("formatea igual en servidor y navegador", () => {
    expect(calendarDateLabel("2026-09-29")).toBe("martes, 29 de septiembre");
    expect(dateLabel("2026-10-13T22:00:00Z")).toBe("13 oct 2026");
    // 01:00 UTC del 1 de octubre sigue siendo 30 de septiembre en Bogotá.
    expect(dateLabel("2026-10-01T01:00:00Z")).toBe("30 sep 2026");
  });
});

describe("safeNextPath", () => {
  it("acepta solo rutas internas del portal", () => {
    expect(safeNextPath("/portal/documentos")).toBe("/portal/documentos");
    expect(safeNextPath(null)).toBe("/portal");
    expect(safeNextPath("https://atacante.example")).toBe("/portal");
    expect(safeNextPath("//atacante.example/portal")).toBe("/portal");
    expect(safeNextPath("/rastreo")).toBe("/portal");
    expect(safeNextPath("/portal\\@atacante.example")).toBe("/portal");
  });
});

describe("agenda en Bogotá", () => {
  it("calcula hoy con UTC-5", () => {
    expect(bogotaToday(new Date("2026-10-14T03:00:00Z"))).toBe("2026-10-13");
  });

  it("omite sábados y domingos", () => {
    // Viernes 16 de octubre de 2026 a mediodía en Bogotá.
    const days = upcomingBusinessDays(3, new Date("2026-10-16T17:00:00Z"));
    expect(days).toEqual(["2026-10-16", "2026-10-19", "2026-10-20"]);
  });

  it("marca como pasadas las franjas que ya empezaron", () => {
    const now = new Date("2026-10-13T15:30:00Z"); // 10:30 en Bogotá
    expect(isSlotPast("2026-10-13", "10-12", now)).toBe(true);
    expect(isSlotPast("2026-10-13", "12-14", now)).toBe(false);
  });
});

describe("etiquetas", () => {
  it("formatea franjas y cuentas regresivas", () => {
    expect(slotLabel("08-10")).toBe("08:00 – 10:00");
    expect(countdownLabel(120)).toBe("02:00");
    expect(countdownLabel(59.2)).toBe("01:00");
    expect(countdownLabel(-3)).toBe("00:00");
  });
});
