import "dotenv/config";
import bcrypt from "bcryptjs";
import { usernameSchema, passwordSchema } from "@ipl/shared";
import { withDb } from "./lib/db";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return inline?.split("=").slice(1).join("=");
}

async function main(): Promise<void> {
  const usernameRaw = readArg("username") ?? process.env.ADMIN_USERNAME;
  const passwordRaw = readArg("password") ?? process.env.ADMIN_PASSWORD;

  if (!usernameRaw || !passwordRaw) {
    throw new Error(
      "Usage: npm run db:create-admin -- --username <name> --password <password> (or set ADMIN_USERNAME/ADMIN_PASSWORD)",
    );
  }
  const username = usernameSchema.parse(usernameRaw);
  const password = passwordSchema.parse(passwordRaw);
  const passwordHash = await bcrypt.hash(password, 10);

  await withDb(async (db) => {
    const users = db.collection("users");
    const existing = await users.findOne({ username });
    const now = new Date();
    if (existing) {
      await users.updateOne(
        { _id: existing._id },
        { $set: { role: "admin", passwordHash, updatedAt: now } },
      );
      console.log(`promoted existing user "${username}" to admin and reset its password`);
      return;
    }
    await users.insertOne({
      username,
      passwordHash,
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
    console.log(`created admin "${username}"`);
  });
}

main().catch((error: unknown) => {
  console.error("db:create-admin failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
