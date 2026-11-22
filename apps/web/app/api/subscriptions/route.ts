import { ObjectId } from "mongodb";
import { DEFAULT_SUBSCRIPTION_FIELDS, subscriptionInputSchema } from "@ipl/shared";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { requireSessionUser } from "@/lib/auth-guards";
import { getDb } from "@/lib/mongodb";
import { findTeamByShort, listSubscriptions, toSubscriptionDto, type SubscriptionDoc } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    return ok({ subscriptions: await listSubscriptions(user.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    assertSameOrigin(request);
    rateLimit(request, "subscriptions:write", 60, 60_000);
    const input = subscriptionInputSchema.parse(await readJson(request));

    const team = await findTeamByShort(input.teamShort);
    if (!team) throw new ApiError(404, "TEAM_NOT_FOUND", "Unknown team");

    const fields = [...new Set(input.fields ?? DEFAULT_SUBSCRIPTION_FIELDS)];
    const now = new Date();
    const db = await getDb();
    const subscription = await db.collection<SubscriptionDoc>("subscriptions").findOneAndUpdate(
      { userId: new ObjectId(user.id), teamId: team._id },
      {
        $set: { teamShort: team.short, fields, updatedAt: now },
        $setOnInsert: {
          userId: new ObjectId(user.id),
          teamId: team._id,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!subscription) throw new ApiError(500, "INTERNAL_ERROR", "Could not save subscription");

    return ok({ subscription: toSubscriptionDto(subscription) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
