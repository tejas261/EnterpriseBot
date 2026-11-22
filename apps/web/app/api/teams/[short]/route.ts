import { teamShortParamSchema } from "@ipl/shared";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { findTeamByShort, toTeamRecord } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ short: string }> }) {
  try {
    const parsed = teamShortParamSchema.safeParse((await context.params).short);
    if (!parsed.success) throw new ApiError(404, "TEAM_NOT_FOUND", "Unknown team");
    const team = await findTeamByShort(parsed.data);
    if (!team) throw new ApiError(404, "TEAM_NOT_FOUND", "Unknown team");
    return ok({ team: toTeamRecord(team) });
  } catch (error) {
    return handleApiError(error);
  }
}
