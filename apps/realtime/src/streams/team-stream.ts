import type { Db, Document } from "mongodb";
import type { NotificationDto } from "@ipl/shared";
import { eventIdFromResumeToken } from "../utils/event-id";
import { processTeamChange, type TeamChangeEvent } from "../services/team-change-processor";
import { ChangeStreamRunner } from "./change-stream";
import { log } from "../utils/logger";

export async function createTeamStream(
  db: Db,
  publish: (userId: string, notification: NotificationDto) => void,
): Promise<ChangeStreamRunner> {
  // Fallback source for old values when pre-images are unavailable.
  const teamCache = new Map<string, Document>();
  const teams = await db.collection("teams").find({}).toArray();
  for (const team of teams) teamCache.set(team._id.toString(), team);

  const runner = new ChangeStreamRunner({
    name: "teams",
    db,
    collection: "teams",
    operationTypes: ["update", "replace"],
    onEvent: async (event) => {
      const startedAt = Date.now();
      const eventId = eventIdFromResumeToken(event._id);
      const result = await processTeamChange({
        db,
        event: event as unknown as TeamChangeEvent,
        eventId,
        teamCache,
        publish,
      });
      if (result.changedFields > 0) {
        log("info", "team.change.processed", {
          eventId,
          changedFields: result.changedFields,
          notificationsCreated: result.notificationsCreated,
          durationMs: Date.now() - startedAt,
        });
      }
    },
  });
  return runner;
}
