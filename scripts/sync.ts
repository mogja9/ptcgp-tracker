// Sync Pokémon TCG Pocket tournaments + standings into the local SQLite cache.
// Pace requests to stay under the public rate limit (50 / 5min).
//
// Usage:
//   npm run sync             # sync the most recent ~250 tournaments
//   PAGES=10 npm run sync    # sync 10 pages × 50 = 500 tournaments
//   FRESH=1 npm run sync     # ignore "already synced" and refetch each
//
// Output goes to ./data/pocket.db

import { getDb, setMeta } from "../src/lib/db";
import {
  listTournaments,
  getTournamentDetails,
  getTournamentStandings,
  MIN_REQUEST_INTERVAL_MS,
  sleep,
  type StandingEntry,
  type TournamentDetails,
} from "../src/lib/limitless";
import { isEligible, phaseSummaries, pointsFor } from "../src/lib/rankings";

const PAGES = Number(process.env.PAGES ?? 5); // 5 × 50 = 250 events by default
const FRESH = process.env.FRESH === "1";

async function main() {
  const db = getDb();
  const seen = new Set(
    db.prepare(`SELECT id FROM tournament`).all().map((r: any) => r.id as string)
  );

  console.log(`Local DB has ${seen.size} tournaments cached.`);
  let added = 0;
  let lastReq = 0;

  async function paced<T>(fn: () => Promise<T>): Promise<T> {
    const wait = Math.max(0, lastReq + MIN_REQUEST_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    try {
      return await fn();
    } finally {
      lastReq = Date.now();
    }
  }

  for (let page = 1; page <= PAGES; page++) {
    const list = await paced(() =>
      listTournaments({ game: "POCKET", limit: 50, page })
    );
    if (!list || list.length === 0) {
      console.log(`Page ${page} empty - stopping.`);
      break;
    }
    console.log(`Page ${page}: ${list.length} tournaments`);

    for (const t of list) {
      if (!FRESH && seen.has(t.id)) continue;
      try {
        const details = await paced(() => getTournamentDetails(t.id));
        const eligible = isEligible(details);
        const { structure, matchFormat } = phaseSummaries(details);

        if (!eligible) {
          // Still cache the row so we don't refetch repeatedly
          upsertTournament(details, structure, matchFormat, false);
          seen.add(t.id);
          continue;
        }

        const standings = await paced(() => getTournamentStandings(t.id));
        upsertTournament(details, structure, matchFormat, true);
        replaceStandings(t.id, standings, details);
        seen.add(t.id);
        added++;
        console.log(`  + ${t.id}  ${details.name}  (${details.players} players)`);
      } catch (e: any) {
        console.warn(`  ! failed ${t.id}: ${e?.message ?? e}`);
      }
    }
  }

  setMeta("last_sync", new Date().toISOString());
  console.log(`Done. Added ${added} new eligible tournaments.`);
}

function upsertTournament(
  d: TournamentDetails,
  structure: string,
  matchFormat: string,
  eligible: boolean
) {
  getDb()
    .prepare(
      `INSERT INTO tournament (
        id, name, game, format, date, players, organizer_id, organizer_name, organizer_logo,
        decklists, is_online, is_public, structure, match_format, banned_count, special_count,
        eligible, synced_at
      ) VALUES (
        @id, @name, @game, @format, @date, @players, @oid, @oname, @ologo,
        @decklists, @online, @public, @structure, @matchFormat, @banned, @special,
        @eligible, @syncedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name           = excluded.name,
        format         = excluded.format,
        date           = excluded.date,
        players        = excluded.players,
        organizer_id   = excluded.organizer_id,
        organizer_name = excluded.organizer_name,
        organizer_logo = excluded.organizer_logo,
        decklists      = excluded.decklists,
        is_online      = excluded.is_online,
        is_public      = excluded.is_public,
        structure      = excluded.structure,
        match_format   = excluded.match_format,
        banned_count   = excluded.banned_count,
        special_count  = excluded.special_count,
        eligible       = excluded.eligible,
        synced_at      = excluded.synced_at`
    )
    .run({
      id: d.id,
      name: d.name,
      game: d.game,
      format: d.format,
      date: d.date,
      players: d.players,
      oid: d.organizer?.id ?? null,
      oname: d.organizer?.name ?? null,
      ologo: d.organizer?.logo ?? null,
      decklists: d.decklists ? 1 : 0,
      online: d.isOnline ? 1 : 0,
      public: d.isPublic ? 1 : 0,
      structure,
      matchFormat,
      banned: d.bannedCards?.length ?? 0,
      special: d.specialRules?.length ?? 0,
      eligible: eligible ? 1 : 0,
      syncedAt: new Date().toISOString(),
    });
}

function replaceStandings(
  tournamentId: string,
  standings: StandingEntry[],
  details: TournamentDetails
) {
  const db = getDb();
  const del = db.prepare(`DELETE FROM standing WHERE tournament_id = ?`);
  const ins = db.prepare(
    `INSERT INTO standing (
      tournament_id, player_id, display_name, country, placing,
      wins, losses, ties, drop_round,
      deck_id, deck_name, deck_icon_a, deck_icon_b, decklist_json, points
    ) VALUES (
      @t, @p, @dn, @c, @placing,
      @w, @l, @ti, @dr,
      @did, @dname, @ica, @icb, @dl, @pts
    )`
  );
  const trx = db.transaction((rows: StandingEntry[]) => {
    del.run(tournamentId);
    const seenPlayers = new Set<string>();
    for (const r of rows) {
      if (r.placing == null || !Number.isFinite(r.placing)) continue;
      const playerId = r.player ?? r.name ?? null;
      if (!playerId) continue;
      if (seenPlayers.has(playerId)) continue; // dedupe defensive
      seenPlayers.add(playerId);
      ins.run({
        t: tournamentId,
        p: playerId,
        dn: r.name ?? r.player ?? "Unknown",
        c: r.country ?? null,
        placing: r.placing,
        w: r.record?.wins ?? 0,
        l: r.record?.losses ?? 0,
        ti: r.record?.ties ?? 0,
        dr: r.drop ?? null,
        did: r.deck?.id ?? null,
        dname: r.deck?.name ?? null,
        ica: r.deck?.icons?.[0] ?? null,
        icb: r.deck?.icons?.[1] ?? null,
        dl: r.decklist ? JSON.stringify(r.decklist) : null,
        pts: pointsFor(r.placing, details),
      });
    }
  });
  trx(standings);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
