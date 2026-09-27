import { authenticate } from "@/server/auth/require-user";
import { withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling("auth.me", async (request) => {
  const user = await authenticate(request);
  if (!user) return apiError("unauthorized");
  return apiJson({ user });
});
