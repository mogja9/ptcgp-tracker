import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, RankCell, EmptyState } from "@/components/ui";
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm sticky-head">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-dim">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Players</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">1st</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">2nd</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Top 4</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Top players</th>
                </tr>
              </thead>
              <tbody className="hairline">
                {rows.map((c) => {
                  const known = isKnownCountry(c.country);
                  return (
                    <tr key={c.country} className="hover:bg-bg-hover/40 transition-colors">
                      <td className="px-4 py-2.5"><RankCell rank={c.rank} /></td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <span aria-hidden className="text-base leading-none">{flagEmoji(c.country)}</span>
                          <span className={known ? "" : "italic text-ink-muted"}>
                            {countryName(c.country)}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular font-medium">
                        {fmtNum(c.totalPoints)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-muted hidden sm:table-cell">
                        {fmtNum(c.players)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-muted hidden md:table-cell">
                        {c.top1 || ""}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-muted hidden md:table-cell">
                        {c.top2 || ""}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-muted hidden md:table-cell">
                        {c.top4 || ""}
                      </td>
                      <td className="px-4 py-2.5 text-xs hidden lg:table-cell">
                        <span className="text-ink-muted">
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
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
