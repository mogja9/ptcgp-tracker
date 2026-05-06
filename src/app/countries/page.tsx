import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, RankCell, EmptyState } from "@/components/ui";
import { SortableTable, type ColumnDef } from "@/components/SortableTable";
import { getCountryRankings } from "@/lib/queries";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { flagEmoji, countryName, isKnownCountry } from "@/lib/countries";
import { fmtNum } from "@/lib/format";

export const dynamic = "force-dynamic";

type SP = { season?: string };

export default async function CountriesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter = parseSeasonParam(sp.season);
  const rows = safe(() => getCountryRankings(filter), [] as ReturnType<typeof getCountryRankings>);
  if (rows.length === 0) {
    return (
      <Shell filter={filter}>
        <EmptyState title={`No country data for ${filterLabel(filter)}`} body="Pick a different season or sync more events." />
      </Shell>
    );
  }

  const columns: ColumnDef[] = [
    { id: "rank",    label: "#",        sortable: true, className: "w-12" },
    { id: "country", label: "Country",  sortable: true },
    { id: "points",  label: "Points",   sortable: true, align: "right" },
    { id: "players", label: "Players",  sortable: true, align: "right", headerOnly: "hidden sm:table-cell", className: "hidden sm:table-cell" },
    { id: "first",   label: "1st",      sortable: true, align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
    { id: "second",  label: "2nd",      sortable: true, align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
    { id: "top4",    label: "Top 4",    sortable: true, align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
    { id: "top",     label: "Top players", headerOnly: "hidden lg:table-cell", className: "hidden lg:table-cell" },
  ];

  return (
    <Shell filter={filter}>
      <div className="grid gap-8">
        <header>
          <div className="text-xs uppercase tracking-[0.18em] text-accent">
            {filterLabel(filter)}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tightish">Country rankings</h1>
          <p className="text-ink-muted mt-2 max-w-2xl">
            Aggregated player points by country. Each country's score is the sum of every
            tracked player's best-10 total. Players without a country on their Limitless
            profile are grouped under <em>Not listed</em>.
          </p>
        </header>

        <Card title="Country leaderboard">
          <SortableTable
            columns={columns}
            rows={rows.map((c) => {
              const known = isKnownCountry(c.country);
              return {
                key: c.country,
                filterText: `${countryName(c.country)} ${c.country}`,
                sortValues: {
                  rank: c.rank,
                  country: countryName(c.country),
                  points: c.totalPoints,
                  players: c.players,
                  first: c.top1,
                  second: c.top2,
                  top4: c.top4,
                },
                cells: [
                  <RankCell key="r" rank={c.rank} />,
                  <span key="c" className="inline-flex items-center gap-2 font-medium">
                    <span aria-hidden className="text-base leading-none">{flagEmoji(c.country)}</span>
                    <span className={known ? "" : "italic text-ink-muted"}>
                      {countryName(c.country)}
                    </span>
                  </span>,
                  <span key="p" className="tabular font-medium">{fmtNum(c.totalPoints)}</span>,
                  <span key="pl" className="tabular text-ink-muted">{fmtNum(c.players)}</span>,
                  <span key="1" className="tabular text-ink-muted">{c.top1 || ""}</span>,
                  <span key="2" className="tabular text-ink-muted">{c.top2 || ""}</span>,
                  <span key="4" className="tabular text-ink-muted">{c.top4 || ""}</span>,
                  <span key="t" className="text-xs text-ink-muted">
                    {c.topPlayers.slice(0, 4).map((p, i) => (
                      <span key={p.playerId}>
                        {i > 0 ? ", " : ""}
                        <Link
                          href={qsHref(`/players/${encodeURIComponent(p.playerId)}`, sp)}
                          className="hover:text-accent"
                        >
                          {p.displayName}
                        </Link>
                      </span>
                    ))}
                  </span>,
                ],
              };
            })}
            defaultSort={{ id: "rank", dir: "asc" }}
            pageSize={50}
            filterPlaceholder="Filter countries..."
          />
        </Card>
      </div>
    </Shell>
  );
}

function qsHref(pathname: string, sp: SP) {
  return sp.season ? `${pathname}?season=${encodeURIComponent(sp.season)}` : pathname;
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}
