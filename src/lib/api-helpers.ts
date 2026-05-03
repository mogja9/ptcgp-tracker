import { NextRequest, NextResponse } from "next/server";
import { parseSeasonParam, filterShortLabel } from "./seasons";

export function getFilterFromRequest(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("season") ?? undefined;
  const filter = parseSeasonParam(raw);
  return { filter, label: filterShortLabel(filter) };
}

export function jsonOk(data: unknown, cacheSeconds = 60) {
  return NextResponse.json(data, {
    headers: {
      "cache-control": `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 4}`,
    },
  });
}

export function jsonError(err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : "internal error";
  return NextResponse.json({ error: message }, { status });
}

export function parseIntParam(req: NextRequest, name: string, fallback: number, max = 1000) {
  const v = req.nextUrl.searchParams.get(name);
  if (v == null) return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}
