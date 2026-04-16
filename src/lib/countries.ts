// ISO-3166-1 alpha-2 → flag emoji and a human-readable name.
// Players whose Limitless profile has no country come through as null/empty;
// we surface them as "Not listed" with a neutral flag rather than a broken
// glyph or "??".

const NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", MX: "Mexico", AR: "Argentina", BR: "Brazil",
  CL: "Chile", CO: "Colombia", PE: "Peru", UY: "Uruguay", VE: "Venezuela",
  GB: "United Kingdom", IE: "Ireland", FR: "France", DE: "Germany", IT: "Italy",
  ES: "Spain", PT: "Portugal", NL: "Netherlands", BE: "Belgium", LU: "Luxembourg",
  CH: "Switzerland", AT: "Austria", PL: "Poland", CZ: "Czechia", SK: "Slovakia",
  HU: "Hungary", RO: "Romania", BG: "Bulgaria", GR: "Greece", FI: "Finland",
  SE: "Sweden", NO: "Norway", DK: "Denmark", IS: "Iceland", EE: "Estonia",
  LV: "Latvia", LT: "Lithuania", UA: "Ukraine", RU: "Russia", TR: "Turkey",
  IL: "Israel", SA: "Saudi Arabia", AE: "United Arab Emirates", JP: "Japan",
  KR: "South Korea", CN: "China", TW: "Taiwan", HK: "Hong Kong", SG: "Singapore",
  MY: "Malaysia", TH: "Thailand", VN: "Vietnam", PH: "Philippines", ID: "Indonesia",
  IN: "India", AU: "Australia", NZ: "New Zealand", ZA: "South Africa",
};

// Sentinel used in aggregations when the API gives no country for a player.
export const UNKNOWN_CC = "XX";

function normalize(cc?: string | null): string | null {
  if (!cc) return null;
  const v = cc.trim().toUpperCase();
  if (!v || v === UNKNOWN_CC || v === "??") return null;
  if (v.length !== 2) return null;
  return v;
}

export function flagEmoji(cc?: string | null): string {
  const v = normalize(cc);
  if (!v) return "🏳️";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return String.fromCodePoint(A + (v.charCodeAt(0) - a), A + (v.charCodeAt(1) - a));
}

export function countryName(cc?: string | null) {
  const v = normalize(cc);
  if (!v) return "Not listed";
  return NAMES[v] ?? v;
}

export function isKnownCountry(cc?: string | null) {
  return normalize(cc) != null;
}
