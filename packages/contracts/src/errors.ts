import { z } from "zod";

/**
 * Códigos de error públicos de la API. Cada código tiene un único mensaje
 * genérico: casos equivalentes (recurso inexistente frente a recurso ajeno,
 * usuario inexistente frente a contraseña incorrecta) deben responder igual
 * para no convertirse en un oráculo de enumeración.
 */
export const apiErrorCodeSchema = z.enum([
  "bad_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "internal_error",
  "service_unavailable",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const API_ERRORS = {
  bad_request: { status: 400, message: "La solicitud no es válida." },
  unauthorized: { status: 401, message: "No fue posible verificar la solicitud." },
  forbidden: { status: 403, message: "No tienes acceso a este recurso." },
  not_found: { status: 404, message: "El recurso solicitado no existe." },
  rate_limited: {
    status: 429,
    message: "Demasiados intentos. Vuelve a intentarlo más tarde.",
  },
  internal_error: { status: 500, message: "Ocurrió un error inesperado." },
  service_unavailable: {
    status: 503,
    message: "El servicio no está disponible en este momento.",
  },
} as const satisfies Record<ApiErrorCode, { status: number; message: string }>;
