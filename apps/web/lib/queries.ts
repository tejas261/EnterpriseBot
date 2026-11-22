import { ObjectId, type Filter } from "mongodb";
import {
  toMatchScore,
  toNotificationDto,
  type MatchScore,
  type NotifiableField,
  type NotificationDto,
  type SubscriptionDto,
  type TeamRecord,
} from "@ipl/shared";
import { getDb } from "./mongodb";

export interface TeamDoc {
  _id: ObjectId;
  name: string;
  short: string;
  logoUrl?: string;
  captain: string;
  headCoach: string;
  homeGround: string;
  titles: number;
  wins: number;
  losses: number;
  points: number;
  season?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionDoc {
  _id: ObjectId;
  userId: ObjectId;
  teamId: ObjectId;
  teamShort: string;
  fields: NotifiableField[];
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationDoc {
  _id: ObjectId;
  userId: ObjectId;
  teamId: ObjectId;
  teamShort: string;
  teamName?: string;
  type: "TEAM_UPDATED";
  title: string;
  message: string;
  changes: NotificationDto["changes"];
  read: boolean;
  createdAt: Date;
  readAt: Date | null;
}

export function toTeamRecord(doc: TeamDoc): TeamRecord {
  return {
    id: doc._id.toString(),
    name: doc.name,
    short: doc.short,
    logoUrl: doc.logoUrl,
    captain: doc.captain,
    headCoach: doc.headCoach,
    homeGround: doc.homeGround,
    titles: doc.titles,
    wins: doc.wins,
    losses: doc.losses,
    points: doc.points,
    season: doc.season ?? "2025",
  };
}

export function toSubscriptionDto(doc: SubscriptionDoc): SubscriptionDto {
  return {
    id: doc._id.toString(),
    teamShort: doc.teamShort,
    fields: doc.fields,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listTeams(): Promise<TeamRecord[]> {
  const db = await getDb();
  const docs = await db.collection<TeamDoc>("teams").find({}).sort({ name: 1 }).toArray();
  return docs.map(toTeamRecord);
}

export async function findTeamByShort(short: string): Promise<TeamDoc | null> {
  const db = await getDb();
  return db.collection<TeamDoc>("teams").findOne({ short });
}

export async function listSubscriptions(userId: string): Promise<SubscriptionDto[]> {
  const db = await getDb();
  const docs = await db
    .collection<SubscriptionDoc>("subscriptions")
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: 1 })
    .toArray();
  return docs.map(toSubscriptionDto);
}

function encodeCursor(doc: NotificationDoc): string {
  return Buffer.from(`${doc.createdAt.toISOString()}|${doc._id.toString()}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: ObjectId } | null {
  try {
    const [date, id] = Buffer.from(cursor, "base64url").toString().split("|");
    if (!date || !id || !ObjectId.isValid(id)) return null;
    const createdAt = new Date(date);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id: new ObjectId(id) };
  } catch {
    return null;
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = await getDb();
  return db
    .collection("notifications")
    .countDocuments({ userId: new ObjectId(userId), read: false });
}

export async function listNotifications(params: {
  userId: string;
  limit: number;
  cursor?: string;
  unreadOnly?: boolean;
}): Promise<{ items: NotificationDto[]; nextCursor: string | null; unreadCount: number }> {
  const db = await getDb();
  const userId = new ObjectId(params.userId);
  const filter: Filter<NotificationDoc> = { userId };
  if (params.unreadOnly) filter.read = false;
  const decoded = params.cursor ? decodeCursor(params.cursor) : null;
  if (decoded) {
    filter.$or = [
      { createdAt: { $lt: decoded.createdAt } },
      { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
    ];
  }

  const [docs, unreadCount] = await Promise.all([
    db
      .collection<NotificationDoc>("notifications")
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(params.limit + 1)
      .toArray(),
    getUnreadCount(params.userId),
  ]);

  const hasMore = docs.length > params.limit;
  const page = docs.slice(0, params.limit);
  const last = page.at(-1);
  return {
    items: page.map(toNotificationDto),
    nextCursor: hasMore && last ? encodeCursor(last) : null,
    unreadCount,
  };
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<{ modified: number; unreadCount: number }> {
  const db = await getDb();
  const now = new Date();
  const result = await db.collection("notifications").updateMany(
    { userId: new ObjectId(userId), read: false },
    { $set: { read: true, readAt: now } },
  );
  return { modified: result.modifiedCount, unreadCount: 0 };
}

export async function getLiveMatch(): Promise<MatchScore | null> {
  const db = await getDb();
  const matches = db.collection("matches");
  const doc =
    (await matches.findOne({ status: "LIVE" }, { sort: { updatedAt: -1 } })) ??
    (await matches.findOne({ matchId: "ipl-demo-match-001" }));
  if (!doc) return null;
  try {
    return toMatchScore(doc);
  } catch {
    return null;
  }
}
