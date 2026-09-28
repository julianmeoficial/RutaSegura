import { describe, expect, it } from "vitest";
import { generateUlid, isUlid } from "./ulid";

describe("generateUlid", () => {
  it("genera 26 caracteres Crockford válidos", () => {
    const id = generateUlid();
    expect(id).toHaveLength(26);
    expect(isUlid(id)).toBe(true);
  });

  it("codifica el tiempo en los primeros 10 caracteres", () => {
    expect(generateUlid(0).slice(0, 10)).toBe("0000000000");
    expect(generateUlid(1_469_918_176_385).slice(0, 10)).toBe("01ARYZ6S41");
  });

  it("no repite identificadores en el mismo milisegundo", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateUlid(1_790_000_000_000)));
    expect(ids.size).toBe(1000);
  });
});

describe("isUlid", () => {
  it("rechaza UUID, minúsculas y letras ambiguas", () => {
    expect(isUlid("5f0c7c1e-8f7a-4c1b-9d7e-2b1f4f0a9c3d")).toBe(false);
    expect(isUlid("01aryz6s41tsv4rrffq69g5fav")).toBe(false);
    expect(isUlid("01ARYZ6S41TSV4RRFFQ69G5FAU")).toBe(false);
  });
});
