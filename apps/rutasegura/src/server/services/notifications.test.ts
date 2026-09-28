import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = { tx: true };
const withRlsContext = vi.fn((_context: unknown, fn: (tx: unknown) => unknown) => fn(tx));
vi.mock("@/server/repositories/db", () => ({ withRlsContext }));

const repo = {
  countUnreadNotifications: vi.fn(),
  listNotificationsByUser: vi.fn(),
  markAllNotificationsRead: vi.fn(),
};
vi.mock("@/server/repositories/notifications", () => repo);

const { listNotificationsForUser, markNotificationsReadForUser } = await import("./notifications");

const ALICE = "0b6f1c1e-8f7a-4c1b-9d7e-2b1f4f0a9c3d";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listNotificationsForUser", () => {
  it("consulta solo al usuario de la sesión, con su contexto RLS", async () => {
    repo.listNotificationsByUser.mockResolvedValue([
      {
        kind: "shipment_rescheduled",
        body: "Hay una novedad",
        createdAt: new Date("2026-09-27T12:05:00Z"),
        readAt: null,
      },
      {
        kind: "shipment_scheduled",
        body: "Hay una novedad",
        createdAt: new Date("2026-09-27T12:00:00Z"),
        readAt: new Date("2026-09-27T12:01:00Z"),
      },
    ]);
    repo.countUnreadNotifications.mockResolvedValue(1);

    const result = await listNotificationsForUser(ALICE, 20);

    expect(withRlsContext).toHaveBeenCalledWith({ userId: ALICE }, expect.any(Function));
    expect(repo.listNotificationsByUser).toHaveBeenCalledWith(tx, ALICE, 20);
    expect(repo.countUnreadNotifications).toHaveBeenCalledWith(tx, ALICE);
    expect(result).toEqual({
      notifications: [
        {
          kind: "shipment_rescheduled",
          body: "Hay una novedad",
          createdAt: "2026-09-27T12:05:00.000Z",
          read: false,
        },
        {
          kind: "shipment_scheduled",
          body: "Hay una novedad",
          createdAt: "2026-09-27T12:00:00.000Z",
          read: true,
        },
      ],
      unreadCount: 1,
    });
  });
});

describe("markNotificationsReadForUser", () => {
  it("marca solo los avisos del usuario de la sesión", async () => {
    await markNotificationsReadForUser(ALICE);

    expect(withRlsContext).toHaveBeenCalledWith({ userId: ALICE }, expect.any(Function));
    expect(repo.markAllNotificationsRead).toHaveBeenCalledWith(tx, ALICE);
  });
});
