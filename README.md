# ptcgp-tracker

A self-hosted competitive tracker for **Pokémon TCG Pocket**, built on the
public Limitless TCG API. Player leaderboards, deck tier lists, deck-vs-deck
matchup matrix, card inclusion stats, country rankings, full tournament
standings with decklists, and a JSON API on top of it all.

The methodology mirrors the [@yuki_1chiban Pocket rankings
spreadsheet](https://x.com/yuki_1chiban): only tournaments with **64+
players**, **decklists required**, and **no special rules** are counted, and
each player's season total is the sum of their **best 10 results**.

> This project provides the tool. **You run your own instance against your own
> data.** No data ships with the repo - the SQLite cache is built locally by
> the sync script, and any API key you provide stays on your machine.

---

## Features

### Data
- **Player rankings** with best-10 season totals, full placing-bucket counts
  (1st / 2nd / Top 4 / 8 / 16 / 32 / 64 / 128 / 256), country flag, and a
  per-row sparkline of the player's best finishes.
- **Player profiles** with full tournament history, deck used per event,
  match record, and placing distribution badges. A star button on every row
  saves players to a localStorage **Following list** surfaced on the home
  page.
- **Header search** with type-ahead autocomplete (cmd/ctrl-K to focus).
  Backed by `/api/players/search`.
- **Tier list** (SS / S / A / B / C / D) based on share of top-32 finishes,
  per-season, with a link out to the matchup matrix.
- **Per-deck pages** include the top pilots leaderboard, a sample winning
  decklist (rendered card by card with set + number), a card-inclusion
  panel showing what fraction of lists run each card and the average copy
  count, a best/worst matchup widget, and a weekly meta-share line chart.
- **Matchup matrix** at `/decks/matchups` - deck-vs-deck winrates derived
  from every published pairing, color-coded for win/loss and shaded by
  sample-size confidence.
- **Country rankings** with sortable / filterable table and per-country top
  players. Players without a country code are grouped under *Not listed*.
- **Tournament browser** with eligibility-filtered listing. Click into any
  event for the final standings; **each standing row expands to show the
  full decklist** that placed.
- **Season selector** (A1 -> B3, plus opt-in "All seasons"). Default is
  always the current season, never an across-time aggregate, matching the
  reference spreadsheet's model.
- **Light / dark theme toggle** with a system-preference option that uses
  `prefers-color-scheme`. No flash on load.
- **Sortable + filterable tables** across the leaderboard, deck pilots, and
  country rankings. Click a column header to sort, type to filter.

### Ops
- **Public JSON API** under `/api/*` (leaderboard, decks, players,
  tournaments, countries, players/search, health) for Discord bots,
  dashboards, or other downstream tools.
- **Auto-sync** via `npm run sync:loop`, a Docker container, or a systemd
  timer with cron as a fallback - see [deploy/README.md](deploy/README.md).
- **Rate-aware sync** that paces unauthenticated calls under Limitless's
  50 req / 5min cap. A `SKIP_PAIRINGS=1` mode is available for thin runs.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript
- [Tailwind CSS](https://tailwindcss.com/) with CSS-variable theming
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for the local
  cache
- [Limitless TCG public API](https://docs.limitlesstcg.com/developer.html)
  for data (game id `POCKET`)

Server components throughout. The only client components are the season
picker, player search box, theme toggle, mobile drawer, favorites star, and
sortable table - everything else is plain HTML.

## Quick start

```bash
git clone https://github.com/mogja9/ptcgp-tracker.git
cd ptcgp-tracker
npm install

# Pull recent tournaments into the local SQLite cache. The script paces
# itself to stay under the 50 req / 5min public rate limit.
npm run sync                  # ~50 events, default 5 pages
PAGES=20 npm run sync         # ~1000 events; takes a few hours unauthenticated

# Start the dev server on port 3001
npm run dev
```

Open <http://localhost:3001>.

### Pairings

Pairings are pulled alongside standings, so `npm run sync` is enough. If you
already have tournaments synced from an older revision, run sync once more -
the script detects events that have standings but no pairings and backfills
only the missing slice (no re-downloading of details/standings).

## Configuration

Copy `.env.example` to `.env` if you have a Limitless API key.

```env
LIMITLESS_API_KEY=        # optional, lifts the rate limit
```

A key is only required for `/api/games/POCKET/decks` (archetype taxonomy)
and for higher throughput on the public endpoints. Everything this project
does works without one - it just runs slower. Apply at
<https://play.limitlesstcg.com/account/settings/api>.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server on port **3001**. |
| `npm run build` | Production build. |
| `npm run start` | Production server on port **3001**. |
| `npm run sync` | One-shot sync. Honors `PAGES=N`, `FRESH=1`, `SKIP_PAIRINGS=1`. |
| `npm run sync:loop` | Long-running wrapper that re-syncs every `INTERVAL_MINUTES` (default 120). |

## JSON API

Every page has a JSON twin under `/api/*`. Responses honor a `season=X`
query parameter just like the UI; omitting it returns the current season.

| Endpoint | Description |
| --- | --- |
| `GET /api/leaderboard?season=B3&limit=100` | Ranked player list with bucket counts. |
| `GET /api/decks?season=B3` | Tier list (decks + tier letters + share). |
| `GET /api/decks/[id]?season=B3` | Deck rollup + pilots + sample decklist. |
| `GET /api/countries?season=B3` | Country totals + each country's top players. |
| `GET /api/tournaments?season=B3&limit=50` | Recent eligible events. |
| `GET /api/tournaments/[id]` | Full standings (with decklists). |
| `GET /api/players/[id]?season=B3` | Player profile, history, win rate. |
| `GET /api/players/search?q=foo` | Type-ahead search (used by the header). |
| `GET /api/health` | Liveness probe with eligible count + last sync timestamp. |

All responses set `cache-control: public, max-age=60, stale-while-revalidate=240`
so a CDN or reverse proxy can shield the SQLite layer from spikes.

## How the rankings work

Each tournament is evaluated against the eligibility filter
([`src/lib/rankings.ts`](src/lib/rankings.ts)):

- 64+ players
- Decklists required
- Public, no banned cards, no special rules

Per-placing points come from a configurable curve in
`src/lib/rankings.ts`. Base values scale by tournament size (log-space)
with a small BO3 multiplier. Limitless's exact internal curve is not
public; tweak the constants in `BASE_BY_PLACING` and `sizeFactor()` if you
have a closer fit.

A player's season total is the sum of their **10 highest tournament point
values** in that season (see `best10()` in the same file).

## Matchups + card inclusion

The deck-vs-deck winrate matrix joins the cached `pairing` table with
`standing` on player id, then aggregates results symmetrically (so deck A
appearing as player1 in one match and player2 in another both contribute to
the same cell). Cells with fewer than 5 games are dimmed; cells are
color-coded by which side wins and shaded by sample-size confidence.

Card inclusion stats are computed from the `decklist_json` we cache on the
`standing` table. For each (set, number, name) tuple in an archetype's
lists, we report what fraction of lists include it at all and the mean
copy count per list that does.

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
  app/
    page.tsx                  /                  - leaderboard with sparklines
    players/[id]/             /players/<id>      - profile + tournament history
    decks/                    /decks             - tier list
    decks/[id]/               /decks/<id>        - archetype detail
                                                   (sample list, time-series,
                                                   matchups, card inclusion,
                                                   pilots)
    decks/matchups/           /decks/matchups    - full deck-vs-deck matrix
    countries/                /countries         - country rankings
    tournaments/              /tournaments       - recent events
    tournaments/[id]/         /tournaments/<id>  - final standings with
                                                   expandable decklists
    api/                      /api/*             - JSON endpoints
  components/                 Shell, SeasonPicker, MobileNav, PlayerSearch,
                              ThemeToggle, SortableTable, DeckIcon, Decklist,
                              Sparkline, LineChart, FavoriteStar,
                              FollowingRail, ui primitives
  lib/
    db.ts                     SQLite open + schema (tournament, standing,
                              pairing, sync_meta)
    limitless.ts              API client, rate-limit aware
    rankings.ts               Eligibility filter + placing math + best-10
    queries.ts                Page-level queries: leaderboard, tier list,
                              matchups, card inclusion, time series,
                              search, country aggregation
    seasons.ts                Season definitions + filter parsing
    countries.ts              ISO-2 -> flag + display name + sentinels
    favorites.ts              localStorage favorites hook + pub-sub
    format.ts                 Date / number / percent helpers
    api-helpers.ts            JSON response envelope + season parsing
scripts/
  sync.ts                     Paginate /tournaments?game=POCKET -> DB
  sync-loop.ts                Long-running wrapper for auto-sync
deploy/
  Dockerfile, docker-compose.yml  Docker recipes (see deploy/README.md)
  pocket-tracker.service          systemd unit for the web server
  pocket-tracker-sync.service     systemd one-shot sync
  pocket-tracker-sync.timer       systemd timer for the sync service
```

## Production deploy

Three recipes documented in [deploy/README.md](deploy/README.md):
Docker Compose, systemd timers, and plain cron. The site has no per-user
state, so a single instance can serve a whole community without auth.

## Credits

- Data: [limitlesstcg.com](https://play.limitlesstcg.com/) - please consider
  supporting them.
- Methodology: [@yuki_1chiban on X](https://x.com/yuki_1chiban) and the
  public rankings spreadsheets they maintain.
- Pokémon, Pokémon TCG, and Pokémon TCG Pocket are © Nintendo / Creatures /
  GAME FREAK. This project is unofficial and not affiliated.

## License

[MIT](LICENSE)
