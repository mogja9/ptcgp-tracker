import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, Badge } from "@/components/ui";
import { getRecentTournaments } from "@/lib/queries";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { fmtDate, fmtRelative, fmtNum } from "@/lib/format";
import { safe } from "@/lib/safe";

type SP = { season?: string };

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter = parseSeasonParam(sp.season);
  const rows = safe(() => getRecentTournaments(filter, 200), [] as ReturnType<typeof getRecentTournaments>);
  if (rows.length === 0) {
    return (
      <Shell filter={filter}>
        <EmptyState title={`No tournaments for ${filterLabel(filter)}`} body="Pick a different season from the selector, or sync more events." />
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
          <h1 className="mt-1 text-3xl font-semibold tracking-tightish">Tournaments</h1>
          <p className="text-ink-muted mt-2 max-w-2xl">
            Every public Pokémon TCG Pocket tournament in this season that meets the
            eligibility criteria (64+ players, decklists required, no special rules).
            Click a tournament for full standings.
          </p>
        </header>

        <Card title={`Eligible tournaments (${rows.length})`}>
          <ul className="divide-y divide-line">
            {rows.map((t) => (
              <li key={t.id}>
                <Link
                  href={qsHref(`/tournaments/${t.id}`, sp)}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-bg-hover/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{t.name}</div>
                    <div className="text-xs text-ink-dim mt-0.5">
                      {fmtDate(t.date)} · {fmtRelative(t.date)} · {fmtNum(t.players)} players
                      {t.matchFormat ? <> · {t.matchFormat}</> : null}
                    </div>
                  </div>
                  {t.organizerName && (
                    <Badge className="hidden sm:inline-flex">
                      {t.organizerName.trim()}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}

function qsHref(pathname: string, sp: SP) {
  return sp.season ? `${pathname}?season=${encodeURIComponent(sp.season)}` : pathname;
}

