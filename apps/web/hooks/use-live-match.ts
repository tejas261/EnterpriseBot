"use client";

import { useEffect, useState } from "react";
import { scoreUpdateMessageSchema, type MatchScore } from "@ipl/shared";
import { matchSocketUrl } from "@/lib/websocket-client";

export type MatchConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

/**
 * Live scorecard transport. Connects once per mounted hook, applies the server snapshot, then
 * applies pushed updates. Reconnects with exponential backoff and jitter; never polls.
 */
export function useLiveMatch(initialMatch: MatchScore | null) {
  const [match, setMatch] = useState<MatchScore | null>(initialMatch);
  const [status, setStatus] = useState<MatchConnectionStatus>("connecting");

  useEffect(() => {
    let closed = false;
    let attempt = 0;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      socket = new WebSocket(matchSocketUrl());

      socket.onopen = () => {
        attempt = 0;
        setStatus("live");
      };

      socket.onmessage = (event) => {
        try {
          const parsed = scoreUpdateMessageSchema.safeParse(JSON.parse(String(event.data)));
          if (parsed.success) setMatch(parsed.data.data);
        } catch {
          // Ignore malformed frames.
        }
      };

      socket.onclose = () => {
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
      socket?.close();
    };
  }, []);

  return { match, status };
}
