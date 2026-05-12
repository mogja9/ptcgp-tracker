import { NextRequest } from "next/server";
import { getLeaderboard, getStats } from "@/lib/queries";
import { getFilterFromRequest, jsonOk, jsonError, parseIntParam } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { filter, label } = getFilterFromRequest(req);
    const limit = parseIntParam(req, "limit", 100, 1000);
    const board = getLeaderboard(filter, limit);
    const stats = getStats(filter);
    return jsonOk({
      season: label,
      generatedAt: new Date().toISOString(),
      total: stats.distinctPlayers,
      tournaments: stats.eligibleTournaments,
      players: board,
    });
  } catch (e) {
    return jsonError(e);
  }
}
