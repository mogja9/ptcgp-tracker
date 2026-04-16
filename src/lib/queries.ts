import { getDb, getMeta } from "./db";
import { best10, bucketFor, type PlacingBucket } from "./rankings";
import { filterRange, type SeasonFilter } from "./seasons";
import { UNKNOWN_CC } from "./countries";

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

export type TournamentSummary = {
  id: string;
  name: string;
  date: string;
  players: number;
  matchFormat: string | null;
  structure: string | null;
  organizerName: string | null;
  organizerLogo: string | null;
};

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

const EMPTY_BUCKETS: Record<PlacingBucket, number> = {
  "1ST": 0, "2ND": 0, TOP4: 0, TOP8: 0, TOP16: 0, TOP32: 0,
  TOP64: 0, TOP128: 0, TOP256: 0,
};

// Build a `WHERE` fragment + params that constrains `tournament.date` to a
// season window. Returns an empty fragment when the filter spans all time.
function dateClause(f: SeasonFilter, alias = "t"): { sql: string; params: string[] } {
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

// ---------- Leaderboard ----------

type RawStanding = {
  player_id: string;
  display_name: string;
  country: string | null;
  placing: number;
  points: number;
};

export function getLeaderboard(filter: SeasonFilter, limit = 200): LeaderboardRow[] {
  const dc = dateClause(filter);
  const rows = getDb()
    .prepare(
      `SELECT s.player_id, s.display_name, s.country, s.placing, s.points
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1${dc.sql}`
    )
    .all(...dc.params) as RawStanding[];

  type Bucket = {
    playerId: string;
    displayName: string;
    country: string | null;
    points: number[];
    buckets: Record<PlacingBucket, number>;
  };

  const byPlayer = new Map<string, Bucket>();
  for (const r of rows) {
    let b = byPlayer.get(r.player_id);
    if (!b) {
      b = {
        playerId: r.player_id,
        displayName: r.display_name,
        country: r.country,
        points: [],
        buckets: { ...EMPTY_BUCKETS },
      };
      byPlayer.set(r.player_id, b);
    }
    b.points.push(r.points);
    if (r.display_name && r.display_name !== b.displayName) {
      b.displayName = r.display_name;
    }
    if (!b.country && r.country) b.country = r.country;
    const bk = bucketFor(r.placing);
    if (bk) b.buckets[bk] += 1;
  }

  const all = Array.from(byPlayer.values()).map((b) => {
    const sorted = [...b.points].sort((a, b) => b - a);
    return {
      playerId: b.playerId,
      displayName: b.displayName,
      country: b.country,
      totalPoints: best10(sorted),
      appearances: b.points.length,
      byBucket: b.buckets,
      best10Points: sorted.slice(0, 10),
    };
  });

  all.sort((a, b) => b.totalPoints - a.totalPoints || a.appearances - b.appearances);
  return all.slice(0, limit).map((row, i) => ({ rank: i + 1, ...row }));
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
  const leaderboard = getLeaderboard(filter, 5000);
  const byCountry = new Map<string, CountryRow>();
  for (const p of leaderboard) {
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
  for (const r of out) r.topPlayers.sort((a, b) => b.points - a.points);
  out.sort((a, b) => b.totalPoints - a.totalPoints);
  return out.map((row, i) => ({ ...row, rank: i + 1 }));
}

// ---------- Tournaments ----------

export function getRecentTournaments(filter: SeasonFilter, limit = 50): TournamentSummary[] {
  const dc = dateClause(filter);
  return getDb()
    .prepare(
      `SELECT id, name, date, players, match_format AS matchFormat,
              structure, organizer_name AS organizerName, organizer_logo AS organizerLogo
       FROM tournament t
       WHERE t.eligible = 1${dc.sql}
       ORDER BY date DESC
       LIMIT ?`
    )
    .all(...dc.params, limit) as TournamentSummary[];
}

export function getTournament(id: string) {
  const t = getDb()
    .prepare(
      `SELECT id, name, date, players, match_format AS matchFormat,
              structure, organizer_name AS organizerName, organizer_logo AS organizerLogo,
              eligible
       FROM tournament WHERE id = ?`
    )
    .get(id) as (TournamentSummary & { eligible: number }) | undefined;
  if (!t) return null;

  const standings = getDb()
    .prepare(
      `SELECT placing, player_id AS playerId, display_name AS displayName, country,
              wins, losses, ties,
              deck_id AS deckId, deck_name AS deckName, deck_icon_a AS iconA, deck_icon_b AS iconB,
              points
       FROM standing
       WHERE tournament_id = ?
       ORDER BY placing ASC`
    )
    .all(id) as Array<{
      placing: number;
      playerId: string;
      displayName: string;
      country: string | null;
      wins: number; losses: number; ties: number;
      deckId: string | null; deckName: string | null;
      iconA: string | null; iconB: string | null;
      points: number;
    }>;
  return { ...t, standings };
}

// ---------- Decks ----------

type DeckRow = {
  deck_id: string | null;
  deck_name: string | null;
  icon_a: string | null;
  icon_b: string | null;
  placing: number;
};

export function getDeckRollup(filter: SeasonFilter, limit = 100): DeckSummary[] {
  const dc = dateClause(filter);
  const rows = getDb()
    .prepare(
      `SELECT s.deck_id, s.deck_name, s.deck_icon_a AS icon_a, s.deck_icon_b AS icon_b, s.placing
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1 AND s.deck_id IS NOT NULL${dc.sql}`
    )
    .all(...dc.params) as DeckRow[];

  const byDeck = new Map<string, DeckSummary>();
  for (const r of rows) {
    const key = r.deck_id!;
    let d = byDeck.get(key);
    if (!d) {
      d = {
        deckId: key,
        deckName: r.deck_name ?? key,
        iconA: r.icon_a,
        iconB: r.icon_b,
        appearances: 0,
        top1: 0, top2: 0, top4: 0, top8: 0, top16: 0, top32: 0,
      };
      byDeck.set(key, d);
    }
    d.appearances += 1;
    if (r.placing === 1) d.top1 += 1;
    if (r.placing === 2) d.top2 += 1;
    if (r.placing <= 4) d.top4 += 1;
    if (r.placing <= 8) d.top8 += 1;
    if (r.placing <= 16) d.top16 += 1;
    if (r.placing <= 32) d.top32 += 1;
  }
  const out = Array.from(byDeck.values());
  out.sort((a, b) => b.appearances - a.appearances);
  return out.slice(0, limit);
}

// Tier list math - uses the season window directly (no extra `windowDays`).
export type TierLetter = "SS" | "S" | "A" | "B" | "C" | "D";

export type TierDeck = DeckSummary & {
  tier: TierLetter;
  share: number;
};

export function getTierList(filter: SeasonFilter): TierDeck[] {
  const dc = dateClause(filter);
  const rows = getDb()
    .prepare(
      `SELECT s.deck_id, s.deck_name, s.deck_icon_a AS icon_a, s.deck_icon_b AS icon_b, s.placing
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1 AND s.deck_id IS NOT NULL${dc.sql}
         AND s.placing <= 32`
    )
    .all(...dc.params) as DeckRow[];

  const byDeck = new Map<string, DeckSummary>();
  let total = 0;
  for (const r of rows) {
    total += 1;
    const key = r.deck_id!;
    let d = byDeck.get(key);
    if (!d) {
      d = {
        deckId: key,
        deckName: r.deck_name ?? key,
        iconA: r.icon_a,
        iconB: r.icon_b,
        appearances: 0,
        top1: 0, top2: 0, top4: 0, top8: 0, top16: 0, top32: 0,
      };
      byDeck.set(key, d);
    }
    d.appearances += 1;
    if (r.placing === 1) d.top1 += 1;
    if (r.placing === 2) d.top2 += 1;
    if (r.placing <= 4) d.top4 += 1;
    if (r.placing <= 8) d.top8 += 1;
    if (r.placing <= 16) d.top16 += 1;
    if (r.placing <= 32) d.top32 += 1;
  }
  if (total === 0) return [];

  const decks = Array.from(byDeck.values()).map<TierDeck>((d) => {
    const share = d.appearances / total;
    let tier: TierLetter = "D";
    if (share >= 0.3) tier = "SS";
    else if (share >= 0.15) tier = "S";
    else if (share >= 0.1) tier = "A";
    else if (share >= 0.05) tier = "B";
    else if (share >= 0.01) tier = "C";
    return { ...d, tier, share };
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

export function getArchetypeLeaderboard(deckId: string, filter: SeasonFilter): ArchetypePlayer[] {
  const dc = dateClause(filter);
  const rows = getDb()
    .prepare(
      `SELECT s.player_id AS playerId, s.display_name AS displayName, s.country,
              s.placing, s.points, s.wins, s.losses, s.ties
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1 AND s.deck_id = ?${dc.sql}`
    )
    .all(deckId, ...dc.params) as Array<{
      playerId: string; displayName: string; country: string | null;
      placing: number; points: number; wins: number; losses: number; ties: number;
    }>;

  type Bucket = {
    playerId: string; displayName: string; country: string | null;
    points: number[]; w: number; l: number; ti: number;
    top1: number; top2: number; top4: number;
  };
  const byP = new Map<string, Bucket>();
  for (const r of rows) {
    let b = byP.get(r.playerId);
    if (!b) {
      b = {
        playerId: r.playerId, displayName: r.displayName, country: r.country,
        points: [], w: 0, l: 0, ti: 0, top1: 0, top2: 0, top4: 0,
      };
      byP.set(r.playerId, b);
    }
    if (!b.country && r.country) b.country = r.country;
    b.points.push(r.points);
    b.w += r.wins; b.l += r.losses; b.ti += r.ties;
    if (r.placing === 1) b.top1 += 1;
    if (r.placing === 2) b.top2 += 1;
    if (r.placing <= 4) b.top4 += 1;
  }
  const out: ArchetypePlayer[] = Array.from(byP.values()).map((b) => {
    const games = b.w + b.l + b.ti;
    return {
      rank: 0,
      playerId: b.playerId,
      displayName: b.displayName,
      country: b.country,
      appearances: b.points.length,
      totalPoints: best10(b.points),
      winRate: games ? (b.w + b.ti * 0.5) / games : 0,
      top1: b.top1, top2: b.top2, top4: b.top4,
    };
  });
  out.sort((a, b) => b.totalPoints - a.totalPoints);
  return out.map((p, i) => ({ ...p, rank: i + 1 }));
}

// ---------- Player detail ----------

export function getPlayer(playerId: string, filter: SeasonFilter): PlayerStats | null {
  const dc = dateClause(filter);
  const rows = getDb()
    .prepare(
      `SELECT s.placing, s.points, s.wins, s.losses, s.ties,
              s.deck_id AS deckId, s.deck_name AS deckName,
              s.deck_icon_a AS iconA, s.deck_icon_b AS iconB,
              s.display_name AS displayName, s.country,
              t.id AS tournamentId, t.name AS tournamentName, t.date,
              t.match_format AS matchFormat, t.players
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE s.player_id = ? AND t.eligible = 1${dc.sql}
       ORDER BY t.date DESC`
    )
    .all(playerId, ...dc.params) as Array<{
      placing: number; points: number; wins: number; losses: number; ties: number;
      deckId: string | null; deckName: string | null; iconA: string | null; iconB: string | null;
      displayName: string; country: string | null;
      tournamentId: string; tournamentName: string; date: string;
      matchFormat: string | null; players: number;
    }>;
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

// ---------- Misc ----------

export function getStats(filter?: SeasonFilter) {
  const db = getDb();
  if (!filter) {
    const e = db.prepare(`SELECT COUNT(*) AS c FROM tournament WHERE eligible = 1`).get() as { c: number };
    const p = db.prepare(`SELECT COUNT(DISTINCT player_id) AS c FROM standing s JOIN tournament t ON t.id = s.tournament_id WHERE t.eligible = 1`).get() as { c: number };
    return { eligibleTournaments: e.c, distinctPlayers: p.c, lastSync: getMeta("last_sync") };
  }
  const dc = dateClause(filter);
  const e = db.prepare(`SELECT COUNT(*) AS c FROM tournament t WHERE t.eligible = 1${dc.sql}`).get(...dc.params) as { c: number };
  const p = db.prepare(
    `SELECT COUNT(DISTINCT s.player_id) AS c
       FROM standing s JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1${dc.sql}`
  ).get(...dc.params) as { c: number };
  return { eligibleTournaments: e.c, distinctPlayers: p.c, lastSync: getMeta("last_sync") };
}

// Which seasons have any data? Used by the UI to dim-out empty options.
export function getSeasonsWithData(): Set<string> {
  const rows = getDb().prepare(`SELECT date FROM tournament WHERE eligible = 1`).all() as { date: string }[];
  // imported lazily to avoid a circular import at module load
  const { SEASONS } = require("./seasons") as typeof import("./seasons");
  const out = new Set<string>();
  for (const r of rows) {
    const d = r.date.slice(0, 10);
    for (const s of SEASONS) {
      if (s.start <= d && (s.end == null || d < s.end)) {
        out.add(s.id);
        break;
      }
    }
  }
  return out;
}
