import Link from "next/link";
import { Shell } from "@/components/Shell";
import { EmptyState } from "@/components/ui";
import { DeckIcon } from "@/components/DeckIcon";
import { getTierList, type TierDeck } from "@/lib/queries";
import { parseSeasonParam, filterLabel } from "@/lib/seasons";
import { fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

type SP = { season?: string };

const TIER_LABEL: Record<TierDeck["tier"], string> = {
  SS: "Meta-defining",
  S:  "Top tier",
  A:  "Strong",
  B:  "Viable",
  C:  "Fringe",
  D:  "Rare",
};

const TIER_COLORS: Record<TierDeck["tier"], { bar: string; text: string; chip: string }> = {
  SS: { bar: "bg-tier-ss",     text: "text-tier-ss",     chip: "bg-tier-ss/15 text-tier-ss border-tier-ss/30" },
  S:  { bar: "bg-tier-s",      text: "text-tier-s",      chip: "bg-tier-s/15 text-tier-s border-tier-s/30" },
  A:  { bar: "bg-tier-a",      text: "text-tier-a",      chip: "bg-tier-a/15 text-tier-a border-tier-a/30" },
  B:  { bar: "bg-tier-b",      text: "text-tier-b",      chip: "bg-tier-b/15 text-tier-b border-tier-b/30" },
  C:  { bar: "bg-tier-c",      text: "text-tier-c",      chip: "bg-tier-c/15 text-tier-c border-tier-c/30" },
  D:  { bar: "bg-tier-d",      text: "text-ink-muted",   chip: "bg-bg-raised text-ink-muted border-line" },
};

export default async function DecksPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter = parseSeasonParam(sp.season);
  const decks = safe(() => getTierList(filter), [] as TierDeck[]);

  if (decks.length === 0) {
    return (
      <Shell filter={filter}>
        <EmptyState
          title={`No deck data for ${filterLabel(filter)}`}
          body="Tiers come from the share of top-32 finishes a deck claims across eligible tournaments in the selected season."
        />
      </Shell>
    );
  }

  const grouped = groupByTier(decks);

  return (
    <Shell filter={filter}>
      <div className="grid gap-8">
        <header>
          <div className="text-xs uppercase tracking-[0.18em] text-accent">
            {filterLabel(filter)}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tightish">Deck tier list</h1>
          <p className="text-ink-muted mt-2 max-w-2xl">
            Tiers are based on the share of top-32 finishes each deck collects across the
            selected season. SS ≥ 30% · S ≥ 15% · A ≥ 10% · B ≥ 5% · C ≥ 1% · D below 1%.
          </p>
        </header>

        <div className="grid gap-6">
          {(["SS", "S", "A", "B", "C", "D"] as TierDeck["tier"][]).map((tier) => {
            const list = grouped[tier] ?? [];
            if (list.length === 0) return null;
            const c = TIER_COLORS[tier];
            return (
              <section key={tier} className="rounded-xl border border-line bg-bg-card overflow-hidden">
                <header className="flex items-center gap-4 px-5 py-3 border-b border-line bg-bg-raised">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${c.bar}/15 ${c.text} font-bold tracking-tight`}>
                    {tier}
                  </div>
                  <div>
                    <div className="font-medium">{TIER_LABEL[tier]}</div>
                    <div className="text-xs text-ink-dim">{list.length} {list.length === 1 ? "deck" : "decks"}</div>
                  </div>
                </header>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-line">
                  {list.map((d, i) => (
                    <li
                      key={d.deckId}
                      className={`sm:border-line ${i % 3 !== 0 ? "lg:border-l" : ""} ${i % 2 !== 0 ? "sm:border-l lg:border-l" : ""}`}
                    >
                      <Link
                        href={qsHref(`/decks/${encodeURIComponent(d.deckId)}`, sp)}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover/40 transition-colors"
                      >
                        <DeckIcon a={d.iconA} b={d.iconB} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-ink truncate">{d.deckName}</div>
                          <div className="text-xs text-ink-dim mt-0.5 tabular">
                            {d.appearances} top-32s · {d.top1} wins
                          </div>
                        </div>
                        <span className={`text-xs tabular px-2 py-0.5 rounded-md border ${c.chip}`}>
                          {fmtPct(d.share)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function groupByTier(decks: TierDeck[]) {
  const out: Partial<Record<TierDeck["tier"], TierDeck[]>> = {};
  for (const d of decks) {
    (out[d.tier] ??= []).push(d);
  }
  return out;
}

function qsHref(pathname: string, sp: SP) {
  return sp.season ? `${pathname}?season=${encodeURIComponent(sp.season)}` : pathname;
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}
