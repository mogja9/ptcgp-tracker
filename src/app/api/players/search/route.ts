import { NextRequest, NextResponse } from "next/server";
import { searchPlayers } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 1) {
    return NextResponse.json([], {
      headers: { "cache-control": "no-store" },
    });
  }
  try {
    const results = searchPlayers(q, 8);
    return NextResponse.json(results, {
      headers: { "cache-control": "private, max-age=10" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "search failed" },
      { status: 500 }
    );
  }
}
