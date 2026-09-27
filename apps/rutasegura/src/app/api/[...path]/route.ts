import { apiError } from "@/server/http/responses";

// Toda ruta de API sin handler responde con el mismo 404 JSON genérico.
function notFound() {
  return apiError("not_found");
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
