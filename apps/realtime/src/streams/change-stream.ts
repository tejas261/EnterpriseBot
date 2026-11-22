import type { ChangeStream, Db, ObjectId } from "mongodb";
import { log } from "../utils/logger";

export type StreamState = "STARTING" | "OPEN" | "RECONNECTING" | "GAP_DETECTED" | "CLOSED";

/** The subset of a change event this service relies on. */
export interface WatchedEvent {
  _id: unknown;
  operationType: string;
  documentKey?: { _id: ObjectId };
  fullDocument?: unknown;
  fullDocumentBeforeChange?: unknown;
  updateDescription?: {
    updatedFields?: Record<string, unknown>;
    removedFields?: string[];
    truncatedArrays?: unknown[];
  };
}

interface CheckpointDoc {
  _id: string;
  resumeToken?: unknown;
  updatedAt: Date;
  lastEventAt?: Date;
  gapDetectedAt?: Date;
  note?: string;
}

const HISTORY_LOST_CODE = 286;

function isHistoryLost(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: number }).code;
  const message = String((error as { message?: string }).message ?? "");
  return code === HISTORY_LOST_CODE || /resume|history.*lost|not available/i.test(message);
}

/**
 * Owns one MongoDB Change Stream: resume-token checkpointing, idempotent replay-safe
 * processing, exponential backoff reconnects and an explicit gap signal when history is lost.
 */
export class ChangeStreamRunner {
  state: StreamState = "STARTING";
  lastEventAt: Date | null = null;
  gaps = 0;

  private cursor: ChangeStream | null = null;
  private resumeToken: unknown;
  private stopped = true;
  private startedAt = Date.now();

  constructor(
    private readonly options: {
      name: string;
      db: Db;
      collection: string;
      operationTypes: string[];
      onEvent: (event: WatchedEvent) => Promise<void>;
    },
  ) {}

  private setState(state: StreamState): void {
    this.state = state;
  }

  async start(): Promise<void> {
    const checkpoint = await this.options.db
      .collection<CheckpointDoc>("streamCheckpoints")
      .findOne({ _id: this.options.name });
    this.resumeToken = checkpoint?.resumeToken;
    this.stopped = false;
    this.startedAt = Date.now();
    void this.run();
  }

  private async run(): Promise<void> {
    let attempt = 0;
    while (!this.stopped) {
      try {
        this.setState(attempt === 0 ? "OPEN" : "RECONNECTING");
        const cursor = this.options.db
          .collection(this.options.collection)
          .watch(
            [{ $match: { operationType: { $in: this.options.operationTypes } } }],
            {
              fullDocument: "updateLookup",
              fullDocumentBeforeChange: "whenAvailable",
              maxAwaitTimeMS: 20000,
              ...(this.resumeToken ? { resumeAfter: this.resumeToken } : {}),
            },
          );
        this.cursor = cursor;
        log("info", "changeStream.open", {
          stream: this.options.name,
          resumed: Boolean(this.resumeToken),
          state: this.state,
        });
        attempt = 0;

        for await (const event of cursor) {
          if (this.stopped) break;
          try {
            await this.options.onEvent(event as unknown as WatchedEvent);
            this.lastEventAt = new Date();
            await this.saveCheckpoint(event);
          } catch (error) {
            // Do not advance the checkpoint for an event that failed: it will be replayed.
            log("error", "changeStream.eventFailed", {
              stream: this.options.name,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (!this.stopped) {
          log("warn", "changeStream.ended", { stream: this.options.name });
        }
      } catch (error) {
        if (this.stopped) break;
        if (isHistoryLost(error)) {
          this.gaps += 1;
          this.setState("GAP_DETECTED");
          this.resumeToken = undefined;
          await this.recordGap(
            error instanceof Error ? error.message : "Resume token no longer available",
          );
          log("error", "changeStream.historyLost", {
            stream: this.options.name,
            gaps: this.gaps,
            note: "Restarting from the current position; changes in the gap were not delivered.",
          });
        } else {
          log("warn", "changeStream.error", {
            stream: this.options.name,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        await this.cursor?.close().catch(() => undefined);
        this.cursor = null;
      }

      if (this.stopped) break;
      attempt += 1;
      const backoff = Math.min(15000, 500 * 2 ** Math.min(attempt, 5));
      await new Promise((resolve) => setTimeout(resolve, backoff + Math.random() * 250));
    }
    this.setState("CLOSED");
    log("info", "changeStream.closed", { stream: this.options.name });
  }

  private async saveCheckpoint(event: { _id: unknown }): Promise<void> {
    this.resumeToken = event._id;
    const now = new Date();
    await this.options.db.collection<CheckpointDoc>("streamCheckpoints").updateOne(
      { _id: this.options.name },
      {
        $set: { resumeToken: this.resumeToken, updatedAt: now, lastEventAt: now },
        $unset: { gapDetectedAt: "", note: "" },
      },
      { upsert: true },
    );
  }

  private async recordGap(note: string): Promise<void> {
    const now = new Date();
    await this.options.db.collection<CheckpointDoc>("streamCheckpoints").updateOne(
      { _id: this.options.name },
      {
        $set: { gapDetectedAt: now, updatedAt: now, note },
        $unset: { resumeToken: "" },
      },
      { upsert: true },
    );
  }

  async stop(): Promise<void> {
    this.stopped = true;
    await this.cursor?.close().catch(() => undefined);
    this.cursor = null;
    log("info", "changeStream.stopping", { stream: this.options.name });
  }

  health(): { state: StreamState; lastEventAt: string | null; gaps: number; uptimeSeconds: number } {
    return {
      state: this.state,
      lastEventAt: this.lastEventAt?.toISOString() ?? null,
      gaps: this.gaps,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
    };
  }
}
