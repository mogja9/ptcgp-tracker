import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, EmptyState } from "@/components/ui";
import { DeckIcon } from "@/components/DeckIcon";
import { getMatchupMatrix } from "@/lib/queries";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { fmtPct } from "@/lib/format";
import { safe } from "@/lib/safe";

type SP = { season?: string; min?: string };

export default async function MatchupsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter = parseSeasonParam(sp.season);
  const minAppearances = Math.max(1, Number(sp.min) || 5);

  const matrix = safe(() => getMatchupMatrix(filter, { minAppearances, minGames: 1 }), null);
  if (!matrix || matrix.decks.length === 0) {
    return (
      <Shell filter={filter}>
        <EmptyState
          title={`No matchup data for ${filterLabel(filter)}`}
          body={
            <>
              The matchup matrix needs at least one tournament with pairings synced to the
              local DB. Run <code className="px-1 py-0.5 rounded bg-bg-raised border border-line">npm run sync</code> -
              pairings are fetched alongside standings automatically.
            </>
          }
        />
      </Shell>
    );
  }

  const decks = matrix.decks.slice(0, 16); // cap visible axis at 16 to keep cells readable
  const n = decks.length;
  const qsBase = sp.season ? `?season=${encodeURIComponent(sp.season)}` : "";

  return (
    <Shell filter={filter}>
      <div className="grid gap-6">
        <header>
          <Link href={qsHref("/decks", sp)} className="text-xs text-ink-dim hover:text-accent">← Tier list</Link>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-accent">
            {filterLabel(filter)}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tightish">Matchup matrix</h1>
          <p className="text-ink-muted mt-2 max-w-2xl">
            Deck-vs-deck win rates from every published pairing in the selected season.
            Read each row as "deck on the left vs deck on top". Cell shading reflects
            confidence based on sample size, color encodes whether the row deck wins or
            loses the matchup, and the small number is the number of games played.
            {matrix.totalMatches > 0 && (
              <> Across {matrix.totalMatches.toLocaleString()} matches.</>
            )}
          </p>
        </header>

        <Card>
          <div className="overflow-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-bg-card border-b border-line p-2 text-left">
                    <span className="text-[10px] uppercase tracking-wider text-ink-dim">Deck</span>
                  </th>
                  {decks.slice(0, n).map((d) => (
                    <th
                      key={d.deckId}
                      className="border-b border-line p-2 align-bottom"
                      style={{ minWidth: 64, maxWidth: 96 }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <DeckIcon a={d.iconA} b={d.iconB} size={26} />
                        <span className="text-[9px] tabular text-ink-dim leading-tight max-w-[64px] truncate" title={d.deckName}>
                          {d.deckName}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decks.map((row, i) => (
                  <tr key={row.deckId}>
                    <th className="sticky left-0 z-10 bg-bg-card border-b border-line p-2 text-left">
                      <Link
                        href={qsHref(`/decks/${encodeURIComponent(row.deckId)}`, sp)}
                        className="flex items-center gap-2 group hover:text-accent"
                      >
                        <DeckIcon a={row.iconA} b={row.iconB} size={22} />
                        <span className="truncate text-ink group-hover:text-accent" title={row.deckName}>
                          {row.deckName}
                        </span>
                      </Link>
                    </th>
                    {decks.map((col, j) => {
                      const cell = matrix.cells[i][j];
                      return <MatrixCell key={col.deckId} cell={cell} mirror={i === j} />;
                    })}
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

function MatrixCell({
  cell,
  mirror,
}: {
  cell: { winRate: number; games: number; wins: number; losses: number; ties: number };
  mirror: boolean;
}) {
  if (mirror) {
    return (
      <td className="border border-line p-1 text-center align-middle bg-bg-raised">
        <div className="text-[10px] text-ink-dim">mirror</div>
        <div className="text-[10px] tabular text-ink-dim">{cell.games}</div>
      </td>
    );
  }
  if (cell.games === 0) {
    return (
      <td className="border border-line p-1 text-center align-middle bg-bg-card/40">
        <div className="text-ink-dim text-xs">-</div>
      </td>
    );
  }
  const wr = cell.winRate;
  // Color: green for winning matchups, red for losing.
  // Alpha: scaled by sample-size confidence (cap at 30 games).
  const confidence = Math.min(1, cell.games / 30);
  const alpha = 0.18 + confidence * 0.55;
  const bg =
    wr >= 0.5
      ? `rgba(70, 200, 100, ${alpha * (Math.min(wr - 0.5, 0.5) * 2)})`
      : `rgba(255, 90, 90, ${alpha * (Math.min(0.5 - wr, 0.5) * 2)})`;
  return (
    <td
      className="border border-line p-1 text-center align-middle text-ink"
      style={{ background: bg }}
      title={`${cell.wins}W ${cell.losses}L ${cell.ties}T (${cell.games} games)`}
    >
      <div className="text-xs tabular font-medium">{fmtPct(wr)}</div>
      <div className="text-[9px] tabular text-ink-dim">{cell.games}g</div>
    </td>
  );
}

function qsHref(pathname: string, sp: SP) {
  return sp.season ? `${pathname}?season=${encodeURIComponent(sp.season)}` : pathname;
}

