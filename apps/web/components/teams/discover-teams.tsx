"use client";

import { Check, Loader2, Plus } from "lucide-react";
import type { TeamRecord } from "@ipl/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TeamBadge } from "@/components/teams/team-badge";

export function DiscoverTeams({
  teams,
  followed,
  pending,
  onFollow,
}: {
  teams: TeamRecord[];
  followed: Set<string>;
  pending: Set<string>;
  onFollow: (teamShort: string) => void;
}) {
  const available = teams.filter((team) => !followed.has(team.short)).length;

  return (
    <section id="discover" aria-labelledby="discover-heading" className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="discover-heading" className="text-lg font-semibold tracking-tight">
            Discover teams
          </h2>
          <p className="text-xs text-muted-foreground">
            All ten franchises · {available} still available to follow
          </p>
        </div>
      </div>

      <div className="card-grid grid gap-4">
        {teams.map((team) => {
          const isFollowed = followed.has(team.short);
          const isPending = pending.has(team.short);
          return (
            <Card key={team.short} className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <TeamBadge short={team.short} size="md" logoUrl={team.logoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">{team.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {team.titles} {team.titles === 1 ? "title" : "titles"} · {team.points} pts
                  </p>
                </div>
              </div>

              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Captain</dt>
                  <dd className="truncate text-right font-medium">{team.captain}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Head coach</dt>
                  <dd className="truncate text-right font-medium">{team.headCoach}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">Home ground</dt>
                  <dd className="truncate text-right font-medium">{team.homeGround}</dd>
                </div>
              </dl>

              <Button
                variant={isFollowed ? "secondary" : "outline"}
                size="sm"
                className="mt-auto w-full"
                disabled={isFollowed || isPending}
                onClick={() => onFollow(team.short)}
                aria-label={isFollowed ? `Following ${team.name}` : `Follow ${team.name}`}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isFollowed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {isFollowed ? "Following" : "Follow"}
              </Button>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
