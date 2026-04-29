import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, Stat, RankCell, Badge } from "@/components/ui";
import { DeckIcon } from "@/components/DeckIcon";
import { FavoriteStar } from "@/components/FavoriteStar";
import { getPlayer } from "@/lib/queries";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { flagEmoji, countryName } from "@/lib/countries";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

type SP = { season?: string };

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const filter = parseSeasonParam(sp.season);
  const decodedId = decodeURIComponent(id);
  const p = safe(() => getPlayer(decodedId, filter));
  if (!p) notFound();

  const b = p.bucketCounts;

  return (
    <Shell filter={filter}>
      <div className="grid gap-8">
        <div>
          <Link href={qsHref("/", sp)} className="text-xs text-ink-dim hover:text-accent">← Rankings</Link>
          <div className="mt-3 flex items-baseline gap-3 flex-wrap">
            <FavoriteStar playerId={p.playerId} size={20} className="-mb-1" />
            <h1 className="text-3xl font-semibold tracking-tightish text-ink">
              {p.displayName}
            </h1>
            <div className="text-ink-muted text-sm flex items-center gap-2">
              <span aria-hidden>{flagEmoji(p.country)}</span>
              <span>{countryName(p.country)}</span>
              <span className="text-ink-dim">·</span>
              <code className="text-xs">{p.playerId}</code>
              <a
                className="text-xs text-ink-dim hover:text-accent ml-1"
                href={`https://play.limitlesstcg.com/player/${encodeURIComponent(p.playerId)}`}
                target="_blank"
                rel="noopener"
              >
                Limitless ↗
              </a>
            </div>
          </div>
          <div className="mt-2 text-xs text-ink-dim">
            Stats scope: {filterLabel(filter)}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total points (best 10)" value={fmtNum(p.totalPoints)} />
          <Stat label="Events played" value={p.appearances} />
          <Stat label="Match win rate" value={fmtPct(p.winRate)} sub={`${p.wins}-${p.losses}-${p.ties}`} />
          <Stat
            label="Top-cuts"
            value={b["1ST"] + b["2ND"] + b.TOP4 + b.TOP8}
            sub={`${b["1ST"]} wins · ${b["2ND"]} finals · ${b.TOP4} top 4 · ${b.TOP8} top 8`}
          />
        </div>

        <Card title="Placing distribution" subtitle={filterLabel(filter)}>
          <div className="px-5 py-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {([
              ["1st", b["1ST"], "gold"],
              ["2nd", b["2ND"], "silver"],
              ["Top 4", b.TOP4, "bronze"],
              ["Top 8", b.TOP8, "accent"],
              ["Top 16", b.TOP16, "default"],
              ["Top 32", b.TOP32, "default"],
              ["Top 64", b.TOP64, "default"],
              ["Top 128", b.TOP128, "default"],
              ["Top 256", b.TOP256, "default"],
            ] as const).map(([label, count, tone]) => (
              <div key={label} className="rounded-lg border border-line bg-bg-raised px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-ink-dim">{label}</div>
                <div className="mt-1 text-lg font-semibold tabular">
                  {count > 0 ? (
                    <Badge tone={tone as any}>{count}</Badge>
                  ) : (
                    <span className="text-ink-dim">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Tournament history" subtitle="Most recent first">
          <div className="overflow-x-auto">
            <table className="w-full text-sm sticky-head">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-dim">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Tournament</th>
                  <th className="px-4 py-3">Deck</th>
                  <th className="px-4 py-3 text-right">Place</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Record</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="hairline">
                {p.recent.map((r) => (
                  <tr key={r.tournamentId} className="hover:bg-bg-hover/40 transition-colors">
                    <td className="px-4 py-2.5 text-ink-muted tabular text-xs whitespace-nowrap">
                      {fmtDate(r.date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={qsHref(`/tournaments/${r.tournamentId}`, sp)}
                        className="text-ink hover:text-accent"
                      >
                        {r.tournamentName}
                      </Link>
                      <div className="text-xs text-ink-dim mt-0.5">
                        {fmtNum(r.players)} players{r.matchFormat ? ` · ${r.matchFormat}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.deckId ? (
                        <Link
                          href={qsHref(`/decks/${encodeURIComponent(r.deckId)}`, sp)}
                          className="inline-flex items-center gap-2 text-ink hover:text-accent"
                        >
                          <DeckIcon a={r.iconA} b={r.iconB} size={22} />
                          <span className="text-sm">{r.deckName ?? "-"}</span>
                        </Link>
                      ) : (
                        <span className="text-ink-dim text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      <RankCell rank={r.placing} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-muted hidden sm:table-cell">
                      {r.wins}-{r.losses}-{r.ties}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-ink">
                      {r.points > 0 ? fmtNum(r.points) : "-"}
                    </td>
                  </tr>
                ))}
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
function safe<T>(fn: () => T): T | null {
  try { return fn(); } catch { return null; }
}
