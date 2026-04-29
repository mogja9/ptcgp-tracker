import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, Stat, RankCell, EmptyState, Badge } from "@/components/ui";
import { FavoriteStar } from "@/components/FavoriteStar";
import { FollowingRail } from "@/components/FollowingRail";
import { getLeaderboard, getStats, getRecentTournaments } from "@/lib/queries";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { flagEmoji, countryName } from "@/lib/countries";
import { fmtNum, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type SP = { season?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter = parseSeasonParam(sp.season);

  const stats = safe(() => getStats(filter), null);
  const board = safe(() => getLeaderboard(filter, 50), [] as ReturnType<typeof getLeaderboard>);
  const recent = safe(() => getRecentTournaments(filter, 5), [] as ReturnType<typeof getRecentTournaments>);

  if (!stats || stats.eligibleTournaments === 0) {
    return (
      <Shell filter={filter}>
        <div className="grid gap-6">
          <Hero filter={filter} />
          <EmptyState
            title={`No data for ${filterLabel(filter)}`}
            body={
              <>
                This season has no cached tournaments yet. Run{" "}
                <code className="px-1 py-0.5 rounded bg-bg-raised border border-line">npm run sync</code>{" "}
                with enough pages to reach back into this date range, or pick a different season
                from the selector in the header.
              </>
            }
          />
        </div>
      </Shell>
    );
  }

  const knownPlayers = Object.fromEntries(
    board.map((p) => [p.playerId, { displayName: p.displayName, country: p.country }])
  );
  const qs = sp.season ? `?season=${encodeURIComponent(sp.season)}` : "";

  return (
    <Shell filter={filter}>
      <div className="grid gap-8">
        <Hero filter={filter} />

        <FollowingRail known={knownPlayers} qs={qs} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Eligible tournaments" value={fmtNum(stats.eligibleTournaments)} />
          <Stat label="Tracked players" value={fmtNum(stats.distinctPlayers)} />
          <Stat label="Top-of-board" value={board[0]?.totalPoints?.toLocaleString() ?? "-"} sub={board[0]?.displayName} />
          <Stat label="Updated" value={stats.lastSync ? fmtDate(stats.lastSync) : "-"} />
        </div>

        <Card
          title="Player rankings"
          subtitle={`${filterLabel(filter)} - best 10 tournament results per player`}
          action={
            <Link
              href={qsHref("/decks", sp)}
              className="text-xs text-accent hover:text-accent-strong"
            >
              View tier list →
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm sticky-head">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-dim">
                  <Th className="w-12">#</Th>
                  <Th>Player</Th>
                  <Th className="hidden sm:table-cell">Country</Th>
                  <Th className="text-right">Points</Th>
                  <Th className="text-right hidden md:table-cell">Events</Th>
                  <Th className="text-right hidden md:table-cell">1st</Th>
                  <Th className="text-right hidden md:table-cell">2nd</Th>
                  <Th className="text-right hidden lg:table-cell">Top 4</Th>
                  <Th className="text-right hidden lg:table-cell">Top 8</Th>
                  <Th className="text-right hidden xl:table-cell">Top 16</Th>
                </tr>
              </thead>
              <tbody className="hairline">
                {board.map((p) => (
                  <tr key={p.playerId} className="hover:bg-bg-hover/40 transition-colors">
                    <Td><RankCell rank={p.rank} /></Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <FavoriteStar playerId={p.playerId} />
                        <Link
                          href={qsHref(`/players/${encodeURIComponent(p.playerId)}`, sp)}
                          className="font-medium text-ink hover:text-accent transition-colors"
                        >
                          {p.displayName}
                        </Link>
                      </div>
                    </Td>
                    <Td className="hidden sm:table-cell text-ink-muted">
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden>{flagEmoji(p.country)}</span>
                        <span className="text-xs">{countryName(p.country)}</span>
                      </span>
                    </Td>
                    <Td className="text-right tabular text-ink font-medium">
                      {fmtNum(p.totalPoints)}
                    </Td>
                    <Td className="text-right tabular text-ink-muted hidden md:table-cell">{p.appearances}</Td>
                    <Td className="text-right tabular text-ink-muted hidden md:table-cell">{p.byBucket["1ST"] || ""}</Td>
                    <Td className="text-right tabular text-ink-muted hidden md:table-cell">{p.byBucket["2ND"] || ""}</Td>
                    <Td className="text-right tabular text-ink-muted hidden lg:table-cell">{p.byBucket.TOP4 || ""}</Td>
                    <Td className="text-right tabular text-ink-muted hidden lg:table-cell">{p.byBucket.TOP8 || ""}</Td>
                    <Td className="text-right tabular text-ink-muted hidden xl:table-cell">{p.byBucket.TOP16 || ""}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {recent.length > 0 && (
          <Card title="Recent tournaments" subtitle={`Most recent eligible events · ${filterLabel(filter)}`}>
            <ul className="divide-y divide-line">
              {recent.map((t) => (
                <li key={t.id}>
                  <Link
                    href={qsHref(`/tournaments/${t.id}`, sp)}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-bg-hover/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink truncate">{t.name}</div>
                      <div className="text-xs text-ink-dim mt-0.5">
                        {fmtDate(t.date)} · {fmtNum(t.players)} players
                        {t.matchFormat ? <> · {t.matchFormat}</> : null}
                      </div>
                    </div>
                    {t.organizerName && (
                      <Badge tone="default" className="hidden sm:inline-flex">
                        {t.organizerName.trim()}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Shell>
  );
}

function Hero({ filter }: { filter: ReturnType<typeof parseSeasonParam> }) {
  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-bg-card to-bg-raised p-8">
      <div className="text-xs uppercase tracking-[0.18em] text-accent">
        {filterLabel(filter)}
      </div>
      <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tightish text-ink">
        Pokémon TCG Pocket competitive rankings
      </h1>
      <p className="mt-3 max-w-2xl text-ink-muted leading-relaxed">
        Live aggregate of every public Pokémon TCG Pocket tournament on{" "}
        <a className="text-ink hover:underline" href="https://play.limitlesstcg.com/" target="_blank" rel="noopener">
          limitlesstcg.com
        </a>
        . Ranking points use the best 10 results per player within the selected season. Events
        under 64 players, without decklists, or under non-standard rules are excluded -
        same methodology as the public reference spreadsheet.
      </p>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className}`}>{children}</td>;
}

// Preserve the season query param across in-app links so navigation stays in
// the chosen season.
function qsHref(pathname: string, sp: SP) {
  return sp.season ? `${pathname}?season=${encodeURIComponent(sp.season)}` : pathname;
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}
