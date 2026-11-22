import type { NotificationChange, NotificationDto } from "./schemas";
import { matchScoreSchema, type MatchScore } from "./schemas";

export function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date(0).toISOString();
}

export interface NotificationDocLike {
  _id: { toString(): string };
  teamId: { toString(): string };
  teamShort: string;
  teamName?: string;
  type: "TEAM_UPDATED";
  title: string;
  message: string;
  changes: NotificationChange[];
  read: boolean;
  createdAt: Date | string;
  readAt: Date | string | null;
}

export function toNotificationDto(doc: NotificationDocLike): NotificationDto {
  return {
    id: doc._id.toString(),
    teamId: doc.teamId.toString(),
    teamShort: doc.teamShort,
    teamName: doc.teamName ?? doc.teamShort,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    changes: doc.changes,
    read: doc.read,
    createdAt: toIsoString(doc.createdAt),
    readAt: doc.readAt === null || doc.readAt === undefined ? null : toIsoString(doc.readAt),
  };
}

/** Converts a MongoDB match document into the validated wire format used by REST and WebSocket. */
export function toMatchScore(doc: Record<string, unknown>): MatchScore {
  const { _id, ...rest } = doc;
  void _id;
  return matchScoreSchema.parse({ ...rest, updatedAt: toIsoString(rest.updatedAt) });
}
