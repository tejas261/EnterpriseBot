import { env } from "./config/env";
import { closeDb, connectDb } from "./db";
import { createRealtimeServer } from "./http/server";
import { SseHub } from "./sse/hub";
import { createMatchStream, fetchLiveMatch, toScoreMessage } from "./streams/match-stream";
import { createTeamStream } from "./streams/team-stream";
import { createMatchWebSocket, type MatchWebSocket } from "./websocket/match";
import { log } from "./utils/logger";

async function main(): Promise<void> {
  const db = await connectDb();
  await db.command({ ping: 1 });
  log("info", "db.connected", { database: env.MONGODB_DB });

  const hub = new SseHub();
  let ws!: MatchWebSocket;
  const teamStream = await createTeamStream(db, (userId, notification) => {
    const delivered = hub.publish(userId, notification);
    log("info", "notification.published", {
      notificationId: notification.id,
      userId,
      connections: delivered,
    });
  });
  const matchStream = await createMatchStream(db, (message) => ws.broadcast(message));

  const server = createRealtimeServer({
    hub,
    status: { teamStream, matchStream, wsClients: () => ws.count() },
  });

  ws = createMatchWebSocket(server, async () => {
    const match = await fetchLiveMatch(db);
    return match ? toScoreMessage(match) : null;
  });

  const heartbeat = setInterval(() => hub.heartbeat(), env.HEARTBEAT_MS);
  heartbeat.unref();

  await teamStream.start();
  await matchStream.start();

  server.listen(env.REALTIME_PORT, () => {
    log("info", "server.listening", {
      port: env.REALTIME_PORT,
      webOrigin: env.WEB_ORIGIN,
      sse: "/api/realtime/notifications",
      ws: "/ws/match",
    });
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    log("info", "shutdown.start", { signal });
    clearInterval(heartbeat);
    server.close();
    hub.closeAll();
    ws.close();
    await Promise.all([teamStream.stop(), matchStream.stop()]);
    await closeDb();
    log("info", "shutdown.complete", { signal });
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    log("error", "process.unhandledRejection", {
      error: reason instanceof Error ? reason.message : String(reason),
    });
  });
}

main().catch((error: unknown) => {
  log("error", "startup.failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
