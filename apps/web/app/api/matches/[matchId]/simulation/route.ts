import { simulationControlSchema } from "@ipl/shared";
import { assertSameOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { requireAdmin, requireSessionUser } from "@/lib/auth-guards";
import { getSimulationStatus, startSimulation, stopSimulation } from "@/lib/match-simulation";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Current runner state for this match. */
export async function GET(_request: Request, context: { params: Promise<{ matchId: string }> }) {
  try {
    await requireSessionUser();
    const { matchId } = await context.params;
    return ok({ simulation: getSimulationStatus(matchId) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Toggle the ball-by-ball runner: `{ "running": true }` starts it, `{ "running": false }` stops it. */
export async function POST(request: Request, context: { params: Promise<{ matchId: string }> }) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    rateLimit(request, "matches:simulation", 30, 60_000);

    const { matchId } = await context.params;
    const control = simulationControlSchema.parse(await readJson(request));
    const simulation = control.running
      ? await startSimulation(matchId, control.intervalMs)
      : stopSimulation(matchId);

    return ok({ simulation });
  } catch (error) {
    return handleApiError(error);
  }
}
