import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShipmentRow } from "@/server/repositories/shipments";

const tx = { tx: true };
const withRlsContext = vi.fn((_context: unknown, fn: (tx: unknown) => unknown) => fn(tx));
vi.mock("@/server/repositories/db", () => ({ withRlsContext }));

const repo = {
  claimShipment: vi.fn(),
  clearShipmentWindow: vi.fn(),
  findShipmentById: vi.fn(),
  findShipmentByPublicId: vi.fn(),
  findShipmentByTrackingNumber: vi.fn(),
  insertShipmentAudit: vi.fn(),
  insertShipmentEvent: vi.fn(),
  listShipmentAudit: vi.fn(),
  listShipmentsByOwner: vi.fn(),
  updateShipmentStatus: vi.fn(),
  updateShipmentWindow: vi.fn(),
};
vi.mock("@/server/repositories/shipments", () => repo);

const insertNotification = vi.fn();
vi.mock("@/server/repositories/notifications", () => ({ insertNotification }));
vi.mock("@/server/audit/auth-events", () => ({ recordAuthEvent: vi.fn() }));

const { OwnershipError } = await import("@/server/authorization/ownership");
const { NOTIFICATION_BODY } = await import("@/server/notifications/simulate");
const { scheduleShipment, transitionShipmentStatus, unscheduleShipment } =
  await import("./shipments");

vi.spyOn(console, "log").mockImplementation(() => {});

const ALICE = "0b6f1c1e-8f7a-4c1b-9d7e-2b1f4f0a9c3d";
const BOB = "7d2a5e90-1c3b-4f6a-8e2d-9a0b1c2d3e4f";
const PUBLIC_ID = "01J8Z3K4M5N6P7Q8R9S0T1V2W3";
const now = new Date("2026-09-30T14:00:00Z");

function shipment(overrides: Partial<ShipmentRow> = {}): ShipmentRow {
  return {
    id: "shipment-1",
    publicId: PUBLIC_ID,
    trackingNumber: "RS0000000001",
    status: "in_transit",
    ownerId: ALICE,
    windowDate: null,
    windowSlot: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("transitionShipmentStatus", () => {
  it("actualiza el estado y deja evento, bitácora y aviso al dueño", async () => {
    repo.findShipmentById.mockResolvedValue(shipment());

    await expect(
      transitionShipmentStatus({
        shipmentId: "shipment-1",
        toStatus: "out_for_delivery",
        city: "Medellín",
      }),
    ).resolves.toBe(true);

    expect(withRlsContext).toHaveBeenCalledWith(
      { userId: null, mode: "operator" },
      expect.any(Function),
    );
    expect(repo.updateShipmentStatus).toHaveBeenCalledWith(tx, "shipment-1", "out_for_delivery");
    expect(repo.insertShipmentEvent).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ shipmentId: "shipment-1", status: "out_for_delivery" }),
    );
    expect(repo.insertShipmentAudit).toHaveBeenCalledWith(tx, {
      shipmentId: "shipment-1",
      actorUserId: null,
      type: "status_changed",
      fromStatus: "in_transit",
      toStatus: "out_for_delivery",
    });
    expect(insertNotification).toHaveBeenCalledWith(tx, {
      userId: ALICE,
      kind: "shipment_status_changed",
      body: NOTIFICATION_BODY,
    });
  });

  it("no avisa a nadie si la guía no tiene dueño", async () => {
    repo.findShipmentById.mockResolvedValue(shipment({ ownerId: null, publicId: null }));

    await transitionShipmentStatus({ shipmentId: "shipment-1", toStatus: "delivered", city: "X" });

    expect(repo.insertShipmentAudit).toHaveBeenCalledOnce();
    expect(insertNotification).not.toHaveBeenCalled();
  });

  it("no escribe nada si el envío no existe", async () => {
    repo.findShipmentById.mockResolvedValue(undefined);

    await expect(
      transitionShipmentStatus({ shipmentId: "nope", toStatus: "delivered", city: "X" }),
    ).resolves.toBe(false);
    expect(repo.updateShipmentStatus).not.toHaveBeenCalled();
    expect(repo.insertShipmentAudit).not.toHaveBeenCalled();
  });
});

describe("scheduleShipment", () => {
  const request = { date: "2026-10-01", slot: "08-10" } as const;

  it("agenda por primera vez: bitácora `scheduled` y aviso genérico", async () => {
    repo.findShipmentByPublicId.mockResolvedValue(shipment());
    repo.updateShipmentWindow.mockResolvedValue(
      shipment({ windowDate: request.date, windowSlot: request.slot }),
    );

    const result = await scheduleShipment(PUBLIC_ID, ALICE, request, now);

    expect(result).toEqual({
      ok: true,
      shipment: {
        id: PUBLIC_ID,
        trackingNumber: "RS0000000001",
        status: "in_transit",
        window: request,
      },
    });
    expect(withRlsContext).toHaveBeenCalledWith({ userId: ALICE }, expect.any(Function));
    expect(repo.insertShipmentAudit).toHaveBeenCalledWith(tx, {
      shipmentId: "shipment-1",
      actorUserId: ALICE,
      type: "scheduled",
    });
    expect(insertNotification).toHaveBeenCalledWith(tx, {
      userId: ALICE,
      kind: "shipment_scheduled",
      body: NOTIFICATION_BODY,
    });
  });

  it("reprograma una franja existente como `rescheduled`", async () => {
    repo.findShipmentByPublicId.mockResolvedValue(
      shipment({ windowDate: "2026-10-01", windowSlot: "10-12" }),
    );
    repo.updateShipmentWindow.mockResolvedValue(
      shipment({ windowDate: request.date, windowSlot: request.slot }),
    );

    await scheduleShipment(PUBLIC_ID, ALICE, request, now);

    expect(repo.insertShipmentAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ type: "rescheduled" }),
    );
    expect(insertNotification).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ kind: "shipment_rescheduled" }),
    );
  });

  it("lanza OwnershipError para envíos ajenos o inexistentes, sin escribir", async () => {
    repo.findShipmentByPublicId.mockResolvedValue(shipment({ ownerId: BOB }));
    await expect(scheduleShipment(PUBLIC_ID, ALICE, request, now)).rejects.toBeInstanceOf(
      OwnershipError,
    );

    repo.findShipmentByPublicId.mockResolvedValue(undefined);
    await expect(scheduleShipment(PUBLIC_ID, ALICE, request, now)).rejects.toBeInstanceOf(
      OwnershipError,
    );

    expect(repo.updateShipmentWindow).not.toHaveBeenCalled();
    expect(repo.insertShipmentAudit).not.toHaveBeenCalled();
  });

  it("rechaza envíos en reparto o entregados y franjas pasadas", async () => {
    repo.findShipmentByPublicId.mockResolvedValue(shipment({ status: "out_for_delivery" }));
    await expect(scheduleShipment(PUBLIC_ID, ALICE, request, now)).resolves.toEqual({ ok: false });

    repo.findShipmentByPublicId.mockResolvedValue(shipment({ status: "delivered" }));
    await expect(scheduleShipment(PUBLIC_ID, ALICE, request, now)).resolves.toEqual({ ok: false });

    repo.findShipmentByPublicId.mockResolvedValue(shipment());
    await expect(
      scheduleShipment(PUBLIC_ID, ALICE, { date: "2026-09-29", slot: "08-10" }, now),
    ).resolves.toEqual({ ok: false });

    expect(repo.updateShipmentWindow).not.toHaveBeenCalled();
    expect(insertNotification).not.toHaveBeenCalled();
  });
});

describe("unscheduleShipment", () => {
  const scheduled = { windowDate: "2026-10-01", windowSlot: "08-10" } as const;

  it("cancela la franja: bitácora `unscheduled` y aviso genérico", async () => {
    repo.findShipmentByPublicId.mockResolvedValue(shipment(scheduled));
    repo.clearShipmentWindow.mockResolvedValue(shipment());

    const result = await unscheduleShipment(PUBLIC_ID, ALICE);

    expect(result).toEqual({
      ok: true,
      shipment: {
        id: PUBLIC_ID,
        trackingNumber: "RS0000000001",
        status: "in_transit",
        window: null,
      },
    });
    expect(withRlsContext).toHaveBeenCalledWith({ userId: ALICE }, expect.any(Function));
    expect(repo.clearShipmentWindow).toHaveBeenCalledWith(tx, "shipment-1", ALICE);
    expect(repo.insertShipmentAudit).toHaveBeenCalledWith(tx, {
      shipmentId: "shipment-1",
      actorUserId: ALICE,
      type: "unscheduled",
    });
    expect(insertNotification).toHaveBeenCalledWith(tx, {
      userId: ALICE,
      kind: "shipment_unscheduled",
      body: NOTIFICATION_BODY,
    });
  });

  it("es idempotente: sin franja responde el envío y no escribe nada", async () => {
    repo.findShipmentByPublicId.mockResolvedValue(shipment());

    await expect(unscheduleShipment(PUBLIC_ID, ALICE)).resolves.toEqual({
      ok: true,
      shipment: expect.objectContaining({ id: PUBLIC_ID, window: null }),
    });
    expect(repo.clearShipmentWindow).not.toHaveBeenCalled();
    expect(repo.insertShipmentAudit).not.toHaveBeenCalled();
    expect(insertNotification).not.toHaveBeenCalled();
  });

  it("lanza OwnershipError para envíos ajenos o inexistentes, sin escribir", async () => {
    repo.findShipmentByPublicId.mockResolvedValue(shipment({ ...scheduled, ownerId: BOB }));
    await expect(unscheduleShipment(PUBLIC_ID, ALICE)).rejects.toBeInstanceOf(OwnershipError);

    repo.findShipmentByPublicId.mockResolvedValue(undefined);
    await expect(unscheduleShipment(PUBLIC_ID, ALICE)).rejects.toBeInstanceOf(OwnershipError);

    expect(repo.clearShipmentWindow).not.toHaveBeenCalled();
    expect(repo.insertShipmentAudit).not.toHaveBeenCalled();
    expect(insertNotification).not.toHaveBeenCalled();
  });

  it("rechaza envíos en reparto o entregados", async () => {
    repo.findShipmentByPublicId.mockResolvedValue(
      shipment({ ...scheduled, status: "out_for_delivery" }),
    );
    await expect(unscheduleShipment(PUBLIC_ID, ALICE)).resolves.toEqual({ ok: false });

    repo.findShipmentByPublicId.mockResolvedValue(shipment({ ...scheduled, status: "delivered" }));
    await expect(unscheduleShipment(PUBLIC_ID, ALICE)).resolves.toEqual({ ok: false });

    expect(repo.clearShipmentWindow).not.toHaveBeenCalled();
    expect(insertNotification).not.toHaveBeenCalled();
  });
});
