import { ObjectId } from "mongodb";
import type { AuthUser, Role } from "@ipl/shared";
import { getDb } from "./mongodb";

export interface UserDoc {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export function toAuthUser(doc: UserDoc): AuthUser {
  return { id: doc._id.toString(), username: doc.username, role: doc.role };
}

export async function findUserByUsername(username: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>("users").findOne({ username });
}
