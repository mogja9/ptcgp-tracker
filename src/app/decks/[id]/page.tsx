import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, Stat, RankCell } from "@/components/ui";
import { DeckIcon } from "@/components/DeckIcon";
import { Decklist, parseDecklist } from "@/components/Decklist";
import { FavoriteStar } from "@/components/FavoriteStar";
import { SortableTable, type ColumnDef, type RowData } from "@/components/SortableTable";
import { getArchetypeLeaderboard, getDeckRollup, getSampleDecklist } from "@/lib/queries";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { flagEmoji, countryName } from "@/lib/countries";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";

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
  const sample = safe(() => getSampleDecklist(decodedId, filter), null as ReturnType<typeof getSampleDecklist>);
  const sampleList = sample ? parseDecklist(sample.decklistJson) : null;

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

        {sampleList && sample && (
          <Card
            title="Sample list"
            subtitle={
              <>
                Best finish so far -{" "}
                <Link
                  href={qsHref(`/players/${encodeURIComponent(sample.playerId)}`, sp)}
                  className="hover:text-accent"
                >
                  {sample.displayName}
                </Link>
                {" "}at{" "}
                <Link
                  href={qsHref(`/tournaments/${sample.tournamentId}`, sp)}
                  className="hover:text-accent"
                >
                  {sample.tournamentName}
                </Link>
                {" "}({fmtDate(sample.date)}, place {sample.placing})
              </>
            }
          >
            <div className="px-5 py-4">
              <Decklist data={sampleList} />
            </div>
          </Card>
        )}

        <Card title="Top pilots" subtitle={`Best players on ${rollup.deckName}`}>
          {players.length === 0 ? (
            <div className="px-5 py-6 text-sm text-ink-muted">No pilots on record.</div>
          ) : (
            <SortableTable
              columns={pilotColumns}
              rows={players.map((p) => ({
                key: p.playerId,
                filterText: `${p.displayName} ${p.playerId} ${p.country ?? ""}`,
                sortValues: {
                  rank: p.rank,
                  name: p.displayName,
                  country: p.country,
                  points: p.totalPoints,
                  events: p.appearances,
                  winrate: p.winRate,
                  first: p.top1,
                  second: p.top2,
                  top4: p.top4,
                },
                cells: [
                  <RankCell key="r" rank={p.rank} />,
                  <div key="n" className="flex items-center gap-2">
                    <FavoriteStar playerId={p.playerId} />
                    <Link
                      href={qsHref(`/players/${encodeURIComponent(p.playerId)}`, sp)}
                      className="font-medium text-ink hover:text-accent truncate"
                    >
                      {p.displayName}
                    </Link>
                  </div>,
                  <span key="c" className="inline-flex items-center gap-2 text-ink-muted">
                    <span aria-hidden>{flagEmoji(p.country)}</span>
                    <span className="text-xs">{countryName(p.country)}</span>
                  </span>,
                  <span key="p" className="tabular font-medium">{fmtNum(p.totalPoints)}</span>,
                  <span key="e" className="tabular text-ink-muted">{p.appearances}</span>,
                  <span key="w" className="tabular text-ink-muted">{fmtPct(p.winRate)}</span>,
                  <span key="f" className="tabular text-ink-muted">{p.top1} / {p.top2} / {p.top4}</span>,
                ],
              }))}
              defaultSort={{ id: "rank", dir: "asc" }}
              pageSize={50}
              filterPlaceholder="Filter pilots..."
            />
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

const pilotColumns: ColumnDef[] = [
  { id: "rank",    label: "#",       sortable: true, className: "w-12" },
  { id: "name",    label: "Player",  sortable: true },
  { id: "country", label: "Country", sortable: true, headerOnly: "hidden sm:table-cell", className: "hidden sm:table-cell" },
  { id: "points",  label: "Points",  sortable: true, align: "right" },
  { id: "events",  label: "Events",  sortable: true, align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
  { id: "winrate", label: "Win %",   sortable: true, align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
  { id: "first",   label: "1st / 2nd / T4", align: "right", headerOnly: "hidden lg:table-cell", className: "hidden lg:table-cell" },
];
