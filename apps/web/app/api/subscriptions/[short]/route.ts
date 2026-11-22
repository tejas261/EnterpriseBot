import { ObjectId } from "mongodb";
import { subscriptionFieldsSchema, teamShortParamSchema } from "@ipl/shared";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { requireSessionUser } from "@/lib/auth-guards";
import { getDb } from "@/lib/mongodb";
import { findTeamByShort, toSubscriptionDto, type SubscriptionDoc } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ short: string }> };

async function resolve(short: string) {
  const parsed = teamShortParamSchema.safeParse(short);
  if (!parsed.success) throw new ApiError(404, "TEAM_NOT_FOUND", "Unknown team");
  const team = await findTeamByShort(parsed.data);
  if (!team) throw new ApiError(404, "TEAM_NOT_FOUND", "Unknown team");
  return team;
}

/** Updates field-level preferences. An empty array means "followed, but notify me about nothing". */
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireSessionUser();
    assertSameOrigin(request);
    rateLimit(request, "subscriptions:write", 60, 60_000);
    const team = await resolve((await context.params).short);
    const input = subscriptionFieldsSchema.parse(await readJson(request));

    const db = await getDb();
    const userId = new ObjectId(user.id);
    const updated = await db.collection<SubscriptionDoc>("subscriptions").findOneAndUpdate(
      { userId, teamId: team._id },
      { $set: { fields: [...new Set(input.fields)], updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!updated) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "You are not following that team");

    return ok({ subscription: toSubscriptionDto(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireSessionUser();
    assertSameOrigin(request);
    rateLimit(request, "subscriptions:write", 60, 60_000);
    const team = await resolve((await context.params).short);

    const db = await getDb();
    const result = await db.collection("subscriptions").deleteOne({
      userId: new ObjectId(user.id),
      teamId: team._id,
    });
    return ok({ removed: result.deletedCount > 0 });
  } catch (error) {
    return handleApiError(error);
  }
}
