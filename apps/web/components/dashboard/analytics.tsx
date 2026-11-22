"use client";

import dynamic from "next/dynamic";
import type { TeamRecord } from "@ipl/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TitlesChart = dynamic(() => import("@/components/charts/titles-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[240px] w-full" />,
});

const SeasonChart = dynamic(() => import("@/components/charts/season-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[320px] w-full" />,
});

export function Analytics({ teams, followed }: { teams: TeamRecord[]; followed: string[] }) {
  const season = teams[0]?.season ?? "2025";

  return (
    <section aria-labelledby="analytics-heading" className="space-y-3">
      <div>
        <h2 id="analytics-heading" className="text-lg font-semibold tracking-tight">
          League at a glance
        </h2>
        <p className="text-xs text-muted-foreground">
          IPL {season} · title counts are historical, standings are sample seed data
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">IPL titles</CardTitle>
            <CardDescription className="text-xs">
              Championships per franchise, all-time through IPL {season}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TitlesChart teams={teams} followed={followed} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Season record</CardTitle>
            <CardDescription className="text-xs">
              Wins and losses for the seeded IPL {season} standings. Hover or focus a row for points.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeasonChart teams={teams} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
