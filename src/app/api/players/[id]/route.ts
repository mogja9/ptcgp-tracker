import { NextRequest } from "next/server";
import { getPlayer } from "@/lib/queries";
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
    const player = getPlayer(decoded, filter);
    if (!player) return jsonError(new Error("Player not found"), 404);
    return jsonOk({
      season: label,
      generatedAt: new Date().toISOString(),
      player,
    });
  } catch (e) {
    return jsonError(e);
  }
}
