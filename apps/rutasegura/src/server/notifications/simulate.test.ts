import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tx } from "@/server/repositories/db";

const insertNotification = vi.fn();
vi.mock("@/server/repositories/notifications", () => ({ insertNotification }));

const { enqueueNotification, NOTIFICATION_BODY } = await import("./simulate");

const log = vi.spyOn(console, "log").mockImplementation(() => {});
const tx = {} as Tx;

describe("enqueueNotification", () => {
  beforeEach(() => {
    insertNotification.mockReset();
    log.mockClear();
  });

  it("guarda la plantilla fija, sin datos del envío ni del destinatario", async () => {
    await enqueueNotification(tx, { userId: "user-1", kind: "shipment_scheduled" });

    expect(insertNotification).toHaveBeenCalledWith(tx, {
      userId: "user-1",
      kind: "shipment_scheduled",
      body: NOTIFICATION_BODY,
    });
    expect(NOTIFICATION_BODY).not.toMatch(/RS\d{10}/);
    expect(NOTIFICATION_BODY).not.toMatch(/\d/);
    expect(NOTIFICATION_BODY).not.toMatch(/Destinatario|tel[eé]fono|direcci[oó]n|franja/i);
  });

  it("registra el aviso en el log solo con tipo y usuario", async () => {
    await enqueueNotification(tx, { userId: "user-1", kind: "shipment_status_changed" });

    const line = JSON.parse(log.mock.calls[0]![0] as string);
    expect(line).toMatchObject({
      event: "notification.enqueued",
      kind: "shipment_status_changed",
      userId: "user-1",
    });
    expect(Object.keys(line).sort()).toEqual(["event", "kind", "level", "time", "userId"]);
  });
});
