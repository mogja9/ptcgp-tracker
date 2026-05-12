import { queryAll } from "../db";
import type { PlacingBucket } from "../rankings";
import type { SeasonFilter } from "../seasons";
import { UNKNOWN_CC } from "../countries";
import {
  dateClause,
  EXCLUSIVE_BUCKET_SUMS,
  exclusiveBucketsToRecord,
  type ExclusiveBucketCols,
} from "./common";

export type LeaderboardRow = {
  rank: number;
  playerId: string;
  displayName: string;
  country: string | null;
  totalPoints: number;
  appearances: number;
  byBucket: Record<PlacingBucket, number>;
  best10Points: number[];
};

type PlayerAggRow = ExclusiveBucketCols & {
  playerId: string;
  displayName: string;
  country: string | null;
  appearances: number;
  totalPoints: number;
  best10json: string;
};

// Per-player aggregates in one SQL pass: window-function picks each player's
// top-10 point results, then GROUP BY sums them along with exclusive bucket
// counts. Used by both the leaderboard and country rankings.
function playerAggregates(
  filter: SeasonFilter,
  limit?: number
): Array<Omit<LeaderboardRow, "rank">> {
  const dc = dateClause(filter);
  const limitClause =
    limit && limit > 0 ? ` LIMIT ${Math.floor(limit)}` : "";
  const rows = queryAll<PlayerAggRow>(
    `WITH per_event AS (
       SELECT s.player_id, s.display_name, s.country, s.placing, s.points,
              ROW_NUMBER() OVER (PARTITION BY s.player_id ORDER BY s.points DESC) AS rn
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1${dc.sql}
     )
     SELECT player_id                                       AS playerId,
            MAX(display_name)                               AS displayName,
            MAX(country)                                    AS country,
            COUNT(*)                                        AS appearances,
            SUM(CASE WHEN rn <= 10 THEN points ELSE 0 END)  AS totalPoints,
            ${EXCLUSIVE_BUCKET_SUMS},
            (SELECT json_group_array(p) FROM (
               SELECT points AS p FROM per_event pe2
               WHERE pe2.player_id = per_event.player_id AND pe2.rn <= 10
               ORDER BY pe2.points DESC
             ))                                             AS best10json
     FROM per_event
     GROUP BY player_id
     ORDER BY totalPoints DESC, appearances ASC${limitClause}`,
    ...dc.params
  );

  return rows.map((r) => ({
    playerId: r.playerId,
    displayName: r.displayName,
    country: r.country,
    totalPoints: r.totalPoints,
    appearances: r.appearances,
    byBucket: exclusiveBucketsToRecord(r),
    best10Points: parseBest10(r.best10json),
  }));
}

function parseBest10(json: string | null): number[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function getLeaderboard(filter: SeasonFilter, limit = 200): LeaderboardRow[] {
  return playerAggregates(filter, limit).map((row, i) => ({ rank: i + 1, ...row }));
}

// ---------- Country aggregation ----------

export type CountryRow = {
  rank: number;
  country: string;
  totalPoints: number;
  players: number;
  appearances: number;
  top1: number;
  top2: number;
  top4: number;
  topPlayers: Array<{ playerId: string; displayName: string; points: number }>;
};

export function getCountryRankings(filter: SeasonFilter): CountryRow[] {
  // Pull every player (no row limit) so country totals are accurate. Order by
  // totalPoints DESC so the first 10 per country are already the top 10.
  const players = playerAggregates(filter, undefined);

  const byCountry = new Map<string, CountryRow>();
  for (const p of players) {
    const cc = (p.country ?? UNKNOWN_CC).toUpperCase();
    let row = byCountry.get(cc);
    if (!row) {
      row = {
        rank: 0,
        country: cc,
        totalPoints: 0,
        players: 0,
        appearances: 0,
        top1: 0,
        top2: 0,
        top4: 0,
        topPlayers: [],
      };
      byCountry.set(cc, row);
    }
    row.totalPoints += p.totalPoints;
    row.players += 1;
    row.appearances += p.appearances;
    row.top1 += p.byBucket["1ST"];
    row.top2 += p.byBucket["2ND"];
    row.top4 += p.byBucket.TOP4;
    if (row.topPlayers.length < 10) {
      row.topPlayers.push({
        playerId: p.playerId,
        displayName: p.displayName,
        points: p.totalPoints,
      });
    }
  }
  const out = Array.from(byCountry.values());
  out.sort((a, b) => b.totalPoints - a.totalPoints);
  return out.map((row, i) => ({ ...row, rank: i + 1 }));
}
