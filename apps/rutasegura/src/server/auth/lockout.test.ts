import { describe, expect, it } from "vitest";
import { isLocked, lockDurationSeconds, shouldLock } from "./lockout";

const policy = { threshold: 5, baseSeconds: 300, maxSeconds: 3600 };

describe("lockout", () => {
  it("bloquea al alcanzar el umbral de fallos", () => {
    expect(shouldLock(4, policy)).toBe(false);
    expect(shouldLock(5, policy)).toBe(true);
  });

  it("duplica la duración en cada bloqueo y respeta el tope", () => {
    expect([0, 1, 2, 3, 4, 5].map((level) => lockDurationSeconds(level, policy))).toEqual([
      300, 600, 1200, 2400, 3600, 3600,
    ]);
  });

  it("considera bloqueada la cuenta solo mientras no venza el plazo", () => {
    const now = new Date("2026-09-27T12:00:00Z");
    expect(isLocked(null, now)).toBe(false);
    expect(isLocked(new Date("2026-09-27T12:05:00Z"), now)).toBe(true);
    expect(isLocked(new Date("2026-09-27T11:59:59Z"), now)).toBe(false);
  });
});
