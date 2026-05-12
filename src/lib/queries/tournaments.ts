import { queryAll, queryOne } from "../db";
import type { SeasonFilter } from "../seasons";
import { dateClause } from "./common";

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

export function getRecentTournaments(
  filter: SeasonFilter,
  limit = 50
): TournamentSummary[] {
  const dc = dateClause(filter);
  return queryAll<TournamentSummary>(
    `SELECT id, name, date, players, match_format AS matchFormat,
            structure, organizer_name AS organizerName, organizer_logo AS organizerLogo
     FROM tournament t
     WHERE t.eligible = 1${dc.sql}
     ORDER BY date DESC
     LIMIT ?`,
    ...dc.params,
    limit
  );
}

export function getTournament(id: string) {
  const t = queryOne<TournamentSummary & { eligible: number }>(
    `SELECT id, name, date, players, match_format AS matchFormat,
            structure, organizer_name AS organizerName, organizer_logo AS organizerLogo,
            eligible
     FROM tournament WHERE id = ?`,
    id
  );
  if (!t) return null;

  const standings = queryAll<{
    placing: number;
    playerId: string;
    displayName: string;
    country: string | null;
    wins: number; losses: number; ties: number;
    deckId: string | null; deckName: string | null;
    iconA: string | null; iconB: string | null;
    decklistJson: string | null;
    points: number;
  }>(
    `SELECT placing, player_id AS playerId, display_name AS displayName, country,
            wins, losses, ties,
            deck_id AS deckId, deck_name AS deckName, deck_icon_a AS iconA, deck_icon_b AS iconB,
            decklist_json AS decklistJson,
            points
     FROM standing
     WHERE tournament_id = ?
     ORDER BY placing ASC`,
    id
  );
  return { ...t, standings };
}
