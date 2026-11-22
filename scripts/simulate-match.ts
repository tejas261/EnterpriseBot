import "dotenv/config";
import { MongoClient } from "mongodb";
import {
  DEMO_MATCH_ID,
  applyBall,
  createMatchState,
  matchScoreSchema,
  oversToBalls,
  pickOutcome,
  toMatchScore,
  type MatchScore,
} from "@ipl/shared";

const intervalMs = Number(process.env.SIMULATOR_INTERVAL_MS ?? 3000);
const matchId =
  process.argv.find((argument) => argument.startsWith("--match="))?.split("=")[1] ?? DEMO_MATCH_ID;

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ipl_live?replicaSet=rs0";
const dbName = process.env.MONGODB_DB ?? "ipl_live";

function describe(match: MatchScore, ball: string): string {
  const batters = match.batters
    .map((batter) => `${batter.name} ${batter.runs}(${batter.balls})${batter.onStrike ? "*" : ""}`)
    .join(", ");
  const bowler = match.bowler
    ? `${match.bowler.name} ${match.bowler.overs}-${match.bowler.runsConceded}-${match.bowler.wickets}`
    : "no bowler";
  return `${match.innings === 2 ? "2nd" : "1st"} inn · ${match.score.overs} · ${ball} → ${match.score.runs}/${match.score.wickets} | ${batters} | ${bowler}`;
}

async function main(): Promise<void> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(dbName);
  const matches = db.collection("matches");

  let doc = await matches.findOne({ matchId });
  if (!doc) {
    const teams = await db
      .collection("teams")
      .find({ short: { $in: ["RCB", "CSK"] } })
      .toArray();
    const rcb = teams.find((team) => team.short === "RCB");
    const csk = teams.find((team) => team.short === "CSK");
    if (!rcb || !csk) {
      throw new Error("Running teams not found. Run `npm run db:seed` first.");
    }
    const squads = await db.collection("squads").find({ teamShort: { $in: ["RCB", "CSK"] } }).toArray();
    const squadNames = (short: string): string[] =>
      squads.filter((s) => s.teamShort === short).map((s) => String(s.playerName));
    const initial = createMatchState({
      matchId,
      venue: String(rcb.homeGround),
      battingTeam: { short: "RCB", name: String(rcb.name) },
      bowlingTeam: { short: "CSK", name: String(csk.name) },
      squads: { RCB: squadNames("RCB"), CSK: squadNames("CSK") },
    });
    await matches.updateOne({ matchId }, { $setOnInsert: initial }, { upsert: true });
    doc = await matches.findOne({ matchId });
    console.log(`created demo match ${matchId}`);
  }
  if (!doc) throw new Error("Could not read the demo match");

  const documentId = doc._id;
  let match = toMatchScore(doc);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const shutdown = async (signal: string): Promise<void> => {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);
    console.log(`\n${signal} — simulator stopped during over ${match.score.overs}`);
    await client.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  console.log(
    `simulating ${matchId} every ${intervalMs}ms · ${match.battingTeam.short} vs ${match.bowlingTeam.short} · Ctrl+C to stop`,
  );

  const tick = async (): Promise<void> => {
    if (stopped) return;
    try {
      if (match.status !== "LIVE") {
        console.log("match is complete — stopping the simulator");
        await shutdown("COMPLETED");
        return;
      }
      const ball = pickOutcome();
      const next = applyBall(match, ball);
      const validated = matchScoreSchema.parse(next);
      const { updatedAt, ...rest } = validated;
      await matches.updateOne(
        { _id: documentId },
        { $set: { ...rest, updatedAt: new Date(updatedAt) } },
      );
      match = next;
      console.log(describe(next, ball));
      console.log(
        `${next.battingTeam.short} ${next.score.runs}/${next.score.wickets} (${next.score.overs}/${next.score.totalOvers}) over balls: ${
          next.currentOverBalls.join(" ") || "new over"
        } · ${oversToBalls(next.score.overs)} legal balls`,
      );
    } catch (error) {
      console.error("simulator error:", error instanceof Error ? error.message : error);
    }
    if (!stopped) timer = setTimeout(() => void tick(), intervalMs);
  };

  await tick();
}

main().catch((error: unknown) => {
  console.error("simulator failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
