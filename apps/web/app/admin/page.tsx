import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { TeamEditor } from "@/components/admin/team-editor";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { listTeams } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen">
        <SiteHeader user={user} />
        <main className="mx-auto max-w-2xl px-4 py-16">
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <h1 className="text-lg font-semibold">Admin access required</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your account does not have permission to update team documents. Ask an administrator
              for access or create an admin with <code className="rounded bg-muted px-1">npm run db:create-admin</code>.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const teams = await listTeams();

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Team data</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Changes made here and changes made directly in MongoDB take the same path.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>

        <TeamEditor teams={teams} />

        <div className="mt-5 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Direct database updates work too</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-panel p-3 text-[11px] leading-5 text-white/80">
{`mongosh "mongodb://localhost:27017/ipl_live?replicaSet=rs0" \\
  --eval 'db.teams.updateOne({short:"RCB"},{$set:{captain:"New Captain",points:16}})'`}
          </pre>
          <p className="mt-2">
            The Change Stream turns that single write into one grouped notification per eligible
            subscriber.
          </p>
        </div>
      </main>
    </div>
  );
}
