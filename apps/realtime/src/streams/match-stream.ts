import type { Db } from "mongodb";
import {
  DEMO_MATCH_ID,
  scoreUpdateMessageSchema,
  toMatchScore,
  type MatchScore,
  type ScoreUpdateMessage,
} from "@ipl/shared";
import { ChangeStreamRunner } from "./change-stream";
import { log } from "../utils/logger";

export function toScoreMessage(match: MatchScore): ScoreUpdateMessage {
  return scoreUpdateMessageSchema.parse({
    type: "MATCH_SCORE_UPDATE",
    schemaVersion: 1,
    matchId: match.matchId,
    occurredAt: match.updatedAt,
    data: match,
  });
}

export async function fetchLiveMatch(db: Db): Promise<MatchScore | null> {
  const matches = db.collection("matches");
  const doc =
    (await matches.findOne({ status: "LIVE" }, { sort: { updatedAt: -1 } })) ??
    (await matches.findOne({ matchId: DEMO_MATCH_ID }));
  if (!doc) return null;
  try {
    return toMatchScore(doc);
  } catch (error) {
    log("error", "match.invalidDocument", {
      matchId: String(doc.matchId),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function createMatchStream(
  db: Db,
  broadcast: (message: ScoreUpdateMessage) => void,
): Promise<ChangeStreamRunner> {
  return new ChangeStreamRunner({
    name: "matches",
    db,
    collection: "matches",
    operationTypes: ["insert", "update", "replace"],
    onEvent: async (event) => {
      if (!event.documentKey) return;
      const doc = await db.collection("matches").findOne({ _id: event.documentKey._id });
      if (!doc) return;
      let message: ScoreUpdateMessage;
      try {
        message = toScoreMessage(toMatchScore(doc));
      } catch (error) {
        log("error", "match.invalidPayload", {
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }
      const startedAt = Date.now();
      broadcast(message);
      log("info", "match.broadcast", {
        matchId: message.matchId,
        overs: message.data.score.overs,
        durationMs: Date.now() - startedAt,
      });
    },
  });
}
