import { ObjectId } from "mongodb";
import { ApiError, assertSameOrigin, handleApiError, ok } from "@/lib/api";
import { requireSessionUser } from "@/lib/auth-guards";
import { getDb } from "@/lib/mongodb";
import { getUnreadCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    assertSameOrigin(request);
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");

    const db = await getDb();
    const result = await db.collection("notifications").updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(user.id), read: false },
      { $set: { read: true, readAt: new Date() } },
    );
    if (result.matchedCount === 0) {
      const exists = await db
        .collection("notifications")
        .countDocuments({ _id: new ObjectId(id), userId: new ObjectId(user.id) });
      if (exists === 0) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");
    }
    return ok({ unreadCount: await getUnreadCount(user.id) });
  } catch (error) {
    return handleApiError(error);
  }
}
