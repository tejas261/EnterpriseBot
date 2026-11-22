import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import type { Collection } from "mongodb";
import { createMatchState, DEMO_MATCH_ID } from "@ipl/shared";
import { withDb } from "./lib/db";

// Read team data from the seed JSON file
const teamsDataPath = path.resolve(
  process.cwd(),
  "data/ipl_2026_seed_data/teams.json",
);
const teamsData = JSON.parse(fs.readFileSync(teamsDataPath, "utf-8")) as Array<{
  name: string;
  short: string;
  logoUrl: string;
  captain: string;
  headCoach: string;
  homeGround: string;
  homeCity?: string;
  titles: number;
  titleYears: number[];
  season: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  noResults: number;
  points: number;
  netRunRate: number;
}>;

const SEASON = "2026";

/**
 * IPL 2026 rosters and all-time title counts.
 * Data sourced from teams.json — tournament-winning titles, season stats,
 * and net run rate are included for richness but only the required fields
 * are written to MongoDB (fields an admin has edited are never overwritten).
 * Re-running the seed never overwrites fields an admin has edited.
 */
function mapTeamFromSeed(team: typeof teamsData[0]) {
  return {
    name: team.name,
    short: team.short,
    logoUrl: team.logoUrl,
    captain: team.captain,
    headCoach: team.headCoach,
    homeGround: team.homeGround,
    // Extra seed data (homeCity, titleYears, matchesPlayed, noResults, netRunRate)
    // are valuable for display but not part of the minimal TeamRecord; they are
    // stored alongside the required fields so they are available if the UI
    // is later extended without a migration.
    homeCity: team.homeCity,
    titleYears: team.titleYears,
    matchesPlayed: team.matchesPlayed,
    noResults: team.noResults,
    netRunRate: team.netRunRate,
    titles: team.titles,
    wins: team.wins,
    losses: team.losses,
    points: team.points,
    season: SEASON,
  };
}

type StoredBatter = { name: string; runs: number; balls: number; onStrike: boolean };

/**
 * One-time repair for demo matches seeded before squads were wired in: replaces generic
 * "RCB Batter 3" slots with real player names while keeping score progress intact.
 */
async function backfillDemoPlayers(
  matches: Collection,
  squadsByTeam: Map<string, string[]>,
): Promise<void> {
  const existing = await matches.findOne({ matchId: DEMO_MATCH_ID });
  if (!existing) return;

  const patch: Record<string, unknown> = {};
  if (!existing.squads) {
    patch.squads = { RCB: squadsByTeam.get("RCB") ?? [], CSK: squadsByTeam.get("CSK") ?? [] };
  }

  const battingShort = (existing.battingTeam as { short?: string } | undefined)?.short;
  const legacyNames = existing.batterNames as string[] | undefined;
  const names =
    (existing.innings === 1 && legacyNames ? legacyNames : undefined) ??
    (battingShort ? squadsByTeam.get(battingShort) : undefined) ??
    legacyNames ??
    [];

  const batters = existing.batters as StoredBatter[] | undefined;
  if (batters) {
    const renamed = batters.map((batter) => {
      const slot = /^[A-Z]{2,4} Batter (\d+)$/.exec(batter.name);
      const name = slot ? names[Number(slot[1]) - 1] : undefined;
      return name ? { ...batter, name } : batter;
    });
    if (renamed.some((batter, index) => batter.name !== batters[index]?.name)) {
      patch.batters = renamed;
    }
  }

  const bowlingShort = (existing.bowlingTeam as { short?: string } | undefined)?.short;
  const bowlingSquad = bowlingShort ? squadsByTeam.get(bowlingShort) ?? [] : [];
  const bowler = existing.bowler as { name?: string } | null;
  const bowlerSlot = bowler?.name ? /^([A-Z]{2,4}) Bowler (\d+)$/.exec(bowler.name) : null;
  const bowlerName = bowlerSlot ? bowlingSquad[Number(bowlerSlot[2]) - 1] : undefined;
  if (bowlerName && bowler && bowler.name !== bowlerName) {
    patch.bowler = { ...bowler, name: bowlerName };
  }

  if (Object.keys(patch).length > 0) {
    await matches.updateOne({ _id: existing._id }, { $set: patch });
    console.log(`demo match player names backfilled: ${DEMO_MATCH_ID}`);
  }
}

async function main(): Promise<void> {
  await withDb(async (db) => {
    const now = new Date();
    const result = await db.collection("teams").bulkWrite(
      teamsData.map((team) => ({
        updateOne: {
          filter: { short: team.short },
          update: { $setOnInsert: { ...mapTeamFromSeed(team), createdAt: now, updatedAt: now } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    console.log(`teams seeded: ${result.upsertedCount} inserted, ${teamsData.length} total`);

    // Seed player squads into a dedicated collection if it doesn't exist yet.
    const squadsDataPath = path.resolve(
      process.cwd(),
      "data/ipl_2026_seed_data/squads.json",
    );
    const squadsData = JSON.parse(fs.readFileSync(squadsDataPath, "utf-8")) as Array<{
      teamShort: string;
      teamName: string;
      playerName: string;
    }>;

    // Ensure the squads collection exists
    await db.collection("squads").createIndex({ playerName: 1, teamShort: 1 }, { unique: true });

    const squadsBulk = squadsData.map((player) => ({
      updateOne: {
        filter: { playerName: player.playerName, teamShort: player.teamShort },
        update: {
          $setOnInsert: {
            playerName: player.playerName,
            teamShort: player.teamShort,
            createdAt: now,
            updatedAt: now,
          },
          $set: { teamName: player.teamName },
        },
        upsert: true,
      },
    }));

    const squadsResult = await db.collection("squads").bulkWrite(squadsBulk, { ordered: false });
    console.log(
      `squads seeded: ${squadsResult.upsertedCount} inserted, ${squadsData.length} total`,
    );

    // Demo match — player names come from the persisted squads collection.
    const squadsByTeam = new Map<string, string[]>();
    for (const player of squadsData) {
      const squad = squadsByTeam.get(player.teamShort) ?? [];
      squad.push(player.playerName);
      squadsByTeam.set(player.teamShort, squad);
    }
    const rcbSquad = squadsByTeam.get("RCB") ?? [];
    const cskSquad = squadsByTeam.get("CSK") ?? [];

    // Demo match
    const demo = createMatchState({
      matchId: DEMO_MATCH_ID,
      venue: "M. Chinnaswamy Stadium",
      battingTeam: { short: "RCB", name: "Royal Challengers Bengaluru" },
      bowlingTeam: { short: "CSK", name: "Chennai Super Kings" },
      squads: { RCB: rcbSquad, CSK: cskSquad },
      now,
    });
    const matches = db.collection("matches");
    const matchResult = await matches.updateOne(
      { matchId: DEMO_MATCH_ID },
      { $setOnInsert: demo },
      { upsert: true },
    );
    console.log(
      matchResult.upsertedCount > 0
        ? `demo match created: ${DEMO_MATCH_ID}`
        : `demo match already exists: ${DEMO_MATCH_ID}`,
    );
    if (matchResult.upsertedCount === 0) {
      await backfillDemoPlayers(matches, squadsByTeam);
    }
    console.log("Season label: 2026 · titles are cumulative IPL titles through 2026");
  });
}

main().catch((error: unknown) => {
  console.error("db:seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});