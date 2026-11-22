import { handleApiError, ok } from "@/lib/api";
import { requireSessionUser } from "@/lib/auth-guards";
import { getUnreadCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    return ok({ unreadCount: await getUnreadCount(user.id) });
  } catch (error) {
    return handleApiError(error);
  }
}
