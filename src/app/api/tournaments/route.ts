import { NextRequest } from "next/server";
import { getRecentTournaments } from "@/lib/queries";
import { getFilterFromRequest, jsonOk, jsonError, parseIntParam } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { filter, label } = getFilterFromRequest(req);
    const limit = parseIntParam(req, "limit", 50, 500);
    const tournaments = getRecentTournaments(filter, limit);
    return jsonOk({
      season: label,
      generatedAt: new Date().toISOString(),
      total: tournaments.length,
      tournaments,
    });
  } catch (e) {
    return jsonError(e);
  }
}
