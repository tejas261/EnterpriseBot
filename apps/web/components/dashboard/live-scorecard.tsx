"use client";

import { Radio, WifiOff } from "lucide-react";
import {
  formatRunRate,
  oversToBalls,
  type BallResult,
  type MatchScore,
} from "@ipl/shared";
import { useLiveMatch } from "@/hooks/use-live-match";
import { TeamBadge } from "@/components/teams/team-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const BALL_STYLES: Record<BallResult, string> = {
  "•": "bg-muted text-muted-foreground",
  "1": "bg-secondary text-secondary-foreground",
  "2": "bg-secondary text-secondary-foreground",
  "3": "bg-secondary text-secondary-foreground",
  "4": "bg-primary text-primary-foreground",
  "6": "bg-primary text-primary-foreground",
  W: "bg-destructive text-destructive-foreground",
  wd: "bg-warning/15 text-warning",
};

function ConnectionPill({ status }: { status: ReturnType<typeof useLiveMatch>["status"] }) {
  if (status === "live") {
    return (
      <Badge variant="live">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live" />
        Live
      </Badge>
    );
  }
  if (status === "reconnecting") {
    return (
      <Badge variant="warning">
        <WifiOff className="h-3 w-3" />
        Reconnecting…
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Radio className="h-3 w-3" />
      Connecting…
    </Badge>
  );
}

function Scorecard({
  match,
  status,
  logoUrl,
}: {
  match: MatchScore;
  status: ReturnType<typeof useLiveMatch>["status"];
  logoUrl?: string | null;
}) {
  const ballsBowled = oversToBalls(match.score.overs);
  const progress = Math.min(100, (ballsBowled / (match.score.totalOvers * 6)) * 100);
  const batters = match.batters;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5">
        <ConnectionPill status={status} />
        <span className="ml-auto text-xs text-muted-foreground">{match.venue}</span>
      </div>

      <div className="grid gap-6 p-5 pb-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            <TeamBadge short={match.battingTeam.short} size="lg" logoUrl={logoUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{match.battingTeam.name}</p>
              <p className="text-xs text-muted-foreground">
                Innings {match.innings} · vs {match.bowlingTeam.short}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="text-5xl font-semibold leading-none tracking-tight tabular-nums">
              {match.score.runs}
              <span className="text-muted-foreground">/</span>
              {match.score.wickets}
            </p>
            <div className="pb-1">
              <p className="text-sm font-medium tabular-nums">
                {match.score.overs}
                <span className="text-muted-foreground"> / {match.score.totalOvers} ov</span>
              </p>
              <p className="text-xs text-muted-foreground">
                CRR {formatRunRate(match.score.runs, ballsBowled)}
                {match.innings === 2 && match.target ? ` · Target ${match.target}` : ""}
              </p>
            </div>
          </div>

          <div
            className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
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

          <div className="mt-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              This over
            </p>
            <div className="flex flex-wrap gap-1.5" aria-label="Balls in the current over">
              {match.currentOverBalls.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  {oversToBalls(match.score.overs) > 0 ? "Bowler is getting ready…" : "New over"}
                </span>
              ) : (
                match.currentOverBalls.map((ball, index) => (
                  <span
                    key={`${index}-${ball}`}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${BALL_STYLES[ball]}`}
                  >
                    {ball}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border bg-background/60">
            <table className="w-full text-xs">
              <caption className="sr-only">Batting card</caption>
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Batter
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    R
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    B
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    SR
                  </th>
                </tr>
              </thead>
              <tbody>
                {batters.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-muted-foreground">
                      No active batters
                    </td>
                  </tr>
                ) : (
                  batters.map((batter, index) => (
                    <tr key={`${batter.name}-${index}`} className="border-b last:border-0">
                      <th scope="row" className="max-w-[130px] truncate px-3 py-2 text-left font-medium">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${batter.onStrike ? "bg-live" : "bg-transparent"}`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{batter.name}</span>
                          {batter.onStrike ? <span className="sr-only"> (on strike)</span> : null}
                        </span>
                      </th>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">{batter.runs}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {batter.balls}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {batter.balls === 0 ? "–" : ((batter.runs / batter.balls) * 100).toFixed(1)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border bg-background/60 px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Bowling
            </p>
            {match.bowler ? (
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium">{match.bowler.name}</p>
                <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {match.bowler.overs}–{match.bowler.runsConceded}–{match.bowler.wickets}
                  {match.bowler.overs !== "0.0"
                    ? ` · Econ ${(
                        match.bowler.runsConceded / (oversToBalls(match.bowler.overs) / 6)
                      ).toFixed(2)}`
                    : ""}
                </p>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">No active bowler</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function LiveScorecard({
  initialMatch,
  logoUrl,
}: {
  initialMatch: MatchScore | null;
  logoUrl?: string | null;
}) {
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

  return <Scorecard match={match} status={status} logoUrl={logoUrl} />;
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
