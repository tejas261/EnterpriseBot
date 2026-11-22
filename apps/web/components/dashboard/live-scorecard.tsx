"use client";

import { Radio } from "lucide-react";
import {
  formatRunRate,
  oversToBalls,
  type BallResult,
  type MatchScore,
} from "@ipl/shared";
import { useLiveMatch, type MatchConnectionStatus } from "@/hooks/use-live-match";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const BALL_STYLES: Record<BallResult, string> = {
  "•": "bg-[#eceef2] text-[#3f4652]",
  "1": "bg-[#eceef2] text-[#3f4652]",
  "2": "bg-[#eceef2] text-[#3f4652]",
  "3": "bg-[#eceef2] text-[#3f4652]",
  "4": "bg-primary text-primary-foreground",
  "6": "bg-primary text-primary-foreground",
  W: "bg-[#d32f2f] text-white",
  wd: "bg-[#f4e7cf] text-[#8a6a2f]",
};

function overRuns(balls: BallResult[]): number {
  return balls.reduce(
    (sum, ball) => sum + (ball === "W" || ball === "•" ? 0 : ball === "wd" ? 1 : Number(ball)),
    0,
  );
}

function FeedStatus({ status }: { status: MatchConnectionStatus }) {
  const dot =
    status === "live"
      ? "bg-[#22c55e]"
      : status === "reconnecting"
        ? "bg-warning"
        : "bg-white/40";
  const label =
    status === "live" ? "Feed live" : status === "reconnecting" ? "Reconnecting…" : "Connecting…";

  return (
    <span className="flex items-center gap-2 text-[13px] text-white/60">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function Scorecard({
  match,
  status,
}: {
  match: MatchScore;
  status: MatchConnectionStatus;
}) {
  const ballsBowled = oversToBalls(match.score.overs);
  const progress = Math.min(100, (ballsBowled / (match.score.totalOvers * 6)) * 100);
  const overNumber = Math.floor(ballsBowled / 6) + 1;
  const runsThisOver = overRuns(match.currentOverBalls);
  const economy =
    match.bowler && match.bowler.overs !== "0.0"
      ? (match.bowler.runsConceded / (oversToBalls(match.bowler.overs) / 6)).toFixed(1)
      : "–";

  return (
    <Card className="overflow-hidden">
      <div className="bg-[#1e2632] px-6 pb-4 pt-6 text-white">
        <div className="flex items-center gap-3">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#d32f2f] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
            Live
          </span>
          <p className="min-w-0 flex-1 truncate text-[15px] text-white/75">
            {match.battingTeam.name} <span className="text-white/40">v</span>{" "}
            {match.bowlingTeam.name}
          </p>
          <div className="shrink-0">
            <FeedStatus status={status} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="flex items-baseline gap-4">
            <span className="text-lg font-semibold text-white/55">{match.battingTeam.short}</span>
            <p className="text-[56px] font-semibold leading-none tracking-tight tabular-nums">
              {match.score.runs}
              <span className="text-white/90">/</span>
              {match.score.wickets}
            </p>
          </div>

          <div className="flex items-end gap-8 pb-0.5 text-right">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                Overs
              </p>
              <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums">
                {match.score.overs}
                <span className="text-lg font-medium leading-none text-white/45">
                  {" "}
                  / {match.score.totalOvers}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                Run rate
              </p>
              <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums">
                {formatRunRate(match.score.runs, ballsBowled)}
              </p>
            </div>
          </div>
        </div>

        <div
          className="mt-10 h-2 w-full overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={match.score.totalOvers * 6}
          aria-valuenow={ballsBowled}
          aria-label="Overs bowled"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="sr-only" aria-live="polite">
          {match.battingTeam.short} {match.score.runs} for {match.score.wickets} after{" "}
          {match.score.overs} overs
        </p>
      </div>

      <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
        <div className="px-6 py-5">
          <table className="w-full text-sm">
            <caption className="sr-only">Batting card</caption>
            <colgroup>
              <col />
              <col className="w-14" />
              <col className="w-12" />
              <col className="w-14" />
            </colgroup>
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <th scope="col" className="pb-2 text-left font-medium">
                  Batter
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  R
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  B
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  SR
                </th>
              </tr>
            </thead>
            <tbody>
              {match.batters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-1.5 text-muted-foreground">
                    No active batters
                  </td>
                </tr>
              ) : (
                match.batters.map((batter, index) => (
                  <tr key={`${batter.name}-${index}`}>
                    <th
                      scope="row"
                      className="max-w-[180px] truncate py-1.5 text-left text-[15px] font-semibold"
                    >
                      {batter.name}
                      {batter.onStrike ? (
                        <>
                          <span
                            className="ml-1 inline-block h-1.5 w-1.5 -translate-y-1 rounded-full bg-primary align-middle"
                            aria-hidden="true"
                          />
                          <span className="sr-only"> (on strike)</span>
                        </>
                      ) : null}
                    </th>
                    <td className="py-1.5 text-right text-sm font-semibold tabular-nums">
                      {batter.runs}
                    </td>
                    <td className="py-1.5 text-right text-sm tabular-nums text-muted-foreground">
                      {batter.balls}
                    </td>
                    <td className="py-1.5 text-right text-sm tabular-nums text-muted-foreground">
                      {batter.balls === 0 ? "–" : ((batter.runs / batter.balls) * 100).toFixed(1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">Bowler</caption>
            <colgroup>
              <col />
              <col className="w-14" />
              <col className="w-12" />
              <col className="w-14" />
            </colgroup>
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <th scope="col" className="pb-2 text-left font-medium">
                  Bowler
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  O
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  R-W
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Econ
                </th>
              </tr>
            </thead>
            <tbody>
              {match.bowler ? (
                <tr>
                  <th
                    scope="row"
                    className="max-w-[180px] truncate py-1.5 text-left text-[15px] font-semibold"
                  >
                    {match.bowler.name}
                  </th>
                  <td className="py-1.5 text-right text-sm tabular-nums text-muted-foreground">
                    {match.bowler.overs}
                  </td>
                  <td className="py-1.5 text-right text-sm font-semibold tabular-nums">
                    {match.bowler.runsConceded}-{match.bowler.wickets}
                  </td>
                  <td className="py-1.5 text-right text-sm tabular-nums text-muted-foreground">
                    {economy}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} className="py-1.5 text-muted-foreground">
                    No active bowler
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t px-6 py-5 md:border-l md:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              This over <span className="text-foreground/60">· {overNumber}</span>
            </p>
            <p className="text-[13px] text-muted-foreground">{runsThisOver} runs</p>
          </div>

          {match.currentOverBalls.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              {ballsBowled > 0 ? "Bowler is getting ready…" : "New over"}
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-5" aria-label="Balls in the current over">
              {match.currentOverBalls.map((ball, index) => {
                const isLatest = index === match.currentOverBalls.length - 1;
                return (
                  <span
                    key={`${index}-${ball}`}
                    className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] font-semibold ${
                      isLatest
                        ? "border-2 border-primary bg-white text-primary"
                        : BALL_STYLES[ball]
                    }`}
                  >
                    {ball}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function LiveScorecard({ initialMatch }: { initialMatch: MatchScore | null }) {
  const { match, status } = useLiveMatch(initialMatch);

  if (!match) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <Radio className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-medium">No live match right now</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Seed the demo match with <code className="rounded bg-muted px-1 py-0.5">npm run db:seed</code>{" "}
          and start the simulator to see ball-by-ball updates arrive over WebSocket.
        </p>
        {status === "reconnecting" ? (
          <p className="mt-1 text-[11px] text-warning">Reconnecting to the live feed…</p>
        ) : null}
      </Card>
    );
  }

  return <Scorecard match={match} status={status} />;
}

export function LiveScorecardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-32" />
      </div>
    </Card>
  );
}
