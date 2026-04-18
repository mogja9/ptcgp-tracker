import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, Stat, RankCell } from "@/components/ui";
import { DeckIcon } from "@/components/DeckIcon";
import { getArchetypeLeaderboard, getDeckRollup } from "@/lib/queries";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { flagEmoji, countryName } from "@/lib/countries";
import { fmtNum, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

type SP = { season?: string };

export default async function DeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const filter = parseSeasonParam(sp.season);
  const decodedId = decodeURIComponent(id);

  const rollup = safe(() => getDeckRollup(filter, 2000).find((d) => d.deckId === decodedId), null);
  if (!rollup) notFound();

  const players = safe(() => getArchetypeLeaderboard(decodedId, filter), [] as ReturnType<typeof getArchetypeLeaderboard>);

  return (
    <Shell filter={filter}>
      <div className="grid gap-8">
        <div>
          <Link href={qsHref("/decks", sp)} className="text-xs text-ink-dim hover:text-accent">← Tier list</Link>
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <DeckIcon a={rollup.iconA} b={rollup.iconB} size={52} />
            <div>
              <h1 className="text-3xl font-semibold tracking-tightish">{rollup.deckName}</h1>
              <code className="text-xs text-ink-dim">{rollup.deckId}</code>
            </div>
          </div>
          <div className="mt-2 text-xs text-ink-dim">
            Stats scope: {filterLabel(filter)}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Top-32 appearances" value={fmtNum(rollup.appearances)} />
          <Stat label="1st-place finishes" value={fmtNum(rollup.top1)} />
          <Stat label="Finals" value={fmtNum(rollup.top2)} sub={`+ ${Math.max(rollup.top4 - rollup.top2 - rollup.top1, 0)} top 4`} />
          <Stat label="Distinct pilots" value={fmtNum(players.length)} />
        </div>

        <Card title="Top pilots" subtitle={`Best players on ${rollup.deckName}`}>
          {players.length === 0 ? (
            <div className="px-5 py-6 text-sm text-ink-muted">No pilots on record.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm sticky-head">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-ink-dim">
                    <th className="px-4 py-3 w-12">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Country</th>
                    <th className="px-4 py-3 text-right">Points</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Events</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Win %</th>
                    <th className="px-4 py-3 text-right hidden lg:table-cell">1st / 2nd / T4</th>
                  </tr>
                </thead>
                <tbody className="hairline">
                  {players.slice(0, 100).map((p) => (
                    <tr key={p.playerId} className="hover:bg-bg-hover/40 transition-colors">
                      <td className="px-4 py-2.5"><RankCell rank={p.rank} /></td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={qsHref(`/players/${encodeURIComponent(p.playerId)}`, sp)}
                          className="font-medium text-ink hover:text-accent"
                        >
                          {p.displayName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-ink-muted">
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden>{flagEmoji(p.country)}</span>
                          <span className="text-xs">{countryName(p.country)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular font-medium">
                        {fmtNum(p.totalPoints)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-muted hidden md:table-cell">
                        {p.appearances}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-muted hidden md:table-cell">
                        {fmtPct(p.winRate)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-muted hidden lg:table-cell">
                        {p.top1} / {p.top2} / {p.top4}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
