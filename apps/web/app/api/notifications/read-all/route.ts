import { assertSameOrigin, handleApiError, ok } from "@/lib/api";
import { requireSessionUser } from "@/lib/auth-guards";
import { markAllNotificationsRead } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Scoped to the authenticated user, idempotent, and never touches other users' documents. */
export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    assertSameOrigin(request);
    rateLimit(request, "notifications:read", 60, 60_000);
    const result = await markAllNotificationsRead(user.id);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
