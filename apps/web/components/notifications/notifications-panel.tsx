"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "date-fns";
import { BellOff, Bell, CheckCheck, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import type { NotificationDto } from "@ipl/shared";
import { useNotificationStream } from "@/hooks/use-notification-stream";
import { ApiClientError, api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamBadge } from "@/components/teams/team-badge";

interface NotificationsResponse {
  items: NotificationDto[];
  nextCursor: string | null;
  unreadCount: number;
}

const PAGE_SIZE = 20;

function NotificationCard({ item, onMarkRead }: { item: NotificationDto; onMarkRead: (id: string) => void }) {
  return (
    <article
      onClick={item.read ? undefined : () => onMarkRead(item.id)}
      className={`group rounded-lg border p-3 transition-colors ${
        item.read ? "bg-card" : "border-primary/20 bg-primary/[0.035]"
      } ${item.read ? "" : "cursor-pointer"}`}
    >
      <div className="flex items-start gap-2.5">
        <TeamBadge short={item.teamShort} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="text-xs font-semibold leading-snug">{item.title}</p>
            <UnreadDot read={item.read} />
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.message}</p>
        </div>
      </div>

      <ul className="mt-2 space-y-1 border-t pt-2">
        {item.changes.map((change) => (
          <li key={change.field} className="flex items-baseline justify-between gap-3 text-[11px]">
            <span className="text-muted-foreground">{change.label}</span>
            <span className="truncate text-right font-medium">
              {change.oldValue !== null ? (
                <span className="text-muted-foreground line-through">{String(change.oldValue)} </span>
              ) : null}
              {change.newValue === null ? "Removed" : String(change.newValue)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="truncate">{item.teamName}</span>
        <time dateTime={item.createdAt}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </time>
      </div>
    </article>
  );
}

function UnreadDot({ read }: { read: boolean }) {
  if (read) return null;
  return <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />;
}

export function NotificationsPanel({
  initialItems,
  initialUnreadCount,
  initialNextCursor,
}: {
  initialItems: NotificationDto[];
  initialUnreadCount: number;
  initialNextCursor: string | null;
}) {
  const [items, setItems] = useState<NotificationDto[]>(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [triggerHost, setTriggerHost] = useState<HTMLElement | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const refetch = useCallback(async () => {
    try {
      const data = await api.get<NotificationsResponse>(`/api/notifications?limit=${PAGE_SIZE}`);
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setNextCursor(data.nextCursor);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Could not refresh notifications");
    }
  }, []);

  const onNotification = useCallback((notification: NotificationDto) => {
    setItems((previous) => {
      if (previous.some((item) => item.id === notification.id)) return previous;
      return [notification, ...previous].slice(0, 200);
    });
    setUnreadCount((count) => count + 1);
  }, []);

  const streamStatus = useNotificationStream({
    enabled: true,
    onNotification,
    onReconnect: refetch,
  });

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("ipl-notifications");
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<string>) => {
      if (event.data !== "read-all") return;
      setItems((previous) =>
        previous.map((item) => (item.read ? item : { ...item, read: true })),
      );
      setUnreadCount(0);
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- header portal host exists after mount
    setTriggerHost(document.getElementById("notifications-trigger"));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const markAllRead = async () => {
    setMarkingAll(true);
    setError(null);
    try {
      await api.patch("/api/notifications/read-all");
      setItems((previous) =>
        previous.map((item) =>
          item.read ? item : { ...item, read: true, readAt: new Date().toISOString() },
        ),
      );
      setUnreadCount(0);
      channelRef.current?.postMessage("read-all");
      toast.success("All notifications marked as read");
    } catch (cause) {
      const message = cause instanceof ApiClientError ? cause.message : "Could not mark notifications read";
      setError(message);
      toast.error(message);
    } finally {
      setMarkingAll(false);
    }
  };

  const markRead = async (id: string) => {
    setError(null);
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setItems((previous) =>
        previous.map((item) => (item.id === id ? { ...item, read: true, readAt: new Date().toISOString() } : item)),
      );
      setUnreadCount((count) => Math.max(0, count - (items.find((item) => item.id === id)?.read ? 0 : 1)));
    } catch (cause) {
      const message = cause instanceof ApiClientError ? cause.message : "Could not mark notification read";
      setError(message);
      toast.error(message);
    }
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await api.get<NotificationsResponse>(
        `/api/notifications?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`,
      );
      setItems((previous) => {
        const known = new Set(previous.map((item) => item.id));
        return [...previous, ...data.items.filter((item) => !known.has(item.id))];
      });
      setNextCursor(data.nextCursor);
      setUnreadCount(data.unreadCount);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Could not load older notifications");
    } finally {
      setLoadingMore(false);
    }
  };

  const visible = filter === "unread" ? items.filter((item) => !item.read) : items;

  const trigger = (
    <Button
      ref={triggerRef}
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      aria-controls="notifications-panel"
      aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold tabular-nums text-primary-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Button>
  );

  return (
    <>
      {triggerHost ? createPortal(trigger, triggerHost) : null}

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <Card
        id="notifications-panel"
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-labelledby="notifications-heading"
        className={cn(
          "flex-col",
          open
            ? "fixed left-4 right-4 top-16 z-50 flex max-h-[calc(100vh-5rem)] sm:left-auto sm:w-[380px]"
            : "hidden",
          "lg:sticky lg:top-20 lg:z-auto lg:flex lg:max-h-[calc(100vh-6.5rem)] lg:inset-x-auto lg:w-auto",
        )}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="notifications-heading" className="text-sm font-semibold">
            Notifications
          </h2>
          {unreadCount > 0 ? (
            <Badge className="px-1.5 py-0 text-[10px] tabular-nums">{unreadCount} new</Badge>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-[11px]"
            onClick={markAllRead}
            disabled={unreadCount === 0 || markingAll}
            aria-label="Mark all notifications as read"
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Mark all read</span>
          </Button>
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as "all" | "unread")}>
          <TabsList aria-label="Notification filters">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground" aria-live="polite">
          {streamStatus === "live" ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live" />
              Live
            </>
          ) : streamStatus === "reconnecting" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              Reconnecting…
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              Connecting…
            </>
          )}
        </span>
      </div>

      <div className="scrollbar-thin mt-3 flex-1 space-y-2 overflow-y-auto px-3 pb-3" aria-live="polite">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
            <BellOff className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium">
              {filter === "unread" ? "You're all caught up" : "No notifications yet"}
            </p>
            <p className="max-w-[240px] text-[11px] text-muted-foreground">
              {filter === "unread"
                ? "New team updates will appear here as they arrive."
                : "Follow a team, then change one of its fields to see a live notification."}
            </p>
          </div>
        ) : (
          visible.map((item) => <NotificationCard key={item.id} item={item} onMarkRead={markRead} />)
        )}

        {error ? (
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-2.5">
            <p className="text-[11px] text-destructive">{error}</p>
            <Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-[11px]" onClick={refetch}>
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        ) : null}

        {nextCursor && filter === "all" ? (
          <Button variant="outline" size="sm" className="w-full" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Load older
          </Button>
        ) : null}

        {loadingMore ? <p className="px-2 text-[11px] text-muted-foreground">Loading older…</p> : null}
      </div>
      </Card>
    </>
  );
}
