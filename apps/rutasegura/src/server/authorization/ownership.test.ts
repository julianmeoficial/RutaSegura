import { describe, expect, it } from "vitest";
import { assertOwnership, OwnershipError } from "./ownership";

const alice = "0b6f1c1e-8f7a-4c1b-9d7e-2b1f4f0a9c3d";
const bob = "7d2a5e90-1c3b-4f6a-8e2d-9a0b1c2d3e4f";

describe("assertOwnership", () => {
  it("deja pasar al dueño exacto", () => {
    expect(() => assertOwnership({ ownerId: alice }, alice)).not.toThrow();
  });

  it("rechaza recursos ajenos, sin dueño o inexistentes con el mismo error", () => {
    expect(() => assertOwnership({ ownerId: bob }, alice)).toThrow(OwnershipError);
    expect(() => assertOwnership({ ownerId: null }, alice)).toThrow(OwnershipError);
    expect(() => assertOwnership(undefined, alice)).toThrow(OwnershipError);
    expect(() => assertOwnership(null, alice)).toThrow(OwnershipError);
  });

  it("compara por igualdad exacta, sin normalizar", () => {
    expect(() => assertOwnership({ ownerId: alice.toUpperCase() }, alice)).toThrow(OwnershipError);
    expect(() => assertOwnership({ ownerId: ` ${alice}` }, alice)).toThrow(OwnershipError);
    expect(() => assertOwnership({ ownerId: "" }, "")).not.toThrow();
  });
});
