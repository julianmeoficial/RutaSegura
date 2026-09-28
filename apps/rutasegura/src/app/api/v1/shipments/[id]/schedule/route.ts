import { scheduleRequestSchema, ulidSchema } from "@rutasegura/contracts";
import { authenticate } from "@/server/auth/require-user";
import { clientIp, readJson, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { shipmentsRules } from "@/server/rate-limit/policies";
import { scheduleShipment, unscheduleShipment } from "@/server/services/shipments";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandling<Context>(
  "shipments.schedule",
  async (request, { params }) => {
    const user = await authenticate(request);
    if (!user) return apiError("unauthorized");

    const limit = await guardRateLimit(shipmentsRules(user.id), {
      userId: user.id,
      ip: clientIp(request),
      userAgent: userAgent(request),
    });
    if (limit instanceof Response) return limit;
    const { headers } = limit;

    const id = ulidSchema.safeParse((await params).id);
    if (!id.success) return apiError("not_found", { headers });

    const body = scheduleRequestSchema.safeParse(await readJson(request));
    if (!body.success) return apiError("bad_request", { headers });

    const result = await scheduleShipment(id.data, user.id, body.data);
    if (!result.ok) return apiError("invalid_schedule", { headers });
    return apiJson(result.shipment, { headers });
  },
);

export const DELETE = withErrorHandling<Context>(
  "shipments.unschedule",
  async (request, { params }) => {
    const user = await authenticate(request);
    if (!user) return apiError("unauthorized");

    const limit = await guardRateLimit(shipmentsRules(user.id), {
      userId: user.id,
      ip: clientIp(request),
      userAgent: userAgent(request),
    });
    if (limit instanceof Response) return limit;
    const { headers } = limit;

    const id = ulidSchema.safeParse((await params).id);
    if (!id.success) return apiError("not_found", { headers });

    const result = await unscheduleShipment(id.data, user.id);
    if (!result.ok) return apiError("invalid_schedule", { headers });
    return apiJson(result.shipment, { headers });
  },
);
