import { queryAll, queryOne, getMeta } from "../db";
import { SEASONS, type SeasonFilter } from "../seasons";
import { dateClause } from "./common";

type StatsRow = { eligibleTournaments: number; distinctPlayers: number };

export function getStats(filter?: SeasonFilter) {
  if (!filter) {
    const row = queryOne<StatsRow>(
      `SELECT (SELECT COUNT(*) FROM tournament WHERE eligible = 1) AS eligibleTournaments,
              (SELECT COUNT(DISTINCT s.player_id)
                 FROM standing s
                 JOIN tournament t ON t.id = s.tournament_id
                 WHERE t.eligible = 1) AS distinctPlayers`
    );
    return {
      eligibleTournaments: row?.eligibleTournaments ?? 0,
      distinctPlayers: row?.distinctPlayers ?? 0,
      lastSync: getMeta("last_sync"),
    };
  }
  const dc = dateClause(filter);
  // Two queries: composing them with subqueries works but the dateClause is
  // applied to a `tournament t` alias, and the subquery alias scope makes the
  // bind ordering tricky. Two prep'd calls is fine; both hit the eligible+date
  // index.
  const e = queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM tournament t WHERE t.eligible = 1${dc.sql}`,
    ...dc.params
  );
  const p = queryOne<{ c: number }>(
    `SELECT COUNT(DISTINCT s.player_id) AS c
       FROM standing s JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1${dc.sql}`,
    ...dc.params
  );
  return {
    eligibleTournaments: e?.c ?? 0,
    distinctPlayers: p?.c ?? 0,
    lastSync: getMeta("last_sync"),
  };
}

// Which seasons have any data? Used by the UI to dim-out empty options.
export function getSeasonsWithData(): Set<string> {
  const rows = queryAll<{ date: string }>(
    `SELECT date FROM tournament WHERE eligible = 1`
  );
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
