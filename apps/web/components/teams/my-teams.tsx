"use client";

import { Loader2, UserMinus } from "lucide-react";
import type { NotifiableField, SubscriptionDto, TeamRecord } from "@ipl/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldSelector } from "@/components/teams/field-selector";
import { TeamBadge } from "@/components/teams/team-badge";

export function MyTeams({
  teams,
  subscriptions,
  pending,
  fieldSaving,
  onUnfollow,
  onFieldsChange,
}: {
  teams: TeamRecord[];
  subscriptions: SubscriptionDto[];
  pending: Set<string>;
  fieldSaving: Set<string>;
  onUnfollow: (teamShort: string) => void;
  onFieldsChange: (teamShort: string, fields: NotifiableField[]) => void;
}) {
  const teamsByShort = new Map(teams.map((team) => [team.short, team]));
  const followed = subscriptions
    .map((subscription) => ({ subscription, team: teamsByShort.get(subscription.teamShort) }))
    .filter((entry): entry is { subscription: SubscriptionDto; team: TeamRecord } => Boolean(entry.team));

  return (
    <section aria-labelledby="my-teams-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="my-teams-heading" className="text-lg font-semibold tracking-tight">
            My teams
          </h2>
          <p className="text-xs text-muted-foreground">
            {followed.length} of {teams.length} subscribed
          </p>
        </div>
        {followed.length === 0 ? (
          <a href="#discover" className="text-xs font-medium text-primary hover:underline">
            Browse teams
          </a>
        ) : null}
      </div>

      {followed.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-1.5 p-8 text-center">
          <p className="text-sm font-medium">You are not following any team yet</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Follow a franchise from Discover teams to get grouped notifications for the fields you
            pick.
          </p>
        </Card>
      ) : (
        <div className="card-grid grid gap-4">
          {followed.map(({ team, subscription }) => {
            const isPending = pending.has(team.short);
            return (
              <Card key={team.short} className="flex flex-col gap-3.5 p-4">
                <div className="flex items-start gap-3">
                  <TeamBadge short={team.short} size="md" logoUrl={team.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{team.name}</p>
                    <p className="text-[11px] text-muted-foreground">IPL {team.season}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUnfollow(team.short)}
                    disabled={isPending}
                    aria-label={`Unfollow ${team.name}`}
                    className="h-7 shrink-0 px-2 text-muted-foreground hover:text-destructive"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserMinus className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden xl:inline">Unfollow</span>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-md border bg-background/60 py-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Titles</p>
                    <p className="text-sm font-semibold tabular-nums">{team.titles}</p>
                  </div>
                  <div className="border-x">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">W–L</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {team.wins}–{team.losses}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Points</p>
                    <p className="text-sm font-semibold tabular-nums">{team.points}</p>
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

                <div className="border-t pt-3">
                  <FieldSelector
                    fields={subscription.fields}
                    onChange={(fields) => onFieldsChange(team.short, fields)}
                    disabled={isPending}
                    saving={fieldSaving.has(team.short)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
