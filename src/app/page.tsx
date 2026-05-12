import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, Stat, RankCell, EmptyState, Badge } from "@/components/ui";
import { FavoriteStar } from "@/components/FavoriteStar";
import { FollowingRail } from "@/components/FollowingRail";
import { SortableTable, type ColumnDef, type RowData } from "@/components/SortableTable";
import { Sparkline } from "@/components/Sparkline";
import { getLeaderboard, getStats, getRecentTournaments } from "@/lib/queries";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { flagEmoji, countryName } from "@/lib/countries";
import { fmtNum, fmtDate } from "@/lib/format";
import { safe } from "@/lib/safe";

type SP = { season?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter = parseSeasonParam(sp.season);

  const stats = safe(() => getStats(filter), null);
  const board = safe(() => getLeaderboard(filter, 500), [] as ReturnType<typeof getLeaderboard>);
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

  const columns: ColumnDef[] = [
    { id: "rank",   label: "#",      sortable: true,  className: "w-12" },
    { id: "name",   label: "Player", sortable: true },
    { id: "country",label: "Country",sortable: true,  headerOnly: "hidden sm:table-cell", className: "hidden sm:table-cell" },
    { id: "points", label: "Points", sortable: true,  align: "right" },
    { id: "events", label: "Events", sortable: true,  align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
    { id: "first",  label: "1st",    sortable: true,  align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
    { id: "second", label: "2nd",    sortable: true,  align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
    { id: "top4",   label: "Top 4",  sortable: true,  align: "right", headerOnly: "hidden lg:table-cell", className: "hidden lg:table-cell" },
    { id: "top8",   label: "Top 8",  sortable: true,  align: "right", headerOnly: "hidden lg:table-cell", className: "hidden lg:table-cell" },
    { id: "top16",  label: "Top 16", sortable: true,  align: "right", headerOnly: "hidden xl:table-cell", className: "hidden xl:table-cell" },
    { id: "trend",  label: "Trend",  align: "right",                  headerOnly: "hidden xl:table-cell", className: "hidden xl:table-cell" },
  ];

  const rows: RowData[] = board.map((p) => ({
    key: p.playerId,
    filterText: `${p.displayName} ${p.playerId} ${p.country ?? ""}`,
    sortValues: {
      rank: p.rank,
      name: p.displayName,
      country: p.country,
      points: p.totalPoints,
      events: p.appearances,
      first: p.byBucket["1ST"],
      second: p.byBucket["2ND"],
      top4: p.byBucket.TOP4,
      top8: p.byBucket.TOP8,
      top16: p.byBucket.TOP16,
    },
    cells: [
      <RankCell key="r" rank={p.rank} />,
      <div key="n" className="flex items-center gap-2">
        <FavoriteStar playerId={p.playerId} />
        <Link
          href={qsHref(`/players/${encodeURIComponent(p.playerId)}`, sp)}
          className="font-medium text-ink hover:text-accent transition-colors truncate"
        >
          {p.displayName}
        </Link>
      </div>,
      <span key="c" className="inline-flex items-center gap-2 text-ink-muted">
        <span aria-hidden>{flagEmoji(p.country)}</span>
        <span className="text-xs">{countryName(p.country)}</span>
      </span>,
      <span key="p" className="tabular text-ink font-medium">{fmtNum(p.totalPoints)}</span>,
      <span key="e" className="tabular text-ink-muted">{p.appearances}</span>,
      <span key="1" className="tabular text-ink-muted">{p.byBucket["1ST"] || ""}</span>,
      <span key="2" className="tabular text-ink-muted">{p.byBucket["2ND"] || ""}</span>,
      <span key="4" className="tabular text-ink-muted">{p.byBucket.TOP4 || ""}</span>,
      <span key="8" className="tabular text-ink-muted">{p.byBucket.TOP8 || ""}</span>,
      <span key="16" className="tabular text-ink-muted">{p.byBucket.TOP16 || ""}</span>,
      <span key="tr" className="inline-block text-accent">
        <Sparkline values={p.best10Points} width={72} height={20} />
      </span>,
    ],
  }));

  return (
    <Shell filter={filter}>
      <div className="grid gap-8">
        <Hero filter={filter} />

        <FollowingRail known={knownPlayers} qs={sp.season ? `?season=${encodeURIComponent(sp.season)}` : ""} />

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
          <SortableTable
            columns={columns}
            rows={rows}
            defaultSort={{ id: "rank", dir: "asc" }}
            pageSize={50}
            filterPlaceholder="Filter by name or country..."
          />
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

function qsHref(pathname: string, sp: SP) {
  return sp.season ? `${pathname}?season=${encodeURIComponent(sp.season)}` : pathname;
}

