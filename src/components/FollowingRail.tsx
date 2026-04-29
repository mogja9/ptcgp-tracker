"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites";

// Pass-down map: playerId -> displayName from server-rendered leaderboard.
// The hook is the source of truth for *which* players are favorited; the
// server gives us a display name + country to render. Anything not in the
// known map falls back to the player id.
type KnownPlayer = { displayName: string; country: string | null };

export function FollowingRail({
  known,
  qs,
}: {
  known: Record<string, KnownPlayer>;
  qs: string;
}) {
  const { favorites } = useFavorites();
  if (favorites.size === 0) return null;
  const ids = [...favorites];
  return (
    <section className="rounded-xl border border-line bg-bg-card overflow-hidden">
      <header className="px-5 py-3 border-b border-line flex items-center justify-between">
        <div>
          <h2 className="font-medium tracking-tightish">Following</h2>
          <div className="text-xs text-ink-dim mt-0.5">
            {favorites.size} {favorites.size === 1 ? "player" : "players"} saved on this device
          </div>
        </div>
      </header>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 divide-y sm:divide-y-0 divide-line">
        {ids.map((id, i) => {
          const k = known[id];
          return (
            <li
              key={id}
              className={`sm:border-line ${i % 4 !== 0 ? "xl:border-l" : ""} ${i % 3 !== 0 ? "lg:border-l" : ""} ${i % 2 !== 0 ? "sm:border-l" : ""}`}
            >
              <Link
                href={`/players/${encodeURIComponent(id)}${qs}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover/40 transition-colors"
              >
                <span aria-hidden>{flag(k?.country)}</span>
                <span className="flex-1 min-w-0 truncate text-ink font-medium">
                  {k?.displayName ?? id}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-gold"
                  aria-hidden
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88L2 9.27l6.91-1.01L12 2z" />
                </svg>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function flag(cc?: string | null) {
  if (!cc || cc.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  const up = cc.toUpperCase();
  return String.fromCodePoint(A + (up.charCodeAt(0) - a), A + (up.charCodeAt(1) - a));
}
