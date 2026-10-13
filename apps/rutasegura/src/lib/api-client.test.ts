import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const unauthorized = () =>
  json(401, { error: { code: "unauthorized", message: "No fue posible verificar la solicitud." } });

describe("apiRequest", () => {
  it("envía JSON al mismo origen y devuelve los datos", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { ok: 1 }));
    const result = await apiRequest("/api/v1/tracking", {
      method: "POST",
      body: { trackingNumber: "RS0000000001" },
      fetchImpl,
    });

    expect(result).toEqual({ ok: true, status: 200, data: { ok: 1 } });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/v1/tracking",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("ante un 401 renueva la sesión una sola vez y repite la petición", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json(200, { user: {} }))
      .mockResolvedValueOnce(json(200, { shipments: [] }));

    const result = await apiRequest("/api/v1/shipments", { fetchImpl });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[1]![0]).toBe("/api/v1/auth/refresh");
  });

  it("si la renovación falla devuelve el 401 sin reintentar más", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized());

    const result = await apiRequest("/api/v1/shipments", { fetchImpl });

    expect(result).toMatchObject({ ok: false, status: 401, code: "unauthorized" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("expone Retry-After de un 429", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        json(429, { error: { code: "rate_limited", message: "x" } }, { "retry-after": "120" }),
      );

    const result = await apiRequest("/api/v1/tracking", { method: "POST", body: {}, fetchImpl });
    expect(result).toMatchObject({ ok: false, status: 429, code: "rate_limited", retryAfter: 120 });
  });

  it("convierte un fallo de red en un error controlado", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await apiRequest("/api/v1/tracking", { fetchImpl });
    expect(result).toMatchObject({ ok: false, status: 0, code: "network_error" });
  });
});
