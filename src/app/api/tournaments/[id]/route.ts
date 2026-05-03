import { NextRequest } from "next/server";
import { getTournament } from "@/lib/queries";
import { jsonOk, jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const tournament = getTournament(id);
    if (!tournament) return jsonError(new Error("Tournament not found"), 404);
    return jsonOk(tournament);
  } catch (e) {
    return jsonError(e);
  }
}
