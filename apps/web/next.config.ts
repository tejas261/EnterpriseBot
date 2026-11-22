import path from "node:path";
import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";

// The repository keeps one .env at the root for both services.
loadEnv({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });
loadEnv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@ipl/shared"],
  env: {
    NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000",
  },
};

export default nextConfig;
