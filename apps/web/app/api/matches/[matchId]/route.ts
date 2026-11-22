import { toMatchScore, type MatchScore } from "@ipl/shared";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await context.params;
    if (!matchId || matchId.length > 100) throw new ApiError(404, "MATCH_NOT_FOUND", "Unknown match");
    const db = await getDb();
    const doc = await db.collection("matches").findOne({ matchId });
    if (!doc) throw new ApiError(404, "MATCH_NOT_FOUND", "Unknown match");

    let match: MatchScore;
    try {
      match = toMatchScore(doc);
    } catch {
      throw new ApiError(500, "INVALID_MATCH", "Stored match is invalid");
    }
    return ok({ match });
  } catch (error) {
    return handleApiError(error);
  }
}
