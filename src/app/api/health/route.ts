import { NextResponse } from "next/server";
import { getStats } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = getStats();
    return NextResponse.json(
      {
        ok: true,
        eligibleTournaments: stats.eligibleTournaments,
        distinctPlayers: stats.distinctPlayers,
        lastSync: stats.lastSync,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "db error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
