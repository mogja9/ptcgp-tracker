import { queryAll } from "../db";
import type { SeasonFilter } from "../seasons";
import { dateClause } from "./common";

export type CardInclusionRow = {
  set: string;
  number: string;
  name: string;
  category: "pokemon" | "trainer" | "energy";
  // Across all sampled decklists for the archetype:
  //   inclusion: fraction of lists that run at least one copy (0..1)
  //   avgCount:  mean copies per list that runs it (1..2)
  inclusion: number;
  avgCount: number;
  listsWithCard: number;
  totalLists: number;
};

type ParsedCard = {
  count?: number;
  set?: string;
  number?: string;
  name?: string;
};

type ParsedDecklist = {
  pokemon?: ParsedCard[];
  trainer?: ParsedCard[];
  energy?: ParsedCard[];
};

// Per-deck card inclusion stats, aggregated from the decklist_json column.
export function getCardInclusion(
  deckId: string,
  filter: SeasonFilter
): { totalLists: number; cards: CardInclusionRow[] } {
  const dc = dateClause(filter);
  const lists = queryAll<{ dl: string }>(
    `SELECT s.decklist_json AS dl
       FROM standing s
       JOIN tournament t ON t.id = s.tournament_id
       WHERE t.eligible = 1 AND s.deck_id = ? AND s.decklist_json IS NOT NULL${dc.sql}`,
    deckId,
    ...dc.params
  );

  type Agg = {
    set: string;
    number: string;
    name: string;
    category: "pokemon" | "trainer" | "energy";
    lists: number;
    copies: number;
  };
  const agg = new Map<string, Agg>();
  let totalLists = 0;
  for (const row of lists) {
    let parsed: ParsedDecklist;
    try {
      parsed = JSON.parse(row.dl) as ParsedDecklist;
    } catch {
      continue;
    }
    totalLists++;
    for (const cat of ["pokemon", "trainer", "energy"] as const) {
      const arr = parsed?.[cat] ?? [];
      for (const c of arr) {
        if (!c?.name) continue;
        const set = String(c.set ?? "");
        const num = String(c.number ?? "");
        const key = `${cat}:${set}|${num}|${c.name}`;
        const cur = agg.get(key) ?? {
          set, number: num, name: c.name, category: cat, lists: 0, copies: 0,
        };
        cur.lists += 1;
        cur.copies += Number(c.count ?? 1);
        agg.set(key, cur);
      }
    }
  }

  const cards: CardInclusionRow[] = [...agg.values()].map((a) => ({
    set: a.set,
    number: a.number,
    name: a.name,
    category: a.category,
    listsWithCard: a.lists,
    totalLists,
    inclusion: totalLists ? a.lists / totalLists : 0,
    avgCount: a.lists ? a.copies / a.lists : 0,
  }));
  cards.sort((a, b) => b.inclusion - a.inclusion || b.avgCount - a.avgCount);
  return { totalLists, cards };
}
