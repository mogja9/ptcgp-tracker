// Limitless TCG public API client (Pokémon TCG Pocket = game id "POCKET")
// Base: https://play.limitlesstcg.com/api
// Rate limit: 50 req / 5min (unauthenticated). Endpoints used here are all
// unauthenticated. Decklist categorization (/games/POCKET/decks) needs a key.

const BASE = "https://play.limitlesstcg.com/api";
const KEY = process.env.LIMITLESS_API_KEY;

export type TournamentListItem = {
  id: string;
  game: string;
  name: string;
  date: string;
  format: string | null;
  players: number;
  organizerId: number;
};

export type TournamentDetails = {
  id: string;
  game: string;
  format: string | null;
  name: string;
  date: string;
  players: number;
  organizer: { id: number; name: string; logo?: string | null };
  platform?: string | null;
  decklists: boolean;
  isPublic: boolean;
  isOnline: boolean;
  phases: Array<{ phase: number; type: string; rounds: number; mode: string }>;
  bannedCards: string[];
  specialRules: string[];
};

export type DeckEntry = { count: number; set: string; number: string; name: string };

export type StandingEntry = {
  player: string; // stable username
  name: string; // display name (can change)
  country?: string;
  placing: number;
  record: { wins: number; losses: number; ties: number };
  drop: number | null;
  deck?: { id?: string; name?: string; icons?: string[] };
  decklist?: { pokemon?: DeckEntry[]; trainer?: DeckEntry[]; energy?: DeckEntry[] };
};

export type PairingEntry = {
  round: number;
  phase: number;
  table: number | null;
  match?: string;
  player1: string;
  player2?: string;
  winner: string | number; // username | 0 (tie) | -1 (double loss)
};

// --- core fetch with retry + rate-limit awareness ---

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetchJSON<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${BASE}${path}`;
  const headers: Record<string, string> = {
    "user-agent": "pocket-tracker/0.1 (+local)",
    accept: "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (KEY) headers["X-Access-Key"] = KEY;

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { ...init, headers });
    if (res.status === 429) {
      const reset = Number(res.headers.get("ratelimit-reset") ?? res.headers.get("retry-after") ?? "10");
      const waitMs = Math.min(60_000, Math.max(2_000, reset * 1_000));
      console.warn(`429 from ${path} - sleeping ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    if (res.status >= 500) {
      const waitMs = 1_000 * Math.pow(2, attempt);
      console.warn(`${res.status} from ${path} - backoff ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new HttpError(res.status, `${res.status} ${res.statusText} for ${url}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
  throw new Error(`Gave up after retries: ${url}`);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- API surface ---

export async function listTournaments(opts: {
  game?: string;
  format?: string;
  organizerId?: number;
  limit?: number;
  page?: number;
} = {}): Promise<TournamentListItem[]> {
  const q = new URLSearchParams();
  q.set("game", opts.game ?? "POCKET");
  if (opts.format) q.set("format", opts.format);
  if (opts.organizerId != null) q.set("organizerId", String(opts.organizerId));
  q.set("limit", String(opts.limit ?? 50));
  if (opts.page != null) q.set("page", String(opts.page));
  return fetchJSON<TournamentListItem[]>(`/tournaments?${q.toString()}`);
}

export function getTournamentDetails(id: string) {
  return fetchJSON<TournamentDetails>(`/tournaments/${id}/details`);
}

export function getTournamentStandings(id: string) {
  return fetchJSON<StandingEntry[]>(`/tournaments/${id}/standings`);
}

export function getTournamentPairings(id: string) {
  return fetchJSON<PairingEntry[]>(`/tournaments/${id}/pairings`);
}

// Pace requests so we stay under 50 / 5min unauthenticated.
// 50 in 300s ⇒ one request per 6s minimum. We use 6.5s for headroom.
export const MIN_REQUEST_INTERVAL_MS = KEY ? 1_500 : 6_500;
