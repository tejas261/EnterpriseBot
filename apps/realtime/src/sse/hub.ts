import type { ServerResponse } from "node:http";
import { SSE_SCHEMA_VERSION, type NotificationDto } from "@ipl/shared";
import { log } from "../utils/logger";

const MAX_BUFFERED_BYTES = 1_000_000;

/**
 * In-memory SSE connection registry for a single realtime instance.
 * Multiple tabs per user are supported. Slow clients are skipped instead of buffered forever.
 */
export class SseHub {
  private clients = new Map<string, Set<ServerResponse>>();

  add(userId: string, response: ServerResponse): () => void {
    const set = this.clients.get(userId) ?? new Set<ServerResponse>();
    set.add(response);
    this.clients.set(userId, set);
    return () => {
      const current = this.clients.get(userId);
      if (!current) return;
      current.delete(response);
      if (current.size === 0) this.clients.delete(userId);
    };
  }

  publish(userId: string, notification: NotificationDto): number {
    const connections = this.clients.get(userId);
    if (!connections) return 0;
    const payload = `event: notification\nid: ${notification.id}\ndata: ${JSON.stringify({
      schemaVersion: SSE_SCHEMA_VERSION,
      notification,
    })}\n\n`;
    let delivered = 0;
    for (const response of connections) {
      if (response.writableEnded || response.destroyed) continue;
      if (response.writableLength > MAX_BUFFERED_BYTES) {
        log("warn", "sse.slowClient", { userId, buffered: response.writableLength });
        continue;
      }
      response.write(payload);
      delivered += 1;
    }
    return delivered;
  }

  heartbeat(): void {
    for (const connections of this.clients.values()) {
      for (const response of connections) {
        if (!response.writableEnded && !response.destroyed) response.write(": heartbeat\n\n");
      }
    }
  }

  closeAll(): void {
    for (const connections of this.clients.values()) {
      for (const response of connections) response.end();
    }
    this.clients.clear();
  }

  count(): number {
    let total = 0;
    for (const connections of this.clients.values()) total += connections.size;
    return total;
  }
}
