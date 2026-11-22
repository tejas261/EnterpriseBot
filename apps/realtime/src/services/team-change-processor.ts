import type { Db, Document, ObjectId } from "mongodb";
import {
  buildTeamNotification,
  extractTeamChanges,
  toNotificationDto,
  type NotificationDto,
  type NotifiableField,
  type NormalizedTeamChange,
  type TeamNotificationDraft,
} from "@ipl/shared";

interface TeamDoc extends Document {
  _id: ObjectId;
  short: string;
  name: string;
}

interface SubscriptionDoc extends Document {
  _id: ObjectId;
  userId: ObjectId;
  teamId: ObjectId;
  fields: NotifiableField[];
}

export interface TeamChangeEvent {
  operationType: "update" | "replace";
  documentKey: { _id: ObjectId };
  fullDocument?: Record<string, unknown> | null;
  fullDocumentBeforeChange?: Record<string, unknown> | null;
  updateDescription?: { updatedFields?: Record<string, unknown>; removedFields?: string[] };
}

export interface ProcessResult {
  changedFields: number;
  notificationsCreated: number;
}

/**
 * Turns one teams change event into one grouped notification per eligible subscriber.
 * Notifications are persisted before `publish` is called; idempotency relies on the unique
 * { userId, sourceEventId } index, so a replayed event inserts nothing new.
 */
export async function processTeamChange(params: {
  db: Db;
  event: TeamChangeEvent;
  eventId: string;
  teamCache: Map<string, Document>;
  publish: (userId: string, notification: NotificationDto) => void;
  now?: Date;
}): Promise<ProcessResult> {
  const { db, event, eventId, teamCache, publish } = params;
  if (event.operationType !== "update" && event.operationType !== "replace") {
    return { changedFields: 0, notificationsCreated: 0 };
  }

  const teamId = event.documentKey._id;
  const teamIdKey = teamId.toString();
  const lookedUp = (event.fullDocument as TeamDoc | null) ?? null;
  const current: TeamDoc | null = lookedUp ?? (await db.collection<TeamDoc>("teams").findOne({ _id: teamId }));
  if (!current) return { changedFields: 0, notificationsCreated: 0 };

  const before = (event.fullDocumentBeforeChange as Document | null | undefined) ?? teamCache.get(teamIdKey) ?? null;
  const changes: NormalizedTeamChange[] = extractTeamChanges({
    mode: event.operationType,
    oldDoc: before,
    newDoc: current,
    updatedFields: event.updateDescription?.updatedFields,
    removedFields: event.updateDescription?.removedFields,
  });
  teamCache.set(teamIdKey, current);

  if (changes.length === 0) return { changedFields: 0, notificationsCreated: 0 };

  const subscriptions = await db
    .collection<SubscriptionDoc>("subscriptions")
    .find({ teamId })
    .toArray();

  const createdAt = params.now ?? new Date();
  const drafts = subscriptions
    .map((subscription) => {
      const draft: TeamNotificationDraft | null = buildTeamNotification({
        changes,
        subscriptionFields: subscription.fields,
        teamShort: current.short,
        teamName: current.name,
        eventId,
        createdAt,
      });
      return draft ? { ...draft, userId: subscription.userId } : null;
    })
    .filter((draft): draft is TeamNotificationDraft & { userId: ObjectId } => draft !== null);

  if (drafts.length === 0) return { changedFields: changes.length, notificationsCreated: 0 };

  const result = await db.collection("notifications").bulkWrite(
    drafts.map((draft) => ({
      updateOne: {
        filter: { userId: draft.userId, sourceEventId: eventId },
        update: {
          $setOnInsert: {
            userId: draft.userId,
            teamId,
            teamShort: draft.teamShort,
            teamName: draft.teamName,
            type: draft.type,
            title: draft.title,
            message: draft.message,
            changes: draft.changes,
            sourceEventId: draft.sourceEventId,
            read: false,
            createdAt: draft.createdAt,
            readAt: null,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  for (const [index, insertedId] of Object.entries(result.upsertedIds)) {
    const draft = drafts[Number(index)];
    if (!draft) continue;
    publish(draft.userId.toString(), {
      ...toNotificationDto({
        _id: insertedId,
        teamId,
        teamShort: draft.teamShort,
        teamName: draft.teamName,
        type: draft.type,
        title: draft.title,
        message: draft.message,
        changes: draft.changes,
        read: draft.read,
        createdAt: draft.createdAt,
        readAt: draft.readAt,
      }),
    });
  }

  return { changedFields: changes.length, notificationsCreated: Object.keys(result.upsertedIds).length };
}
