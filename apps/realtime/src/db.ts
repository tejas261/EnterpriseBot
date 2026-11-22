import { MongoClient, type Db } from "mongodb";
import { env } from "./config/env";

const client = new MongoClient(env.MONGODB_URI, {
  appName: "ipl-live-realtime",
  serverSelectionTimeoutMS: 5000,
});

let db: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (!db) {
    await client.connect();
    db = client.db(env.MONGODB_DB);
  }
  return db;
}

export async function pingDb(): Promise<boolean> {
  try {
    await client.db(env.MONGODB_DB).command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await client.close();
  db = null;
}
