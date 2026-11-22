import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

// Root .env is the single source of truth for both services.
loadEnv({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });
loadEnv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/ipl_live?replicaSet=rs0"),
  MONGODB_DB: z.string().min(1).default("ipl_live"),
  REALTIME_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  HEARTBEAT_MS: z.coerce.number().int().min(5000).default(20000),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid realtime environment: ${issues}. Copy .env.example to .env.`);
}

export const env = parsed.data;
