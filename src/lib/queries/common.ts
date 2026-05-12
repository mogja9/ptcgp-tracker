import type { PlacingBucket } from "../rankings";
import { filterRange, type SeasonFilter } from "../seasons";

export const EMPTY_BUCKETS: Record<PlacingBucket, number> = {
  "1ST": 0, "2ND": 0, TOP4: 0, TOP8: 0, TOP16: 0, TOP32: 0,
  TOP64: 0, TOP128: 0, TOP256: 0,
};

// Build a `WHERE` fragment + params that constrains `tournament.date` to a
// season window. Returns an empty fragment when the filter spans all time.
export function dateClause(
  f: SeasonFilter,
  alias = "t"
): { sql: string; params: string[] } {
  const r = filterRange(f);
  const parts: string[] = [];
  const params: string[] = [];
  if (r.start) {
    parts.push(`${alias}.date >= ?`);
    params.push(r.start);
  }
  if (r.end) {
    parts.push(`${alias}.date < ?`);
    params.push(r.end);
  }
  return { sql: parts.length ? ` AND ${parts.join(" AND ")}` : "", params };
}

// Reusable CASE-WHEN fragment for exclusive placing buckets (matches
// rankings.bucketFor). One row maps to exactly one bucket count.
export const EXCLUSIVE_BUCKET_SUMS = `
  SUM(CASE WHEN placing = 1                       THEN 1 ELSE 0 END) AS b1st,
  SUM(CASE WHEN placing = 2                       THEN 1 ELSE 0 END) AS b2nd,
  SUM(CASE WHEN placing BETWEEN 3   AND 4         THEN 1 ELSE 0 END) AS b4,
  SUM(CASE WHEN placing BETWEEN 5   AND 8         THEN 1 ELSE 0 END) AS b8,
  SUM(CASE WHEN placing BETWEEN 9   AND 16        THEN 1 ELSE 0 END) AS b16,
  SUM(CASE WHEN placing BETWEEN 17  AND 32        THEN 1 ELSE 0 END) AS b32,
  SUM(CASE WHEN placing BETWEEN 33  AND 64        THEN 1 ELSE 0 END) AS b64,
  SUM(CASE WHEN placing BETWEEN 65  AND 128       THEN 1 ELSE 0 END) AS b128,
  SUM(CASE WHEN placing BETWEEN 129 AND 256       THEN 1 ELSE 0 END) AS b256
`;

export type ExclusiveBucketCols = {
  b1st: number; b2nd: number; b4: number; b8: number; b16: number;
  b32: number; b64: number; b128: number; b256: number;
};

export function exclusiveBucketsToRecord(
  r: ExclusiveBucketCols
): Record<PlacingBucket, number> {
  return {
    "1ST": r.b1st, "2ND": r.b2nd, TOP4: r.b4, TOP8: r.b8, TOP16: r.b16,
    TOP32: r.b32, TOP64: r.b64, TOP128: r.b128, TOP256: r.b256,
  };
}

// Cumulative placing-bucket sums for deck-level rollups: each top-N counter
// includes every better finish. Use with `s.placing` from the `standing` alias.
export const DECK_BUCKET_SUMS = `
  SUM(CASE WHEN s.placing = 1   THEN 1 ELSE 0 END) AS top1,
  SUM(CASE WHEN s.placing = 2   THEN 1 ELSE 0 END) AS top2,
  SUM(CASE WHEN s.placing <= 4  THEN 1 ELSE 0 END) AS top4,
  SUM(CASE WHEN s.placing <= 8  THEN 1 ELSE 0 END) AS top8,
  SUM(CASE WHEN s.placing <= 16 THEN 1 ELSE 0 END) AS top16,
  SUM(CASE WHEN s.placing <= 32 THEN 1 ELSE 0 END) AS top32
`;

export type DeckBucketCols = {
  top1: number; top2: number; top4: number; top8: number;
  top16: number; top32: number;
};
