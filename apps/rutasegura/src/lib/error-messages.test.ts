import { describe, expect, it } from "vitest";
import { API_ERRORS, apiErrorCodeSchema } from "@rutasegura/contracts";
import {
  errorMessage,
  isUiErrorCode,
  NETWORK_ERROR_MESSAGE,
  type ErrorContext,
} from "./error-messages";

const CONTEXTS: ErrorContext[] = [
  "generic",
  "login",
  "register",
  "tracking",
  "claim",
  "schedule",
  "documents",
];

describe("errorMessage", () => {
  it("tiene mensaje para cada código de la API en cada pantalla", () => {
    for (const code of apiErrorCodeSchema.options) {
      for (const context of CONTEXTS) {
        expect(errorMessage(code, context).length).toBeGreaterThan(0);
      }
    }
  });

  it("sin texto propio de la pantalla usa el mensaje del servidor", () => {
    for (const code of apiErrorCodeSchema.options) {
      expect(errorMessage(code)).toBe(API_ERRORS[code].message);
    }
  });

  it("incluye el fallo de red del cliente", () => {
    expect(isUiErrorCode("network_error")).toBe(true);
    expect(errorMessage("network_error", "documents")).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("un código desconocido se muestra como error interno, sin eco del valor", () => {
    expect(errorMessage("<script>")).toBe(API_ERRORS.internal_error.message);
    expect(isUiErrorCode("toString")).toBe(false);
  });

  it("los textos por pantalla no distinguen ajeno de inexistente", () => {
    expect(errorMessage("not_found", "claim")).toBe(errorMessage("tracking_not_found", "tracking"));
  });
});
