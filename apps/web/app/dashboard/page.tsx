import { redirect } from "next/navigation";
import { DashboardBody } from "@/components/dashboard/dashboard-body";
import { SiteHeader } from "@/components/layout/site-header";
import { getSessionUser } from "@/lib/auth";
import { getLiveMatch, listNotifications, listSubscriptions, listTeams } from "@/lib/queries";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [teams, subscriptions, notifications, match] = await Promise.all([
    listTeams(),
    listSubscriptions(user.id),
    listNotifications({ userId: user.id, limit: 20 }),
    getLiveMatch(),
  ]);

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-[1440px] px-4 py-7 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {subscriptions.length} of {teams.length} teams followed
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting()}, {user.username}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your teams, the live score and every update — all in one place.
          </p>
        </div>

        <DashboardBody
          teams={teams}
          initialSubscriptions={subscriptions}
          initialNotifications={notifications.items}
          initialUnreadCount={notifications.unreadCount}
          initialNextCursor={notifications.nextCursor}
          initialMatch={match}
        />
      </main>
    </div>
  );
}
