import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

// apps/web has no own .env; the repository root .env is shared with the realtime service.
loadEnv({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });
loadEnv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/ipl_live?replicaSet=rs0"),
  MONGODB_DB: z.string().min(1).default("ipl_live"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  AUTH_TOKEN_TTL: z.string().min(2).default("12h"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Validated server environment. Called lazily so `next build` does not need runtime secrets. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment (${issues}). Copy .env.example to .env.`);
  }
  cached = parsed.data;
  return cached;
}
