import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ipl-live-web",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
