import { notificationsQuerySchema } from "@ipl/shared";
import { handleApiError, ok } from "@/lib/api";
import { requireSessionUser } from "@/lib/auth-guards";
import { listNotifications } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const url = new URL(request.url);
    const query = notificationsQuerySchema.parse({
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      unreadOnly: url.searchParams.get("unreadOnly") ?? undefined,
    });

    const result = await listNotifications({
      userId: user.id,
      limit: query.limit,
      cursor: query.cursor,
      unreadOnly: query.unreadOnly === "true",
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
