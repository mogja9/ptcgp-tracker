import { NextRequest } from "next/server";
import { getArchetypeLeaderboard, getDeckById, getSampleDecklist } from "@/lib/queries";
import { getFilterFromRequest, jsonOk, jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const decoded = decodeURIComponent(id);
    const { filter, label } = getFilterFromRequest(req);
    const rollup = getDeckById(decoded, filter);
    if (!rollup) return jsonError(new Error("Deck not found"), 404);
    const pilots = getArchetypeLeaderboard(decoded, filter);
    const sample = getSampleDecklist(decoded, filter);
    return jsonOk({
      season: label,
      generatedAt: new Date().toISOString(),
      deck: rollup,
      pilots,
      sample,
    });
  } catch (e) {
    return jsonError(e);
  }
}
