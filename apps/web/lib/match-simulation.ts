import { applyBall, matchScoreSchema, oversToBalls, pickOutcome, toMatchScore } from "@ipl/shared";
import { ApiError } from "./api";
import { getDb } from "./mongodb";

/**
 * In-process match runner. Writes one ball at a time to MongoDB; the realtime service's
 * Change Stream broadcasts each write. State lives in this process, so a restart stops a
 * running simulation and multiple web instances would each run their own ticker.
 */
const POST_OVER_DELAY_MS = 10_000;

interface SimulationHandle {
  intervalMs: number;
  timer: ReturnType<typeof setTimeout>;
  ticking: boolean;
}

const globalForSimulation = globalThis as unknown as {
  iplSimulations?: Map<string, SimulationHandle>;
};
const simulations = (globalForSimulation.iplSimulations ??= new Map());

export interface SimulationStatus {
  matchId: string;
  running: boolean;
  intervalMs: number | null;
}

export function getSimulationStatus(matchId: string): SimulationStatus {
  const handle = simulations.get(matchId);
  return { matchId, running: Boolean(handle), intervalMs: handle?.intervalMs ?? null };
}

export function stopSimulation(matchId: string): SimulationStatus {
  const handle = simulations.get(matchId);
  if (handle) {
    clearTimeout(handle.timer);
    simulations.delete(matchId);
  }
  return getSimulationStatus(matchId);
}

function scheduleNextTick(matchId: string, delayMs: number): void {
  const handle = simulations.get(matchId);
  if (!handle) return;
  handle.timer = setTimeout(() => void tick(matchId), delayMs);
}

async function tick(matchId: string): Promise<void> {
  const handle = simulations.get(matchId);
  if (!handle || handle.ticking) return;
  handle.ticking = true;
  try {
    const db = await getDb();
    const doc = await db.collection("matches").findOne({ matchId });
    if (!doc) {
      stopSimulation(matchId);
      return;
    }

    const current = toMatchScore(doc);
    if (current.status !== "LIVE") {
      stopSimulation(matchId);
      return;
    }

    const ball = pickOutcome();
    const next = matchScoreSchema.parse(applyBall(current, ball));
    const legalBall = ball !== "wd";
    const ballsBowled = oversToBalls(next.score.overs) + (legalBall ? 1 : 0);
    const overJustCompleted = legalBall && ballsBowled % 6 === 0;
    const { updatedAt, ...rest } = next;
    await db
      .collection("matches")
      .updateOne({ _id: doc._id }, { $set: { ...rest, updatedAt: new Date(updatedAt) } });

    if (next.status !== "LIVE") {
      stopSimulation(matchId);
      return;
    }
    scheduleNextTick(
      matchId,
      overJustCompleted ? POST_OVER_DELAY_MS : handle.intervalMs,
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        service: "web",
        event: "simulation.tickFailed",
        matchId,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    stopSimulation(matchId);
  } finally {
    const current = simulations.get(matchId);
    if (current) current.ticking = false;
  }
}

export async function startSimulation(
  matchId: string,
  intervalMs = Number(process.env.SIMULATOR_INTERVAL_MS ?? 3000),
): Promise<SimulationStatus> {
  const existing = simulations.get(matchId);
  if (existing) return getSimulationStatus(matchId);

  const db = await getDb();
  const doc = await db.collection("matches").findOne({ matchId });
  if (!doc) throw new ApiError(404, "MATCH_NOT_FOUND", "Unknown match");
  if (toMatchScore(doc).status !== "LIVE") {
    throw new ApiError(409, "MATCH_COMPLETED", "Match is already complete; reseed to replay it");
  }

  simulations.set(matchId, {
    intervalMs,
    ticking: false,
    timer: setTimeout(() => void tick(matchId), intervalMs),
  });
  return getSimulationStatus(matchId);
}
