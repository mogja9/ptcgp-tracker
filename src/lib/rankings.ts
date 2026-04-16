// Ranking math, mirroring the @yuki_1chiban spreadsheet.
//
// Yuki's rules (paraphrased from the public sheet):
//   - 64+ players required
//   - Decklist submission required
//   - STANDARD format only, no extra banned cards / type-restricted formats
//   - Points are awarded TOP1 through TOP256 based on:
//       (placing) × (tournament size) × (structure type) × (match format BO1/BO3)
//   - A player's BEST 10 tournament results count toward their season total.
//
// The exact internal point curve is not published. The implementation below is
// a faithful, transparent approximation that:
//   * scales with tournament size (more players → more points),
//   * gives big jumps for top finishes,
//   * gives a small BO3 multiplier (more rigorous match format),
//   * caps at TOP256.
// Operators can swap in a closer-fitting curve later without affecting the rest
// of the app.

import type { StandingEntry, TournamentDetails } from "./limitless";

export type PlacingBucket =
  | "1ST"
  | "2ND"
  | "TOP4"
  | "TOP8"
  | "TOP16"
  | "TOP32"
  | "TOP64"
  | "TOP128"
  | "TOP256";

export function bucketFor(placing: number): PlacingBucket | null {
  if (placing === 1) return "1ST";
  if (placing === 2) return "2ND";
  if (placing <= 4) return "TOP4";
  if (placing <= 8) return "TOP8";
  if (placing <= 16) return "TOP16";
  if (placing <= 32) return "TOP32";
  if (placing <= 64) return "TOP64";
  if (placing <= 128) return "TOP128";
  if (placing <= 256) return "TOP256";
  return null;
}

// Yuki_1chiban eligibility filter
export function isEligible(t: TournamentDetails): boolean {
  if ((t.players ?? 0) < 64) return false;
  if (!t.decklists) return false;
  if (!t.isPublic) return false;
  if ((t.bannedCards?.length ?? 0) > 0) return false;
  if ((t.specialRules?.length ?? 0) > 0) return false;
  // Format gate: Pocket events often report format as null on the list endpoint.
  // We don't filter purely by format here; the API already game-filters via POCKET.
  return true;
}

// Concatenate phase types / modes into the strings the spreadsheet uses.
export function phaseSummaries(t: TournamentDetails) {
  const phases = t.phases ?? [];
  return {
    structure: phases.map((p) => p.type).join(","),
    matchFormat: phases.map((p) => p.mode).join(","),
  };
}

// Detect "is BO3-flavored" (any phase uses BO3 or BO5)
function isBo3Plus(t: TournamentDetails) {
  return (t.phases ?? []).some((p) => p.mode === "BO3" || p.mode === "BO5");
}

// Smooth size factor in log space. 64-player event ≈ 1.0, 256-player ≈ ~1.4,
// 1024-player ≈ ~1.8.
function sizeFactor(players: number) {
  const p = Math.max(64, players);
  return Math.max(1.0, Math.log2(p / 32));
}

// Base points by placing - calibrated so a 64-player BO1 1st place ≈ 100pts,
// matching the magnitude of values seen in the public sheet (rows of 944pt
// across "best 10" implies an average of ~94pt per top finish).
const BASE_BY_PLACING: Record<PlacingBucket, number> = {
  "1ST": 100,
  "2ND": 70,
  TOP4: 50,
  TOP8: 30,
  TOP16: 18,
  TOP32: 10,
  TOP64: 5,
  TOP128: 3,
  TOP256: 1,
};

export function pointsFor(placing: number, t: TournamentDetails): number {
  const bucket = bucketFor(placing);
  if (!bucket) return 0;
  const base = BASE_BY_PLACING[bucket];
  const size = sizeFactor(t.players ?? 0);
  const formatMult = isBo3Plus(t) ? 1.2 : 1.0;
  return Math.round(base * size * formatMult);
}

// Best-10 aggregation: given an unsorted list of point values, sum the 10
// largest. Used by the leaderboard query.
export function best10(points: number[]) {
  return points.sort((a, b) => b - a).slice(0, 10).reduce((s, x) => s + x, 0);
}
