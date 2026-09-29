import { requireUser } from "@/server/auth/require-user";
import { withErrorHandling } from "@/server/http/guards";
import { apiJson } from "@/server/http/responses";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling("auth.me", async (request) => {
  const user = await requireUser(request, "auth.me");
  if (user instanceof Response) return user;
  return apiJson({ user });
});
