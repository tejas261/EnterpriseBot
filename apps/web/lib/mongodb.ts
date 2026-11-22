import { MongoClient, type Db } from "mongodb";
import { getEnv } from "./env";

const globalForMongo = globalThis as unknown as {
  iplMongoClient?: Promise<MongoClient>;
};

function connect(): Promise<MongoClient> {
  const client = new MongoClient(getEnv().MONGODB_URI, {
    appName: "ipl-live-web",
    serverSelectionTimeoutMS: 5000,
  });
  return client.connect();
}

/** One MongoClient per process; cached on globalThis so Next.js dev HMR does not leak clients. */
export function getClient(): Promise<MongoClient> {
  globalForMongo.iplMongoClient ??= connect();
  return globalForMongo.iplMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(getEnv().MONGODB_DB);
}
