import "dotenv/config";
import { ensureCollection, withDb } from "./lib/db";

/** Idempotent index + Change Stream pre-image setup. Run once per database. */
async function main(): Promise<void> {
  await withDb(async (db) => {
    for (const name of ["users", "teams", "subscriptions", "notifications", "matches", "streamCheckpoints"]) {
      await ensureCollection(db, name);
    }

    await Promise.all([
      db.collection("users").createIndex({ username: 1 }, { unique: true, name: "uniq_username" }),
      db.collection("teams").createIndex({ short: 1 }, { unique: true, name: "uniq_short" }),
      db.collection("teams").createIndex({ name: 1 }, { name: "by_name" }),
      db
        .collection("subscriptions")
        .createIndex({ userId: 1, teamId: 1 }, { unique: true, name: "uniq_user_team" }),
      db.collection("subscriptions").createIndex({ teamId: 1 }, { name: "by_team" }),
      db
        .collection("notifications")
        .createIndex({ userId: 1, createdAt: -1 }, { name: "by_user_created" }),
      db
        .collection("notifications")
        .createIndex({ userId: 1, read: 1, createdAt: -1 }, { name: "by_user_read_created" }),
      db
        .collection("notifications")
        .createIndex(
          { userId: 1, sourceEventId: 1 },
          { unique: true, name: "uniq_user_source_event" },
        ),
      db.collection("matches").createIndex({ matchId: 1 }, { unique: true, name: "uniq_match_id" }),
    ]);

    // Enables accurate old values on team updates. The processor falls back to its own cache
    // when this is unavailable, so it is not required for correctness.
    try {
      await db.command({ collMod: "teams", changeStreamPreAndPostImages: { enabled: true } });
      console.log("teams pre/post images: enabled");
    } catch (error) {
      console.warn(
        "teams pre/post images could not be enabled; falling back to processor cache:",
        error instanceof Error ? error.message : String(error),
      );
    }

    console.log("indexes ready");
  });
}

main().catch((error: unknown) => {
  console.error("db:init failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
