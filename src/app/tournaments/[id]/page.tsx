import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, Stat, RankCell, Badge } from "@/components/ui";
import { DeckIcon } from "@/components/DeckIcon";
import { Decklist, parseDecklist } from "@/components/Decklist";
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

        <Card title="Final standings" subtitle="Click a row to expand the decklist">
          <div role="rowgroup">
            <div className="grid grid-cols-[2rem_1fr_minmax(0,1fr)_auto_auto_1rem] gap-3 items-baseline px-5 py-3 border-b border-line text-xs uppercase tracking-wider text-ink-dim">
              <div>#</div>
              <div>Player</div>
              <div>Deck</div>
              <div className="text-right hidden sm:block">Record</div>
              <div className="text-right">Points</div>
              <div />
            </div>
            <ul className="divide-y divide-line">
              {t.standings.map((s) => {
                const dl = parseDecklist(s.decklistJson);
                return (
                  <li key={s.playerId}>
                    <details className="group">
                      <summary className="grid grid-cols-[2rem_1fr_minmax(0,1fr)_auto_auto_1rem] gap-3 items-center px-5 py-2.5 cursor-pointer list-none hover:bg-bg-hover/40 transition-colors">
                        <div><RankCell rank={s.placing} /></div>
                        <div className="min-w-0">
                          <Link
                            href={qsHref(`/players/${encodeURIComponent(s.playerId)}`, sp)}
                            className="text-ink hover:text-accent font-medium truncate inline-block max-w-full"
                          >
                            <span aria-hidden className="mr-2">{flagEmoji(s.country)}</span>
                            {s.displayName}
                          </Link>
                        </div>
                        <div className="min-w-0">
                          {s.deckId ? (
                            <Link
                              href={qsHref(`/decks/${encodeURIComponent(s.deckId)}`, sp)}
                              className="inline-flex items-center gap-2 text-ink hover:text-accent truncate max-w-full"
                              >
                              <DeckIcon a={s.iconA} b={s.iconB} size={22} />
                              <span className="text-sm truncate">{s.deckName ?? "-"}</span>
                            </Link>
                          ) : (
                            <span className="text-ink-dim text-xs">-</span>
                          )}
                        </div>
                        <div className="text-right tabular text-ink-muted text-sm hidden sm:block">
                          {s.wins}-{s.losses}-{s.ties}
                        </div>
                        <div className="text-right tabular font-medium text-sm">
                          {s.points > 0 ? fmtNum(s.points) : "-"}
                        </div>
                        <Chevron />
                      </summary>
                      <div className="px-5 pb-5 pt-2 bg-bg-raised/40">
                        {dl ? (
                          <Decklist data={dl} />
                        ) : (
                          <div className="text-xs text-ink-dim italic">
                            No decklist published for this finish.
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
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

function Chevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-ink-dim transition-transform group-open:rotate-180"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
