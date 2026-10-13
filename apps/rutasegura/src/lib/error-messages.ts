import { API_ERRORS, type ApiErrorCode } from "@rutasegura/contracts";

/** Código de fallo que ve la UI: los de la API más el fallo de red del cliente. */
export type UiErrorCode = ApiErrorCode | "network_error";

/** Pantalla o formulario donde se muestra el error. */
export type ErrorContext =
  "generic" | "login" | "register" | "tracking" | "claim" | "schedule" | "documents";

export const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";

/**
 * Mensajes base: los de `API_ERRORS`, la misma fuente que usa el servidor, más
 * el fallo de red, que solo existe en el cliente.
 */
const BASE_MESSAGES: Record<UiErrorCode, string> = {
  ...(Object.fromEntries(
    Object.entries(API_ERRORS).map(([code, { message }]) => [code, message]),
  ) as Record<ApiErrorCode, string>),
  network_error: NETWORK_ERROR_MESSAGE,
};

/**
 * Textos accionables por pantalla. Nunca distinguen casos que la API iguala a
 * propósito (envío ajeno frente a inexistente, usuario frente a contraseña).
 */
const CONTEXT_MESSAGES: Record<ErrorContext, Partial<Record<UiErrorCode, string>>> = {
  generic: {},
  login: {},
  register: { bad_request: "Revisa los datos: la contraseña no cumple la política." },
  tracking: {
    tracking_not_found:
      "No pudimos verificar la información. Revisa los datos o intenta más tarde.",
    bad_request: "Revisa el formato de la guía y de los 4 dígitos.",
  },
  claim: {
    not_found: "No pudimos verificar la información. Revisa los datos o intenta más tarde.",
  },
  schedule: {
    invalid_schedule:
      "La franja elegida no está disponible para este envío. Elige otra franja futura de lunes a viernes.",
    not_found: "Este envío no está disponible.",
  },
  documents: {
    not_found: "Este documento no está disponible.",
    service_unavailable: "El almacenamiento de documentos no está disponible. Intenta más tarde.",
  },
};

export function isUiErrorCode(code: unknown): code is UiErrorCode {
  return typeof code === "string" && Object.hasOwn(BASE_MESSAGES, code);
}

/** Mensaje para un código; uno desconocido se trata como error interno. */
export function errorMessage(code: string, context: ErrorContext = "generic"): string {
  if (!isUiErrorCode(code)) return BASE_MESSAGES.internal_error;
  return CONTEXT_MESSAGES[context][code] ?? BASE_MESSAGES[code];
}

/** Texto de las fronteras de error: sin mensaje ni traza del error real. */
export const PAGE_ERROR = {
  title: "Algo salió mal",
  body: "No pudimos completar la operación. Inténtalo de nuevo en unos segundos.",
  reference: "Código de referencia",
} as const;
