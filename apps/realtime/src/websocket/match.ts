import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { ScoreUpdateMessage } from "@ipl/shared";
import { userFromCookieHeader } from "../auth";
import { log } from "../utils/logger";

const WS_PATH = "/ws/match";
const HEARTBEAT_MS = 30000;

type Socket = WebSocket & { isAlive?: boolean };

export interface MatchWebSocket {
  broadcast: (message: ScoreUpdateMessage) => void;
  count: () => number;
  close: () => void;
}

/**
 * Authenticated score WebSocket. The HttpOnly session cookie is sent by the browser on the
 * upgrade request; query-string tokens and client-supplied user ids are never trusted.
 */
export function createMatchWebSocket(
  server: Server,
  getSnapshot: () => Promise<ScoreUpdateMessage | null>,
): MatchWebSocket {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname !== WS_PATH) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }
    const user = userFromCookieHeader(request.headers.cookie);
    if (!user) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
  });

  wss.on("connection", (socket: Socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });
    void getSnapshot()
      .then((snapshot) => {
        if (snapshot && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(snapshot));
      })
      .catch((error: unknown) => {
        log("error", "ws.snapshotFailed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients as Set<Socket>) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return {
    broadcast(message: ScoreUpdateMessage) {
      const payload = JSON.stringify(message);
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
      }
    },
    count: () => wss.clients.size,
    close() {
      clearInterval(heartbeat);
      // 1001 = going away
      for (const client of wss.clients) client.close(1001, "server shutting down");
      wss.close();
    },
  };
}
