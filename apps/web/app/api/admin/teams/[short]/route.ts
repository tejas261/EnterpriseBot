import { adminTeamUpdateSchema, teamShortParamSchema } from "@ipl/shared";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth-guards";
import { getDb } from "@/lib/mongodb";
import { toTeamRecord, type TeamDoc } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Admin team update. Writes to MongoDB only: notifications are produced exclusively by the
 * Change Stream pipeline in the realtime service, exactly like a mongosh update.
 */
export async function PATCH(request: Request, context: { params: Promise<{ short: string }> }) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    rateLimit(request, "admin:team-update", 60, 60_000);

    const parsedShort = teamShortParamSchema.safeParse((await context.params).short);
    if (!parsedShort.success) throw new ApiError(404, "TEAM_NOT_FOUND", "Unknown team");
    const update = adminTeamUpdateSchema.parse(await readJson(request));

    const db = await getDb();
    const team = await db.collection<TeamDoc>("teams").findOneAndUpdate(
      { short: parsedShort.data },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!team) throw new ApiError(404, "TEAM_NOT_FOUND", "Unknown team");

    return ok({ team: toTeamRecord(team) });
  } catch (error) {
    return handleApiError(error);
  }
}
