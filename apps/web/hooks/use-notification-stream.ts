"use client";

import { useEffect, useRef, useState } from "react";
import { notificationEventSchema, type NotificationDto } from "@ipl/shared";
import { notificationsStreamUrl } from "@/lib/websocket-client";

export type StreamStatus = "connecting" | "live" | "reconnecting";

/**
 * Authenticated SSE subscription. Cookies are sent with the EventSource request; the server
 * derives the user from the session cookie. One EventSource per mounted hook instance.
 */
export function useNotificationStream(params: {
  enabled: boolean;
  onNotification: (notification: NotificationDto) => void;
  onReconnect?: () => void;
}) {
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const notificationRef = useRef(params.onNotification);
  const reconnectRef = useRef(params.onReconnect);

  useEffect(() => {
    notificationRef.current = params.onNotification;
    reconnectRef.current = params.onReconnect;
  }, [params.onNotification, params.onReconnect]);

  useEffect(() => {
    if (!params.enabled) return;

    let closed = false;
    let hadConnection = false;
    let attempt = 0;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      source = new EventSource(notificationsStreamUrl(), { withCredentials: true });

      source.addEventListener("connected", () => {
        attempt = 0;
        setStatus("live");
        if (hadConnection) reconnectRef.current?.();
        hadConnection = true;
      });

      source.addEventListener("notification", (event) => {
        try {
          const parsed = notificationEventSchema.safeParse(JSON.parse((event as MessageEvent<string>).data));
          if (parsed.success) notificationRef.current(parsed.data.notification);
        } catch {
          // Ignore malformed frames; persisted history will reconcile the client.
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) return;
        setStatus("reconnecting");
        attempt += 1;
        const delay = Math.min(15000, 500 * 2 ** Math.min(attempt, 5)) + Math.random() * 250;
        timer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      source?.close();
    };
  }, [params.enabled]);

  return status;
}
