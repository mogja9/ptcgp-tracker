// Public query surface. Implementations live in ./queries/*. This barrel
// keeps existing `@/lib/queries` imports stable.

export type { LeaderboardRow, CountryRow } from "./queries/leaderboard";
export { getLeaderboard, getCountryRankings } from "./queries/leaderboard";

export type { TournamentSummary } from "./queries/tournaments";
export { getRecentTournaments, getTournament } from "./queries/tournaments";

export type {
  DeckSummary,
  ArchetypePlayer,
  TierLetter,
  TierDeck,
} from "./queries/decks";
export {
  getDeckRollup,
  getDeckById,
  getTierList,
  getArchetypeLeaderboard,
  getSampleDecklist,
  getDeckTimeSeries,
} from "./queries/decks";

export type { MatchupCell, MatchupMatrix } from "./queries/matchups";
export { getMatchupMatrix, getDeckMatchupHighlights } from "./queries/matchups";

export type { PlayerStats, PlayerSearchResult } from "./queries/players";
export { getPlayer, searchPlayers } from "./queries/players";

export type { CardInclusionRow } from "./queries/cards";
export { getCardInclusion } from "./queries/cards";

export { getStats, getSeasonsWithData } from "./queries/stats";
