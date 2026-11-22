"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type {
  MatchScore,
  NotifiableField,
  NotificationDto,
  SubscriptionDto,
  TeamRecord,
} from "@ipl/shared";
import { ApiClientError, api } from "@/lib/api-client";
import { Analytics } from "@/components/dashboard/analytics";
import { LiveScorecard } from "@/components/dashboard/live-scorecard";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { DiscoverTeams } from "@/components/teams/discover-teams";
import { MyTeams } from "@/components/teams/my-teams";

function toggleInSet(source: Set<string>, value: string, active: boolean): Set<string> {
  const next = new Set(source);
  if (active) next.add(value);
  else next.delete(value);
  return next;
}

function errorMessage(cause: unknown): string {
  return cause instanceof ApiClientError ? cause.message : "Something went wrong. Try again.";
}

export function DashboardBody({
  teams,
  initialSubscriptions,
  initialNotifications,
  initialUnreadCount,
  initialNextCursor,
  initialMatch,
}: {
  teams: TeamRecord[];
  initialSubscriptions: SubscriptionDto[];
  initialNotifications: NotificationDto[];
  initialUnreadCount: number;
  initialNextCursor: string | null;
  initialMatch: MatchScore | null;
}) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionDto[]>(initialSubscriptions);
  const [pendingTeams, setPendingTeams] = useState<Set<string>>(new Set());
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

  const follow = useCallback(async (teamShort: string) => {
    setPendingTeams((current) => toggleInSet(current, teamShort, true));
    try {
      const { subscription } = await api.post<{ subscription: SubscriptionDto }>("/api/subscriptions", {
        teamShort,
      });
      setSubscriptions((current) => [
        ...current.filter((item) => item.teamShort !== teamShort),
        subscription,
      ]);
      toast.success(`Following ${teamShort}`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setPendingTeams((current) => toggleInSet(current, teamShort, false));
    }
  }, []);

  const unfollow = useCallback(async (teamShort: string) => {
    setPendingTeams((current) => toggleInSet(current, teamShort, true));
    try {
      await api.delete(`/api/subscriptions/${teamShort}`);
      setSubscriptions((current) => current.filter((item) => item.teamShort !== teamShort));
      toast.success(`Unfollowed ${teamShort}`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setPendingTeams((current) => toggleInSet(current, teamShort, false));
    }
  }, []);

  const updateFields = useCallback(
    async (teamShort: string, fields: NotifiableField[]) => {
      const previous = subscriptions.find((item) => item.teamShort === teamShort)?.fields ?? [];
      setSubscriptions((current) =>
        current.map((item) => (item.teamShort === teamShort ? { ...item, fields } : item)),
      );
      setSavingFields((current) => toggleInSet(current, teamShort, true));
      try {
        const { subscription } = await api.patch<{ subscription: SubscriptionDto }>(
          `/api/subscriptions/${teamShort}`,
          { fields },
        );
        setSubscriptions((current) =>
          current.map((item) => (item.teamShort === teamShort ? subscription : item)),
        );
      } catch (cause) {
        setSubscriptions((current) =>
          current.map((item) => (item.teamShort === teamShort ? { ...item, fields: previous } : item)),
        );
        toast.error(errorMessage(cause));
      } finally {
        setSavingFields((current) => toggleInSet(current, teamShort, false));
      }
    },
    [subscriptions],
  );

  const followedShorts = subscriptions.map((subscription) => subscription.teamShort);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-7">
        <section aria-label="Live match scorecard">
          <LiveScorecard
            initialMatch={initialMatch}
            logoUrl={
              initialMatch
                ? teams.find((team) => team.short === initialMatch.battingTeam.short)?.logoUrl
                : undefined
            }
          />
        </section>

        <MyTeams
          teams={teams}
          subscriptions={subscriptions}
          pending={pendingTeams}
          fieldSaving={savingFields}
          onUnfollow={unfollow}
          onFieldsChange={updateFields}
        />

        <Analytics teams={teams} followed={followedShorts} />

        <DiscoverTeams
          teams={teams}
          followed={new Set(followedShorts)}
          pending={pendingTeams}
          onFollow={follow}
        />
      </div>

      <aside className="min-w-0" aria-label="Notifications">
        <NotificationsPanel
          initialItems={initialNotifications}
          initialUnreadCount={initialUnreadCount}
          initialNextCursor={initialNextCursor}
        />
      </aside>
    </div>
  );
}
