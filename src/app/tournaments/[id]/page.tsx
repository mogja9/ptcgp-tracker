import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, Stat, RankCell, Badge } from "@/components/ui";
import { DeckIcon } from "@/components/DeckIcon";
import { getTournament } from "@/lib/queries";
import { parseSeasonParam } from "@/lib/seasons";
import { flagEmoji } from "@/lib/countries";
import { fmtDate, fmtNum } from "@/lib/format";

export const dynamic = "force-dynamic";

type SP = { season?: string };

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const filter = parseSeasonParam(sp.season);
  const t = safe(() => getTournament(id));
  if (!t) notFound();

  return (
    <Shell filter={filter}>
      <div className="grid gap-8">
        <div>
          <Link href={qsHref("/tournaments", sp)} className="text-xs text-ink-dim hover:text-accent">← Tournaments</Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tightish">{t.name}</h1>
          <div className="mt-2 text-sm text-ink-muted flex items-center gap-3 flex-wrap">
            <span>{fmtDate(t.date)}</span>
            <span className="text-ink-dim">·</span>
            <span>{fmtNum(t.players)} players</span>
            {t.matchFormat && <><span className="text-ink-dim">·</span><span>{t.matchFormat}</span></>}
            {t.organizerName && <Badge>{t.organizerName.trim()}</Badge>}
            <a
              className="text-xs text-ink-dim hover:text-accent ml-1"
              href={`https://play.limitlesstcg.com/tournament/${t.id}`}
              target="_blank"
              rel="noopener"
            >
              View on Limitless ↗
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Players" value={fmtNum(t.players)} />
          <Stat label="Structure" value={t.structure ?? "-"} />
          <Stat label="Format" value={t.matchFormat ?? "-"} />
          <Stat label="Eligible" value={t.eligible ? "Yes" : "No"} />
        </div>

        <Card title="Final standings" subtitle="With decklists where provided">
          <div className="overflow-x-auto">
            <table className="w-full text-sm sticky-head">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-dim">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Deck</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Record</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="hairline">
                {t.standings.map((s) => (
                  <tr key={s.playerId} className="hover:bg-bg-hover/40 transition-colors">
                    <td className="px-4 py-2.5"><RankCell rank={s.placing} /></td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={qsHref(`/players/${encodeURIComponent(s.playerId)}`, sp)}
                        className="text-ink hover:text-accent font-medium"
                      >
                        <span aria-hidden className="mr-2">{flagEmoji(s.country)}</span>
                        {s.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      {s.deckId ? (
                        <Link
                          href={qsHref(`/decks/${encodeURIComponent(s.deckId)}`, sp)}
                          className="inline-flex items-center gap-2 text-ink hover:text-accent"
                        >
                          <DeckIcon a={s.iconA} b={s.iconB} size={22} />
                          <span className="text-sm">{s.deckName ?? "-"}</span>
                        </Link>
                      ) : (
                        <span className="text-ink-dim text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-muted hidden sm:table-cell">
                      {s.wins}-{s.losses}-{s.ties}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium">
                      {s.points > 0 ? fmtNum(s.points) : "-"}
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
