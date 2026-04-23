// Renders a Pokémon TCG Pocket decklist (the JSON shape Limitless returns on
// the standings endpoint). Server component - no JS shipped.

export type CardEntry = { count: number; set: string; number: string; name: string };
export type DecklistJson = {
  pokemon?: CardEntry[];
  trainer?: CardEntry[];
  energy?: CardEntry[]; // Pocket has no energy cards; included only for safety
};

export function Decklist({ data }: { data: DecklistJson }) {
  const pokemon = data.pokemon ?? [];
  const trainer = data.trainer ?? [];
  const energy = data.energy ?? [];
  const total =
    sumCount(pokemon) + sumCount(trainer) + sumCount(energy);

  if (total === 0) {
    return <div className="text-xs text-ink-dim italic">Decklist not published.</div>;
  }

  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <Section title="Pokémon" count={sumCount(pokemon)} cards={pokemon} />
      <Section title="Trainer" count={sumCount(trainer)} cards={trainer} />
      {energy.length > 0 && (
        <Section title="Energy" count={sumCount(energy)} cards={energy} />
      )}
    </div>
  );
}

function Section({
  title,
  count,
  cards,
}: {
  title: string;
  count: number;
  cards: CardEntry[];
}) {
  if (cards.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-line pb-1.5 mb-2">
        <h4 className="text-xs uppercase tracking-wider text-ink-dim">{title}</h4>
        <span className="text-xs tabular text-ink-dim">{count}</span>
      </div>
      <ul className="space-y-1">
        {cards.map((c, i) => (
          <li key={`${c.set}-${c.number}-${i}`} className="flex items-baseline gap-2">
            <span className="tabular text-ink-muted w-5 text-right">{c.count}</span>
            <span className="text-ink truncate">{c.name}</span>
            <span className="ml-auto text-[10px] tabular text-ink-dim whitespace-nowrap">
              {c.set} · {c.number}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function sumCount(list: CardEntry[]): number {
  return list.reduce((s, c) => s + (c.count || 0), 0);
}

// Helper: safely parse the JSON column from the standing table. Returns null
// if absent / malformed.
export function parseDecklist(raw: string | null | undefined): DecklistJson | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (typeof v !== "object" || v == null) return null;
    return v as DecklistJson;
  } catch {
    return null;
  }
}
