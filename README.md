# ptcgp-tracker

A self-hosted competitive tracker for **Pokémon TCG Pocket**, built on the
public Limitless TCG API. Player leaderboards, deck tier lists, country
rankings, and full tournament standings - all season-filtered, with the
across-time view available as opt-in.

The methodology mirrors the well-known [@yuki_1chiban Pocket rankings
spreadsheet](https://x.com/yuki_1chiban): only tournaments with **64+ players**,
**decklists required**, and **no special rules** are counted, and each player's
season total is the sum of their **best 10 results**.

> This project provides the tool. **You run your own instance against your own
> data.** No data is shipped with the repo - the database file is built locally
> by the sync script, and an optional API key (if you have one) stays on your
> machine.

---

## Features

- **Player rankings** - best-10 season totals with full placing-bucket counts (1st / 2nd / Top 4 / 8 / 16 / 32 / 64 / 128 / 256).
- **Per-player history** - every tournament a player has cashed in, with deck, record, and points.
- **Deck tier list** - SS / S / A / B / C / D tiers based on share of top-32 finishes.
- **Per-deck pilot leaderboard** - "who is the best ___ player" view, one per archetype.
- **Country rankings** - totals + each country's top players.
- **Tournament browser** - recent eligible events with full standings.
- **Season selector** - A1 → B3, plus an opt-in "All seasons" view. Default is the current season; nothing aggregates across seasons unless the user chooses it.

## Stack

- [Next.js 15](https://nextjs.org/) with the App Router, React 19, TypeScript.
- [Tailwind CSS](https://tailwindcss.com/) for styling.
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for the local cache.
- The [Limitless TCG public API](https://docs.limitlesstcg.com/developer.html) for data (game id `POCKET`).

Server components throughout. The browser ships no JavaScript at all on most
routes - the only client component is the season picker dropdown.

## Quick start

```bash
git clone https://github.com/mogja9/ptcgp-tracker.git
cd ptcgp-tracker
npm install

# Pull the most recent tournaments into the local SQLite cache.
# 1 page = up to 50 events. The script paces requests to stay under the
# unauthenticated rate limit (50 req / 5 min). 5 pages ≈ 30 minutes.
npm run sync

# Start the dev server. By default it listens on http://localhost:3001.
npm run dev
```

To go deeper into the archive:

```bash
PAGES=20 npm run sync     # ~20 pages × 50 events ≈ 1000 tournaments
PAGES=50 npm run sync     # further back; takes a few hours unauthenticated
FRESH=1 npm run sync      # refetch standings for events already cached
```

## Configuration

Copy `.env.example` to `.env` if you have a Limitless API key.

```bash
cp .env.example .env
```

```env
LIMITLESS_API_KEY=        # optional, raises the rate limit
```

The Limitless endpoints this project hits (`/api/tournaments`,
`/api/tournaments/{id}/details`, `/api/tournaments/{id}/standings`) all work
**without authentication** - a key is only needed if you want to sync faster
than 50 requests per 5 minutes, or if you also want to pull archetype
categorization rules from `/api/games/POCKET/decks`.

Apply for a key at <https://play.limitlesstcg.com/account/settings/api>.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server on port **3001**. |
| `npm run build` | Production build. |
| `npm run start` | Run the production build on port **3001**. |
| `npm run sync` | Pull tournaments + standings from Limitless into `data/pocket.db`. Honors `PAGES=N` and `FRESH=1`. |

## How the rankings work

Each tournament is evaluated against the eligibility filter
([`src/lib/rankings.ts`](src/lib/rankings.ts)):

- ≥ 64 players
- Decklists required
- Public, no banned cards, no special rules

Per-placing points are computed from a transparent, configurable curve in
`src/lib/rankings.ts`. The base values scale by tournament size (log-space) and
get a small BO3 multiplier. The internal Limitless point curve isn't public,
so this is a faithful approximation - tweak the constants in
`BASE_BY_PLACING` and `sizeFactor()` if you have a closer fit.

A player's season total is the sum of their **10 highest tournament point
values** in that season (see `best10()` in the same file).

## Seasons

Defined in [`src/lib/seasons.ts`](src/lib/seasons.ts):

- A1 - Genetic Apex
- A2 - Space-Time Smackdown
- A3 - Celestial Guardians
- A4 - Wisdom of Sea & Sky
- B1 - Tropical Trials
- B2 - Phantasmal Flames
- B3 - Eclipse *(current)*

To add a new expansion, append one entry to `SEASONS` and set the previous
season's `end` to the new release date.

## Project layout

```
src/
  app/              Next.js App Router pages
    page.tsx          /                - player leaderboard
    players/[id]/     /players/<id>    - single-player history
    decks/            /decks           - tier list
    decks/[id]/       /decks/<id>      - archetype leaderboard
    countries/        /countries       - country rankings
    tournaments/      /tournaments     - recent tournaments
    tournaments/[id]/ /tournaments/<id>- final standings
  components/         Reusable UI (Shell, SeasonPicker, DeckIcon, ui primitives)
  lib/
    db.ts             SQLite open + schema bootstrap
    limitless.ts      API client, rate-limit aware
    rankings.ts       Eligibility filter + per-placing point math + best-10
    queries.ts        Page-level queries with season range filtering
    seasons.ts        Season definitions + filter parsing
    countries.ts      ISO-2 → flag + display name
    format.ts         Date / number / percent formatting
scripts/
  sync.ts             Paginate /tournaments?game=POCKET → write to data/pocket.db
```

## Production deploy

This project is a vanilla Next.js app. It runs anywhere Node 20+ runs:

- **Bare metal / VPS:** `npm run build && npm run start` (port 3001).
- **systemd / pm2:** wrap `npm run start`; schedule `npm run sync` on a cron (e.g. every 2 hours).
- **Docker:** standard Next.js Dockerfile works. Mount `data/` as a volume so the SQLite cache persists.
- **Vercel / Netlify:** also works, but you'll need to host the SQLite file somewhere accessible (Fly Volumes, Tigris, etc.) or migrate to Postgres.

There is no per-user state - the database is a read-only cache the sync
script writes. You can host this as a public site for your community without
any auth or per-user storage.

## Credits

- Data: [limitlesstcg.com](https://play.limitlesstcg.com/) - please consider supporting them.
- Methodology: [@yuki_1chiban on X](https://x.com/yuki_1chiban) and the public rankings spreadsheets they maintain.
- Pokémon, Pokémon TCG, and Pokémon TCG Pocket are © Nintendo / Creatures / GAME FREAK. This project is unofficial and not affiliated.

## License

[MIT](LICENSE)
