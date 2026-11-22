import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ status: "ready", mongo: "connected" });
  } catch {
    return NextResponse.json({ status: "degraded", mongo: "disconnected" }, { status: 503 });
  }
}
