import { queryAll, queryOne } from "../db";
import type { SeasonFilter } from "../seasons";
import {
  dateClause,
  DECK_BUCKET_SUMS,
  type DeckBucketCols,
} from "./common";

export type DeckSummary = {
  deckId: string;
  deckName: string;
  iconA: string | null;
  iconB: string | null;
  appearances: number;
  top1: number;
  top2: number;
  top4: number;
  top8: number;
  top16: number;
  top32: number;
};

export type ArchetypePlayer = {
  rank: number;
  playerId: string;
  displayName: string;
  country: string | null;
  appearances: number;
  totalPoints: number;
  winRate: number;
  top1: number;
  top2: number;
  top4: number;
};

type DeckRollupRow = DeckBucketCols & {
  deckId: string;
  deckName: string | null;
  iconA: string | null;
  iconB: string | null;
  appearances: number;
};

export function getDeckRollup(filter: SeasonFilter, limit = 100): DeckSummary[] {
  const dc = dateClause(filter);
  const rows = queryAll<DeckRollupRow>(
    `SELECT s.deck_id          AS deckId,
            MAX(s.deck_name)   AS deckName,
            MAX(s.deck_icon_a) AS iconA,
            MAX(s.deck_icon_b) AS iconB,
            COUNT(*)           AS appearances,
            ${DECK_BUCKET_SUMS}
     FROM standing s
     JOIN tournament t ON t.id = s.tournament_id
     WHERE t.eligible = 1 AND s.deck_id IS NOT NULL${dc.sql}
     GROUP BY s.deck_id
     ORDER BY appearances DESC
     LIMIT ?`,
    ...dc.params,
    limit
  );
  return rows.map((r) => ({ ...r, deckName: r.deckName ?? r.deckId }));
}

// Scoped single-deck lookup. Replaces getDeckRollup(filter, 2000).find(...)
// on the deck detail pages.
export function getDeckById(
  deckId: string,
  filter: SeasonFilter
): DeckSummary | null {
  const dc = dateClause(filter);
  const row = queryOne<DeckRollupRow>(
    `SELECT s.deck_id          AS deckId,
            MAX(s.deck_name)   AS deckName,
            MAX(s.deck_icon_a) AS iconA,
            MAX(s.deck_icon_b) AS iconB,
            COUNT(*)           AS appearances,
            ${DECK_BUCKET_SUMS}
     FROM standing s
     JOIN tournament t ON t.id = s.tournament_id
     WHERE t.eligible = 1 AND s.deck_id = ?${dc.sql}
     GROUP BY s.deck_id`,
    deckId,
    ...dc.params
  );
  if (!row || row.appearances === 0) return null;
  return { ...row, deckName: row.deckName ?? row.deckId };
}

// ---------- Tier list ----------

export type TierLetter = "SS" | "S" | "A" | "B" | "C" | "D";
export type TierDeck = DeckSummary & { tier: TierLetter; share: number };

export function getTierList(filter: SeasonFilter): TierDeck[] {
  const dc = dateClause(filter);
  const rows = queryAll<DeckRollupRow>(
    `SELECT s.deck_id          AS deckId,
            MAX(s.deck_name)   AS deckName,
            MAX(s.deck_icon_a) AS iconA,
            MAX(s.deck_icon_b) AS iconB,
            COUNT(*)           AS appearances,
            ${DECK_BUCKET_SUMS}
     FROM standing s
     JOIN tournament t ON t.id = s.tournament_id
     WHERE t.eligible = 1 AND s.deck_id IS NOT NULL AND s.placing <= 32${dc.sql}
     GROUP BY s.deck_id`,
    ...dc.params
  );
  // Under the placing<=32 filter, sum(appearances) is the total top-32 sample.
  const total = rows.reduce((sum, r) => sum + r.appearances, 0);
  if (total === 0) return [];

  const decks: TierDeck[] = rows.map((r) => {
    const share = r.appearances / total;
    let tier: TierLetter = "D";
    if (share >= 0.3) tier = "SS";
    else if (share >= 0.15) tier = "S";
    else if (share >= 0.1) tier = "A";
    else if (share >= 0.05) tier = "B";
    else if (share >= 0.01) tier = "C";
    return { ...r, deckName: r.deckName ?? r.deckId, tier, share };
  });

  const tierOrder: TierLetter[] = ["SS", "S", "A", "B", "C", "D"];
  decks.sort((a, b) => {
    const ta = tierOrder.indexOf(a.tier);
    const tb = tierOrder.indexOf(b.tier);
    if (ta !== tb) return ta - tb;
    return b.share - a.share;
  });
  return decks;
}

// ---------- Archetype leaderboard ----------

export function getArchetypeLeaderboard(
  deckId: string,
  filter: SeasonFilter
): ArchetypePlayer[] {
  const dc = dateClause(filter);
  type Row = {
    playerId: string;
    displayName: string;
    country: string | null;
    appearances: number;
    totalPoints: number;
    w: number; l: number; ti: number;
    top1: number; top2: number; top4: number;
  };
  const rows = queryAll<Row>(
    `WITH per_event AS (
       SELECT s.player_id, s.display_name, s.country, s.placing, s.points,
              s.wins, s.losses, s.ties,
              ROW_NUMBER() OVER (PARTITION BY s.player_id ORDER BY s.points DESC) AS rn
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1 AND s.deck_id = ?${dc.sql}
     )
     SELECT player_id                                       AS playerId,
            MAX(display_name)                               AS displayName,
            MAX(country)                                    AS country,
            COUNT(*)                                        AS appearances,
            SUM(CASE WHEN rn <= 10 THEN points ELSE 0 END)  AS totalPoints,
            SUM(wins)                                       AS w,
            SUM(losses)                                     AS l,
            SUM(ties)                                       AS ti,
            SUM(CASE WHEN placing = 1   THEN 1 ELSE 0 END)  AS top1,
            SUM(CASE WHEN placing = 2   THEN 1 ELSE 0 END)  AS top2,
            SUM(CASE WHEN placing <= 4  THEN 1 ELSE 0 END)  AS top4
     FROM per_event
     GROUP BY player_id
     ORDER BY totalPoints DESC`,
    deckId,
    ...dc.params
  );

  return rows.map((r, i) => {
    const games = r.w + r.l + r.ti;
    return {
      rank: i + 1,
      playerId: r.playerId,
      displayName: r.displayName,
      country: r.country,
      appearances: r.appearances,
      totalPoints: r.totalPoints,
      winRate: games ? (r.w + r.ti * 0.5) / games : 0,
      top1: r.top1,
      top2: r.top2,
      top4: r.top4,
    };
  });
}

// ---------- Sample decklist ----------

// Most recent winning decklist for a given archetype (highest placing,
// tie-broken by recency).
export function getSampleDecklist(
  deckId: string,
  filter: SeasonFilter
): {
  decklistJson: string | null;
  placing: number;
  tournamentId: string;
  tournamentName: string;
  date: string;
  displayName: string;
  playerId: string;
} | null {
  const dc = dateClause(filter);
  const row = queryOne<{
    decklistJson: string | null;
    placing: number;
    displayName: string;
    playerId: string;
    tournamentId: string;
    tournamentName: string;
    date: string;
  }>(
    `SELECT s.decklist_json AS decklistJson, s.placing,
            s.display_name AS displayName, s.player_id AS playerId,
            t.id AS tournamentId, t.name AS tournamentName, t.date
     FROM standing s
     JOIN tournament t ON t.id = s.tournament_id
     WHERE t.eligible = 1 AND s.deck_id = ? AND s.decklist_json IS NOT NULL${dc.sql}
     ORDER BY s.placing ASC, t.date DESC
     LIMIT 1`,
    deckId,
    ...dc.params
  );
  return row ?? null;
}

// ---------- Time series ----------

// Weekly top-32 appearance counts for a single deck across the season window.
// Weeks are Monday-anchored ISO weeks ("YYYY-MM-DD" of the Monday).
export function getDeckTimeSeries(
  deckId: string,
  filter: SeasonFilter
): Array<{ week: string; appearances: number }> {
  const dc = dateClause(filter);
  const rows = queryAll<{ date: string }>(
    `SELECT t.date AS date
     FROM standing s
     JOIN tournament t ON t.id = s.tournament_id
     WHERE t.eligible = 1 AND s.deck_id = ? AND s.placing <= 32${dc.sql}
     ORDER BY t.date ASC`,
    deckId,
    ...dc.params
  );
  if (rows.length === 0) return [];

  const buckets = new Map<string, number>();
  for (const r of rows) {
    const key = mondayOf(r.date);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const keys = [...buckets.keys()].sort();
  const start = new Date(keys[0] + "T00:00:00Z");
  const end = new Date(keys[keys.length - 1] + "T00:00:00Z");
  const out: Array<{ week: string; appearances: number }> = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 7)) {
    const k = d.toISOString().slice(0, 10);
    out.push({ week: k, appearances: buckets.get(k) ?? 0 });
  }
  return out;
}

function mondayOf(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}
