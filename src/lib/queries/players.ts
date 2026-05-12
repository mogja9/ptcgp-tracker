import { queryAll } from "../db";
import { type PlacingBucket, bucketFor } from "../rankings";
import type { SeasonFilter } from "../seasons";
import { dateClause, EMPTY_BUCKETS } from "./common";

export type PlayerStats = {
  playerId: string;
  displayName: string;
  country: string | null;
  totalPoints: number;
  appearances: number;
  bucketCounts: Record<PlacingBucket, number>;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  best10Points: number[];
  recent: Array<{
    tournamentId: string;
    tournamentName: string;
    date: string;
    matchFormat: string | null;
    players: number;
    placing: number;
    wins: number;
    losses: number;
    ties: number;
    deckId: string | null;
    deckName: string | null;
    iconA: string | null;
    iconB: string | null;
    points: number;
  }>;
};

export type PlayerSearchResult = {
  playerId: string;
  displayName: string;
  country: string | null;
  appearances: number;
};

export function getPlayer(
  playerId: string,
  filter: SeasonFilter
): PlayerStats | null {
  const dc = dateClause(filter);
  const rows = queryAll<{
    placing: number; points: number; wins: number; losses: number; ties: number;
    deckId: string | null; deckName: string | null; iconA: string | null; iconB: string | null;
    displayName: string; country: string | null;
    tournamentId: string; tournamentName: string; date: string;
    matchFormat: string | null; players: number;
  }>(
    `SELECT s.placing, s.points, s.wins, s.losses, s.ties,
            s.deck_id      AS deckId, s.deck_name AS deckName,
            s.deck_icon_a  AS iconA,  s.deck_icon_b AS iconB,
            s.display_name AS displayName, s.country,
            t.id           AS tournamentId, t.name AS tournamentName, t.date,
            t.match_format AS matchFormat, t.players
     FROM standing s
     JOIN tournament t ON t.id = s.tournament_id
     WHERE s.player_id = ? AND t.eligible = 1${dc.sql}
     ORDER BY t.date DESC`,
    playerId,
    ...dc.params
  );
  if (rows.length === 0) return null;

  const buckets: Record<PlacingBucket, number> = { ...EMPTY_BUCKETS };
  let w = 0, l = 0, ti = 0;
  for (const r of rows) {
    const bk = bucketFor(r.placing);
    if (bk) buckets[bk] += 1;
    w += r.wins; l += r.losses; ti += r.ties;
  }
  const points = rows.map((r) => r.points);
  const best10Points = [...points].sort((a, b) => b - a).slice(0, 10);
  const games = w + l + ti;

  return {
    playerId,
    displayName: rows[0].displayName,
    country: rows.find((r) => r.country)?.country ?? null,
    totalPoints: best10Points.reduce((s, x) => s + x, 0),
    appearances: rows.length,
    bucketCounts: buckets,
    wins: w, losses: l, ties: ti,
    winRate: games ? (w + ti * 0.5) / games : 0,
    best10Points,
    recent: rows.map((r) => ({
      tournamentId: r.tournamentId,
      tournamentName: r.tournamentName,
      date: r.date,
      matchFormat: r.matchFormat,
      players: r.players,
      placing: r.placing,
      wins: r.wins, losses: r.losses, ties: r.ties,
      deckId: r.deckId, deckName: r.deckName,
      iconA: r.iconA, iconB: r.iconB,
      points: r.points,
    })),
  };
}

// Type-ahead search across player_id and display_name. Case-insensitive.
// Ranks by appearance count so well-known players surface first.
export function searchPlayers(q: string, limit = 8): PlayerSearchResult[] {
  const trimmed = q.trim();
  if (trimmed.length < 1) return [];
  const pattern = `%${trimmed.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
  return queryAll<PlayerSearchResult>(
    `SELECT s.player_id          AS playerId,
            MAX(s.display_name)  AS displayName,
            MAX(s.country)       AS country,
            COUNT(*)             AS appearances
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1
         AND (LOWER(s.player_id)    LIKE LOWER(?) ESCAPE '\\'
              OR LOWER(s.display_name) LIKE LOWER(?) ESCAPE '\\')
       GROUP BY s.player_id
       ORDER BY appearances DESC
       LIMIT ?`,
    pattern,
    pattern,
    limit
  );
}
