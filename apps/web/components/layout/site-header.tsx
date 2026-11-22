"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Pause, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { DEMO_MATCH_ID, type AuthUser } from "@ipl/shared";
import { api, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function MatchRunToggle({ matchId }: { matchId: string }) {
  const [running, setRunning] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { simulation } = await api.get<{ simulation: { running: boolean } }>(
        `/api/matches/${matchId}/simulation`,
      );
      setRunning(simulation.running);
    } catch {
      setRunning(null);
    }
  }, [matchId]);

  useEffect(() => {
    // Initial runner state for the header toggle.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    void refresh();
  }, [refresh]);

  const toggle = async () => {
    if (running === null || pending) return;
    setPending(true);
    try {
      const { simulation } = await api.post<{ simulation: { running: boolean } }>(
        `/api/matches/${matchId}/simulation`,
        { running: !running },
      );
      setRunning(simulation.running);
      toast(simulation.running ? "Match simulation running" : "Match simulation paused");
    } catch (cause) {
      toast.error(cause instanceof ApiClientError ? cause.message : "Could not update simulation");
    } finally {
      setPending(false);
    }
  };

  const active = running === true;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void toggle()}
      disabled={pending || running === null}
      aria-label="Toggle match simulation"
      aria-pressed={active}
    >
      {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      <span className="hidden sm:inline">{active ? "Running" : "Paused"}</span>
    </Button>
  );
}

export function SiteHeader({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const logout = async () => {
    setPending(true);
    try {
      await api.post("/api/auth/logout");
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="IPL Live dashboard">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            IL
          </span>
          <span className="text-sm font-semibold tracking-wide">IPL Live</span>
        </Link>

        <span className="hidden items-center gap-1.5 rounded-full border border-live/25 bg-live/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-live sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live" />
          Streaming
        </span>

        <div className="ml-auto flex items-center gap-2">
          {user.role === "admin" ? <MatchRunToggle matchId={DEMO_MATCH_ID} /> : null}
          {user.role === "admin" ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          ) : null}
          <div className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase text-primary">
              {user.username.slice(0, 1)}
            </span>
            <span className="max-w-[120px] truncate text-xs font-medium">{user.username}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            disabled={pending}
            aria-label="Log out"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
