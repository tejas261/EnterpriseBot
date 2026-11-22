import { MongoClient, type Db } from "mongodb";

export const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/ipl_live?replicaSet=rs0";
export const MONGODB_DB = process.env.MONGODB_DB ?? "ipl_live";

export async function withDb<T>(run: (db: Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  try {
    return await run(client.db(MONGODB_DB));
  } finally {
    await client.close();
  }
}

export async function ensureCollection(db: Db, name: string): Promise<void> {
  const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
  if (!exists) {
    try {
      await db.createCollection(name);
    } catch {
      // Another process created it between the check and the create.
    }
  }
}
