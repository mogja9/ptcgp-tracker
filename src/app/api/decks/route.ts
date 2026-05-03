import { NextRequest } from "next/server";
import { getTierList } from "@/lib/queries";
import { getFilterFromRequest, jsonOk, jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { filter, label } = getFilterFromRequest(req);
    const decks = getTierList(filter);
    return jsonOk({
      season: label,
      generatedAt: new Date().toISOString(),
      total: decks.length,
      decks,
    });
  } catch (e) {
    return jsonError(e);
  }
}
