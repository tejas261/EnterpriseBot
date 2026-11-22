import type { BallResult } from "./constants";
import type { MatchScore } from "./schemas";
import { ballsToOvers, oversToBalls } from "./cricket";

export interface TeamRefInput {
  short: MatchScore["battingTeam"]["short"];
  name: string;
}

/** Batting order for the team currently at the crease; `squads` wins over the legacy list. */
function battingNames(match: MatchScore): string[] {
  return match.squads?.[match.battingTeam.short] ?? match.batterNames ?? [];
}

/** Real player from the bowling team's squad for a completed over; generic fallback. */
function bowlerNameFor(match: MatchScore, completedOvers: number): string {
  const squad = match.squads?.[match.bowlingTeam.short] ?? [];
  const player = squad[Math.floor(completedOvers) - 1];
  return player ?? `${match.bowlingTeam.short} Bowler ${Math.max(1, Math.floor(completedOvers))}`;
}

export function createMatchState(params: {
  matchId: string;
  venue: string;
  battingTeam: TeamRefInput;
  bowlingTeam: TeamRefInput;
  totalOvers?: number;
  now?: Date;
  batterNames?: string[];
  squads?: MatchScore["squads"];
}): MatchScore {
  const totalOvers = params.totalOvers ?? 20;
  const names = params.squads?.[params.battingTeam.short] ?? params.batterNames;
  const batterName1 = names?.[0] || `${params.battingTeam.short} Batter 1`;
  const batterName2 = names?.[1] || `${params.battingTeam.short} Batter 2`;
  return {
    matchId: params.matchId,
    status: "LIVE",
    venue: params.venue,
    innings: 1,
    battingTeam: { ...params.battingTeam },
    bowlingTeam: { ...params.bowlingTeam },
    score: { runs: 0, wickets: 0, overs: "0.0", totalOvers },
    target: null,
    batters: [
      { name: batterName1, runs: 0, balls: 0, onStrike: true },
      { name: batterName2, runs: 0, balls: 0, onStrike: false },
    ],
    bowler: {
      name: `${params.bowlingTeam.short} Bowler 1`,
      overs: "0.0",
      runsConceded: 0,
      wickets: 0,
    },
    currentOverBalls: [],
    battersUsed: 2,
    updatedAt: (params.now ?? new Date()).toISOString(),
    batterNames: params.batterNames,
    squads: params.squads,
  };
}

function swapStrike(batters: MatchScore["batters"]): void {
  for (const batter of batters) batter.onStrike = !batter.onStrike;
}

function startSecondInnings(match: MatchScore): void {
  const firstInningsRuns = match.score.runs;
  const battingTeam = match.bowlingTeam;
  const bowlingTeam = match.battingTeam;
  match.innings = 2;
  match.battingTeam = { ...battingTeam };
  match.bowlingTeam = { ...bowlingTeam };
  match.score = { runs: 0, wickets: 0, overs: "0.0", totalOvers: match.score.totalOvers };
  match.target = firstInningsRuns + 1;
  match.battersUsed = 2;
  const names = battingNames(match);
  const batterName1 = names[0] || `${battingTeam.short} Batter 1`;
  const batterName2 = names[1] || `${battingTeam.short} Batter 2`;
  match.batters = [
    { name: batterName1, runs: 0, balls: 0, onStrike: true },
    { name: batterName2, runs: 0, balls: 0, onStrike: false },
  ];
  match.bowler = {
    name: bowlerNameFor(match, 1),
    overs: "0.0",
    runsConceded: 0,
    wickets: 0,
  };
  match.currentOverBalls = [];
}

/** Applies one ball to the match state. Pure: returns a new object and never mutates the input. */
export function applyBall(match: MatchScore, ball: BallResult, now: Date = new Date()): MatchScore {
  if (match.status !== "LIVE") return match;
  const next = structuredClone(match);
  const striker = next.batters.find((batter) => batter.onStrike) ?? next.batters[0];
  if (!striker || !next.bowler) return match;

  const legalBall = ball !== "wd";
  const batterRuns = ball === "wd" || ball === "W" || ball === "•" ? 0 : Number(ball);

  if (ball === "wd") {
    next.score.runs += 1;
    next.bowler.runsConceded += 1;
    next.currentOverBalls.push("wd");
  } else {
    next.score.runs += batterRuns;
    striker.runs += batterRuns;
    striker.balls += 1;
    next.bowler.runsConceded += batterRuns;

    const bowlerBalls = oversToBalls(next.bowler.overs) + 1;
    next.bowler.overs = ballsToOvers(bowlerBalls);
    next.currentOverBalls.push(ball);

    if (ball === "W") {
      next.score.wickets += 1;
      next.bowler.wickets += 1;
      if (next.score.wickets < 10) {
        next.battersUsed += 1;
        const batterNames = battingNames(next);
        // A new batter takes the next slot in the batting order (1-indexed).
        const newBatterName =
          batterNames.length >= next.battersUsed ? batterNames[next.battersUsed - 1] : undefined;
        next.batters = next.batters.map((batter) => {
          if (batter === striker && newBatterName !== undefined) {
            return {
              name: newBatterName,
              runs: 0,
              balls: 0,
              onStrike: true,
            };
          }
          if (batter === striker) {
            return {
              name: `${next.battingTeam.short} Batter ${next.battersUsed}`,
              runs: 0,
              balls: 0,
              onStrike: true,
            };
          }
          return { ...batter, onStrike: false };
        });
      }
    } else if (batterRuns % 2 === 1) {
      swapStrike(next.batters);
    }
  }

  const ballsBowled = oversToBalls(next.score.overs) + (legalBall ? 1 : 0);
  if (legalBall) {
    next.score.overs = ballsToOvers(ballsBowled);
    const overComplete = ballsBowled % 6 === 0;
    if (overComplete) {
      swapStrike(next.batters);
      next.currentOverBalls = [];
      const completedOvers = ballsBowled / 6;
      next.bowler = {
        name: bowlerNameFor(next, completedOvers),
        overs: "0.0",
        runsConceded: 0,
        wickets: 0,
      };
    }
  }

  const inningsOver = ballsBowled >= next.score.totalOvers * 6;
  const allOut = next.score.wickets >= 10;
  const chaseWon =
    next.innings === 2 && next.target !== null && next.target !== undefined && next.score.runs >= next.target;

  if (chaseWon || inningsOver || allOut) {
    if (next.innings === 1) {
      startSecondInnings(next);
    } else {
      next.status = "COMPLETED";
    }
  }

  next.updatedAt = now.toISOString();
  return next;
}

const OUTCOME_TABLE: ReadonlyArray<readonly [BallResult, number]> = [
  ["•", 32],
  ["1", 26],
  ["2", 12],
  ["3", 3],
  ["4", 13],
  ["6", 7],
  ["W", 4],
  ["wd", 3],
];

/** Weighted random ball outcome. Pass a deterministic rng for tests/replays. */
export function pickOutcome(random: () => number = Math.random): BallResult {
  const total = OUTCOME_TABLE.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [outcome, weight] of OUTCOME_TABLE) {
    roll -= weight;
    if (roll < 0) return outcome;
  }
  return "•";
}