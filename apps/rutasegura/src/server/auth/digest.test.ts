import { phoneLast4Digest } from "@rutasegura/database/tracking-digest";
import { describe, expect, it } from "vitest";
import { keyedDigest, safeEqual } from "./digest";

const secret = "test_only_secret_value_with_32_chars_min";

describe("digest", () => {
  it("separa los resúmenes por propósito", () => {
    expect(keyedDigest(secret, "rl-ip", "1.2.3.4")).not.toBe(
      keyedDigest(secret, "audit-ip", "1.2.3.4"),
    );
  });

  it("liga los dígitos del teléfono a su guía", () => {
    const digest = phoneLast4Digest(secret, "RS0000000001", "4321");
    expect(safeEqual(digest, phoneLast4Digest(secret, "RS0000000001", "4321"))).toBe(true);
    expect(safeEqual(digest, phoneLast4Digest(secret, "RS0000000002", "4321"))).toBe(false);
    expect(safeEqual(digest, phoneLast4Digest(secret, "RS0000000001", "4320"))).toBe(false);
  });

  it("compara en tiempo constante sin lanzar con largos distintos", () => {
    expect(safeEqual("abc", "")).toBe(false);
  });
});
