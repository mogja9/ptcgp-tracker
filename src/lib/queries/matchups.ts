import { queryAll } from "../db";
import type { SeasonFilter } from "../seasons";
import { dateClause } from "./common";

export type MatchupCell = {
  wins: number;    // row-deck wins, col-deck loses
  losses: number;  // col-deck wins
  ties: number;
  games: number;
  winRate: number; // (wins + 0.5*ties) / games
};

export type MatchupMatrix = {
  decks: Array<{
    deckId: string;
    deckName: string;
    iconA: string | null;
    iconB: string | null;
    appearances: number;
  }>;
  cells: MatchupCell[][];
  totalMatches: number;
};

// Build a deck-vs-deck winrate matrix from joined pairings + standings.
// Only includes decks meeting `minAppearances` (top-32 appearances in the
// season). The diagonal is the mirror match.
export function getMatchupMatrix(
  filter: SeasonFilter,
  opts: { minAppearances?: number; minGames?: number } = {}
): MatchupMatrix {
  const minAppearances = opts.minAppearances ?? 5;
  const minGames = opts.minGames ?? 1;
  const dc = dateClause(filter);

  // Aggregate every (deckA, deckB) pair-row.
  const rows = queryAll<{
    deckA: string;
    deckB: string;
    p1Wins: number;
    p2Wins: number;
    ties: number;
  }>(
    `SELECT s1.deck_id AS deckA,
            s2.deck_id AS deckB,
            SUM(CASE WHEN p.result = 'P1_WIN' THEN 1 ELSE 0 END) AS p1Wins,
            SUM(CASE WHEN p.result = 'P2_WIN' THEN 1 ELSE 0 END) AS p2Wins,
            SUM(CASE WHEN p.result = 'TIE'    THEN 1 ELSE 0 END) AS ties
       FROM pairing p
       JOIN tournament t  ON t.id = p.tournament_id
       JOIN standing  s1  ON s1.tournament_id = p.tournament_id AND s1.player_id = p.player1
       JOIN standing  s2  ON s2.tournament_id = p.tournament_id AND s2.player_id = p.player2
       WHERE p.result IN ('P1_WIN','P2_WIN','TIE')
         AND s1.deck_id IS NOT NULL AND s2.deck_id IS NOT NULL
         AND t.eligible = 1${dc.sql}
       GROUP BY s1.deck_id, s2.deck_id`,
    ...dc.params
  );

  // Aggregate symmetric counts: cell(X,Y).wins = X-as-p1 wins-vs-Y + X-as-p2 wins-vs-Y
  type Agg = { aWins: number; bWins: number; ties: number };
  const agg = new Map<string, Agg>();
  for (const r of rows) {
    if (r.deckA === r.deckB) continue; // mirror handled separately below
    const [lo, hi] = r.deckA < r.deckB ? [r.deckA, r.deckB] : [r.deckB, r.deckA];
    const key = `${lo}|${hi}`;
    const flip = r.deckA !== lo;
    const cur = agg.get(key) ?? { aWins: 0, bWins: 0, ties: 0 };
    if (!flip) {
      cur.aWins += r.p1Wins;
      cur.bWins += r.p2Wins;
    } else {
      cur.aWins += r.p2Wins;
      cur.bWins += r.p1Wins;
    }
    cur.ties += r.ties;
    agg.set(key, cur);
  }
  type Mirror = { games: number; ties: number };
  const mirror = new Map<string, Mirror>();
  for (const r of rows) {
    if (r.deckA !== r.deckB) continue;
    const m = mirror.get(r.deckA) ?? { games: 0, ties: 0 };
    m.games += r.p1Wins + r.p2Wins + r.ties;
    m.ties += r.ties;
    mirror.set(r.deckA, m);
  }

  // Pick the top decks by overall appearances (top-32 placings) for matrix axes.
  const deckRoll = queryAll<{
    deck_id: string;
    deck_name: string | null;
    icon_a: string | null;
    icon_b: string | null;
    appearances: number;
  }>(
    `SELECT s.deck_id, s.deck_name, s.deck_icon_a AS icon_a, s.deck_icon_b AS icon_b, COUNT(*) AS appearances
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1 AND s.deck_id IS NOT NULL AND s.placing <= 32${dc.sql}
       GROUP BY s.deck_id, s.deck_name
       HAVING appearances >= ?
       ORDER BY appearances DESC`,
    ...dc.params,
    minAppearances
  );

  const decks = deckRoll.map((d) => ({
    deckId: d.deck_id,
    deckName: d.deck_name ?? d.deck_id,
    iconA: d.icon_a,
    iconB: d.icon_b,
    appearances: d.appearances,
  }));
  const index = new Map(decks.map((d, i) => [d.deckId, i] as const));

  const n = decks.length;
  const cells: MatchupCell[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({ wins: 0, losses: 0, ties: 0, games: 0, winRate: 0.5 }))
  );

  let total = 0;
  for (const [key, v] of agg) {
    const [lo, hi] = key.split("|");
    const iA = index.get(lo);
    const iB = index.get(hi);
    if (iA == null || iB == null) continue;
    const games = v.aWins + v.bWins + v.ties;
    if (games < minGames) continue;
    total += games;
    const aWR = games ? (v.aWins + v.ties * 0.5) / games : 0.5;
    const bWR = 1 - aWR;
    cells[iA][iB] = { wins: v.aWins, losses: v.bWins, ties: v.ties, games, winRate: aWR };
    cells[iB][iA] = { wins: v.bWins, losses: v.aWins, ties: v.ties, games, winRate: bWR };
  }

  for (const [deckId, m] of mirror) {
    const i = index.get(deckId);
    if (i == null) continue;
    cells[i][i] = { wins: 0, losses: 0, ties: m.ties, games: m.games, winRate: 0.5 };
    total += m.games;
  }

  return { decks, cells, totalMatches: total };
}

// Best/worst matchups for a single deck. Scoped query: only pulls pairings
// where the target deck participated. Avoids building the full N x N matrix.
export function getDeckMatchupHighlights(
  deckId: string,
  filter: SeasonFilter,
  opts: { minGames?: number; topN?: number } = {}
): {
  best: Array<{ vs: { deckId: string; deckName: string; iconA: string | null; iconB: string | null }; winRate: number; games: number }>;
  worst: Array<{ vs: { deckId: string; deckName: string; iconA: string | null; iconB: string | null }; winRate: number; games: number }>;
  overallGames: number;
  overallWinRate: number;
} {
  const minGames = opts.minGames ?? 8;
  const topN = opts.topN ?? 5;
  const dc = dateClause(filter);

  // CTE picks the rows where exactly one side plays the target deck and
  // re-frames each result from the target deck's perspective. Mirrors
  // (deckId vs deckId) emit two CTE rows but are filtered out below by the
  // outer `oppDeckId != deckId` predicate.
  type Row = {
    oppDeckId: string;
    oppDeckName: string | null;
    oppIconA: string | null;
    oppIconB: string | null;
    wins: number;
    losses: number;
    ties: number;
  };
  const rows = queryAll<Row>(
    `WITH self_matches AS (
       SELECT p.tournament_id,
              CASE WHEN s1.player_id = p.player1 THEN p.player2 ELSE p.player1 END AS opp_id,
              CASE
                WHEN s1.player_id = p.player1
                  THEN CASE p.result WHEN 'P1_WIN' THEN 1 WHEN 'P2_WIN' THEN -1 ELSE 0 END
                ELSE CASE p.result WHEN 'P2_WIN' THEN 1 WHEN 'P1_WIN' THEN -1 ELSE 0 END
              END AS outcome
         FROM pairing p
         JOIN tournament t ON t.id = p.tournament_id
         JOIN standing s1 ON s1.tournament_id = p.tournament_id
                         AND s1.deck_id = ?
                         AND s1.player_id IN (p.player1, p.player2)
        WHERE t.eligible = 1 AND p.result IN ('P1_WIN','P2_WIN','TIE')${dc.sql}
     )
     SELECT s2.deck_id              AS oppDeckId,
            MAX(s2.deck_name)       AS oppDeckName,
            MAX(s2.deck_icon_a)     AS oppIconA,
            MAX(s2.deck_icon_b)     AS oppIconB,
            SUM(CASE WHEN sm.outcome =  1 THEN 1 ELSE 0 END) AS wins,
            SUM(CASE WHEN sm.outcome = -1 THEN 1 ELSE 0 END) AS losses,
            SUM(CASE WHEN sm.outcome =  0 THEN 1 ELSE 0 END) AS ties
       FROM self_matches sm
       JOIN standing s2 ON s2.tournament_id = sm.tournament_id
                       AND s2.player_id     = sm.opp_id
      WHERE s2.deck_id IS NOT NULL AND s2.deck_id != ?
      GROUP BY s2.deck_id`,
    deckId,
    ...dc.params,
    deckId
  );

  const ranked = rows
    .map((r) => {
      const games = r.wins + r.losses + r.ties;
      return {
        vs: {
          deckId: r.oppDeckId,
          deckName: r.oppDeckName ?? r.oppDeckId,
          iconA: r.oppIconA,
          iconB: r.oppIconB,
        },
        wins: r.wins,
        ties: r.ties,
        games,
        winRate: games ? (r.wins + r.ties * 0.5) / games : 0.5,
      };
    })
    .filter((x) => x.games >= minGames);

  let overallGames = 0;
  let weighted = 0;
  for (const x of ranked) {
    overallGames += x.games;
    weighted += x.wins + x.ties * 0.5;
  }

  const ascByWR = [...ranked].sort((a, b) => a.winRate - b.winRate);
  const worst = ascByWR.slice(0, topN).map((x) => ({
    vs: x.vs,
    winRate: x.winRate,
    games: x.games,
  }));
  const best = [...ascByWR]
    .reverse()
    .slice(0, topN)
    .map((x) => ({ vs: x.vs, winRate: x.winRate, games: x.games }));

  return {
    best,
    worst,
    overallGames,
    overallWinRate: overallGames ? weighted / overallGames : 0.5,
  };
}
