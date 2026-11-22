import { createServer, type Server, type ServerResponse } from "node:http";
import { SSE_SCHEMA_VERSION } from "@ipl/shared";
import { env } from "../config/env";
import { userFromCookieHeader } from "../auth";
import { pingDb } from "../db";
import type { SseHub } from "../sse/hub";
import type { ChangeStreamRunner, StreamState } from "../streams/change-stream";
import { log } from "../utils/logger";

export interface RealtimeStatus {
  teamStream: ChangeStreamRunner;
  matchStream: ChangeStreamRunner;
  wsClients: () => number;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.WEB_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Last-Event-ID",
    Vary: "Origin",
  };
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(),
  });
  response.end(JSON.stringify(body));
}

const OPEN_STATES: StreamState[] = ["OPEN", "RECONNECTING", "STARTING"];

export function createRealtimeServer(params: {
  hub: SseHub;
  status: RealtimeStatus;
}): Server {
  const { hub, status } = params;

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders());
      response.end();
      return;
    }

    if (url.pathname === "/health") {
      json(response, 200, {
        status: "ok",
        service: "ipl-live-realtime",
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (url.pathname === "/ready") {
      const mongo = await pingDb();
      const streams = {
        teams: status.teamStream.health(),
        matches: status.matchStream.health(),
      };
      const streamsReady = OPEN_STATES.includes(streams.teams.state) && OPEN_STATES.includes(streams.matches.state);
      json(response, mongo && streamsReady ? 200 : 503, {
        status: mongo && streamsReady ? "ready" : "degraded",
        mongo: mongo ? "connected" : "disconnected",
        streams,
        sseClients: hub.count(),
        wsClients: status.wsClients(),
      });
      return;
    }

    if (url.pathname === "/api/realtime/notifications") {
      if (request.method !== "GET") {
        json(response, 405, { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use GET" } });
        return;
      }
      const user = userFromCookieHeader(request.headers.cookie);
      if (!user) {
        json(response, 401, {
          success: false,
          error: { code: "UNAUTHORIZED", message: "A valid session is required" },
        });
        return;
      }

      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        ...corsHeaders(),
      });
      response.write("retry: 3000\n\n");
      response.write(
        `event: connected\ndata: ${JSON.stringify({
          schemaVersion: SSE_SCHEMA_VERSION,
          connectedAt: new Date().toISOString(),
        })}\n\n`,
      );
      const remove = hub.add(user.id, response);
      log("info", "sse.connected", { userId: user.id, connections: hub.count() });

      let closed = false;
      const cleanup = () => {
        if (closed) return;
        closed = true;
        remove();
        log("info", "sse.disconnected", { userId: user.id, connections: hub.count() });
      };
      request.on("close", cleanup);
      response.on("close", cleanup);
      return;
    }

    json(response, 404, {
      success: false,
      error: { code: "NOT_FOUND", message: "Unknown realtime endpoint" },
    });
  });
}
