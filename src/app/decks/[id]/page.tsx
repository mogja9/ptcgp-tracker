import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, Stat, RankCell } from "@/components/ui";
import { DeckIcon } from "@/components/DeckIcon";
import { Decklist, parseDecklist } from "@/components/Decklist";
import { FavoriteStar } from "@/components/FavoriteStar";
import { SortableTable, type ColumnDef, type RowData } from "@/components/SortableTable";
import {
  getArchetypeLeaderboard,
  getDeckById,
  getSampleDecklist,
  getDeckMatchupHighlights,
  getCardInclusion,
  getDeckTimeSeries,
} from "@/lib/queries";
import { LineChart } from "@/components/LineChart";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { flagEmoji, countryName } from "@/lib/countries";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { safe } from "@/lib/safe";

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

  const rollup = safe(() => getDeckById(decodedId, filter), null);
  if (!rollup) notFound();

  const players = safe(() => getArchetypeLeaderboard(decodedId, filter), [] as ReturnType<typeof getArchetypeLeaderboard>);
  const sample = safe(() => getSampleDecklist(decodedId, filter), null as ReturnType<typeof getSampleDecklist>);
  const sampleList = sample ? parseDecklist(sample.decklistJson) : null;
  const matchups = safe(
    () => getDeckMatchupHighlights(decodedId, filter, { minGames: 5, topN: 5 }),
    null as ReturnType<typeof getDeckMatchupHighlights> | null
  );
  const inclusion = safe(
    () => getCardInclusion(decodedId, filter),
    { totalLists: 0, cards: [] as ReturnType<typeof getCardInclusion>["cards"] }
  );
  const series = safe(
    () => getDeckTimeSeries(decodedId, filter),
    [] as ReturnType<typeof getDeckTimeSeries>
  );

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
          <Stat label="Top-32 appearances" value={fmtNum(rollup.top32)} />
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

        {series.length >= 2 && (
          <Card title="Appearances over time" subtitle="Weekly top-32 finishes within the selected season">
            <div className="px-5 py-4 text-accent">
              <LineChart
                points={series.map((s) => ({
                  x: new Date(s.week).toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
                  y: s.appearances,
                }))}
                height={160}
                yLabel="Top-32 finishes"
                caption={`${series.length} weeks`}
              />
            </div>
          </Card>
        )}

        {matchups && (matchups.best.length > 0 || matchups.worst.length > 0) && (
          <Card
            title="Matchups"
            subtitle={
              <>
                Across {fmtNum(matchups.overallGames)} games against decks with at least 5
                games of sample.{" "}
                <Link href={qsHref("/decks/matchups", sp)} className="text-accent hover:text-accent-strong">
                  View full matrix →
                </Link>
              </>
            }
          >
            <div className="grid sm:grid-cols-2 gap-x-5 px-5 py-4">
              <MatchupColumn title="Best matchups" rows={matchups.best} sp={sp} sign="up" />
              <MatchupColumn title="Worst matchups" rows={matchups.worst} sp={sp} sign="down" />
            </div>
          </Card>
        )}

        {inclusion.totalLists > 0 && (
          <Card
            title="Card inclusion"
            subtitle={`Across ${fmtNum(inclusion.totalLists)} cached decklist${inclusion.totalLists === 1 ? "" : "s"}`}
          >
            <CardInclusionTable rows={inclusion.cards} />
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

const pilotColumns: ColumnDef[] = [
  { id: "rank",    label: "#",       sortable: true, className: "w-12" },
  { id: "name",    label: "Player",  sortable: true },
  { id: "country", label: "Country", sortable: true, headerOnly: "hidden sm:table-cell", className: "hidden sm:table-cell" },
  { id: "points",  label: "Points",  sortable: true, align: "right" },
  { id: "events",  label: "Events",  sortable: true, align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
  { id: "winrate", label: "Win %",   sortable: true, align: "right", headerOnly: "hidden md:table-cell", className: "hidden md:table-cell" },
  { id: "first",   label: "1st / 2nd / T4", align: "right", headerOnly: "hidden lg:table-cell", className: "hidden lg:table-cell" },
];

function MatchupColumn({
  title,
  rows,
  sp,
  sign,
}: {
  title: string;
  rows: Array<{
    vs: { deckId: string; deckName: string; iconA: string | null; iconB: string | null };
    winRate: number;
    games: number;
  }>;
  sp: SP;
  sign: "up" | "down";
}) {
  if (rows.length === 0) {
    return (
      <div>
        <div className="text-xs uppercase tracking-wider text-ink-dim mb-2">{title}</div>
        <div className="text-sm text-ink-dim italic">Not enough games yet.</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-dim mb-2">{title}</div>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const winning = r.winRate >= 0.5;
          const color = sign === "up" || winning ? "text-emerald-400" : "text-rose-400";
          return (
            <li key={r.vs.deckId} className="flex items-center gap-2">
              <DeckIcon a={r.vs.iconA} b={r.vs.iconB} size={20} />
              <Link
                href={`/decks/${encodeURIComponent(r.vs.deckId)}${sp.season ? `?season=${encodeURIComponent(sp.season)}` : ""}`}
                className="flex-1 min-w-0 truncate text-ink hover:text-accent text-sm"
                title={r.vs.deckName}
              >
                {r.vs.deckName}
              </Link>
              <span className={`tabular text-sm font-medium ${color}`}>{fmtPct(r.winRate)}</span>
              <span className="tabular text-[10px] text-ink-dim w-10 text-right">{r.games}g</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CardInclusionTable({
  rows,
}: {
  rows: Array<{
    set: string;
    number: string;
    name: string;
    category: "pokemon" | "trainer" | "energy";
    inclusion: number;
    avgCount: number;
    listsWithCard: number;
    totalLists: number;
  }>;
}) {
  const pokemon = rows.filter((r) => r.category === "pokemon");
  const trainer = rows.filter((r) => r.category === "trainer");
  const energy = rows.filter((r) => r.category === "energy");
  return (
    <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
      <InclusionSection title="Pokémon" rows={pokemon} />
      <InclusionSection title="Trainer" rows={trainer} />
      {energy.length > 0 && <InclusionSection title="Energy" rows={energy} />}
    </div>
  );
}

function InclusionSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    set: string;
    number: string;
    name: string;
    inclusion: number;
    avgCount: number;
    listsWithCard: number;
    totalLists: number;
  }>;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wider text-ink-dim border-b border-line pb-1.5 mb-2">
        {title}
      </h4>
      <ul className="space-y-1 text-sm">
        {rows.map((c, i) => (
          <li key={`${c.set}-${c.number}-${c.name}-${i}`} className="flex items-baseline gap-2">
            <div className="w-16 h-1.5 rounded bg-bg-raised overflow-hidden flex-shrink-0">
              <div
                className="h-full bg-accent/70"
                style={{ width: `${Math.min(100, c.inclusion * 100)}%` }}
              />
            </div>
            <span className="tabular text-ink-dim text-[10px] w-10">
              {(c.inclusion * 100).toFixed(0)}%
            </span>
            <span className="text-ink truncate flex-1" title={c.name}>{c.name}</span>
            <span className="ml-auto text-[10px] tabular text-ink-dim whitespace-nowrap">
              {c.avgCount.toFixed(1)}x · {c.set} {c.number}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
