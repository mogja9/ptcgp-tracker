// Pokémon TCG Pocket competitive seasons.
//
// A "season" runs from the release date of a main expansion through the day
// before the next main expansion drops. Mini-sets (e.g. A2a, A2b) belong to
// the parent season - this matches how the yuki_1chiban spreadsheet groups
// them (A2-A2b, A3-A3b, A4-A4b, B1, B2, B3).
//
// Dates are inclusive `start`, exclusive `end`. `end: null` means "ongoing".
//
// If a new expansion drops, append a row here and set the previous season's
// `end` to the new release date - that's the only change needed.

export type Season = {
  id: string;
  name: string;
  start: string; // ISO YYYY-MM-DD (inclusive)
  end: string | null; // ISO YYYY-MM-DD (exclusive)
};

export const SEASONS: Season[] = [
  { id: "A1", name: "A1 - Genetic Apex",         start: "2024-10-30", end: "2025-01-30" },
  { id: "A2", name: "A2 - Space-Time Smackdown", start: "2025-01-30", end: "2025-04-30" },
  { id: "A3", name: "A3 - Celestial Guardians",  start: "2025-04-30", end: "2025-07-30" },
  { id: "A4", name: "A4 - Wisdom of Sea & Sky",  start: "2025-07-30", end: "2026-01-01" },
  { id: "B1", name: "B1 - Tropical Trials",      start: "2026-01-01", end: "2026-02-15" },
  { id: "B2", name: "B2 - Phantasmal Flames",    start: "2026-02-15", end: "2026-05-01" },
  { id: "B3", name: "B3 - Eclipse",              start: "2026-05-01", end: null         },
];

export const ALL_SEASONS_ID = "all";

export type SeasonFilter =
  | { kind: "season"; season: Season }
  | { kind: "all" };

export function getCurrentSeason(now: Date = new Date()): Season {
  const today = now.toISOString().slice(0, 10);
  for (let i = SEASONS.length - 1; i >= 0; i--) {
    const s = SEASONS[i];
    if (s.start <= today && (s.end == null || today < s.end)) return s;
  }
  return SEASONS[SEASONS.length - 1];
}

export function getSeasonById(id: string): Season | null {
  return SEASONS.find((s) => s.id === id) ?? null;
}

// Parse the `season` query param into a filter. Unknown values fall back to
// the current season. "all" is the only way to get the across-time view.
export function parseSeasonParam(raw?: string | string[]): SeasonFilter {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === ALL_SEASONS_ID) return { kind: "all" };
  if (v) {
    const s = getSeasonById(v);
    if (s) return { kind: "season", season: s };
  }
  return { kind: "season", season: getCurrentSeason() };
}

// SQL date range for the filter; null bounds mean "open-ended".
export function filterRange(f: SeasonFilter): { start: string | null; end: string | null } {
  if (f.kind === "all") return { start: null, end: null };
  return { start: f.season.start, end: f.season.end };
}

export function filterLabel(f: SeasonFilter): string {
  return f.kind === "all" ? "All seasons" : f.season.name;
}

export function filterShortLabel(f: SeasonFilter): string {
  return f.kind === "all" ? "All" : f.season.id;
}
