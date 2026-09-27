import { describe, expect, it } from "vitest";
import { API_ERRORS, apiErrorCodeSchema } from "./errors";

describe("API_ERRORS", () => {
  it("define un mensaje para cada código público", () => {
    for (const code of apiErrorCodeSchema.options) {
      expect(API_ERRORS[code].message.length).toBeGreaterThan(0);
    }
  });

  it("usa estados HTTP de error", () => {
    for (const { status } of Object.values(API_ERRORS)) {
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });
});
