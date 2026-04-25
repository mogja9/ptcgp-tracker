import Link from "next/link";
import type { ReactNode } from "react";
import { getStats, getSeasonsWithData } from "@/lib/queries";
import { SeasonPicker } from "./SeasonPicker";
import { MobileNav } from "./MobileNav";
import { PlayerSearch } from "./PlayerSearch";
import type { SeasonFilter } from "@/lib/seasons";

const NAV = [
  { href: "/", label: "Rankings" },
  { href: "/decks", label: "Decks" },
  { href: "/countries", label: "Countries" },
  { href: "/tournaments", label: "Tournaments" },
];

export function Shell({
  children,
  filter,
}: {
  children: ReactNode;
  filter: SeasonFilter;
}) {
  const stats = safe(() => getStats(filter), null);
  const seasonsWithData = safe(() => Array.from(getSeasonsWithData()), [] as string[]);

  const pickerCurrent =
    filter.kind === "all"
      ? ({ kind: "all" } as const)
      : ({ kind: "season", id: filter.season.id } as const);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-8 flex-wrap">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo />
            <div className="leading-tight">
              <div className="font-semibold tracking-tightish">Pocket Rankings</div>
              <div className="text-xs text-ink-dim">
                Pokémon TCG Pocket competitive tracker
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-md text-sm text-ink-muted hover:text-ink hover:bg-bg-hover transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <PlayerSearch />
            <SeasonPicker current={pickerCurrent} seasonsWithData={seasonsWithData} />
            <MobileNav items={NAV} />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
      <footer className="border-t border-line mt-12">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between text-xs text-ink-dim">
          <div>
            Data via{" "}
            <a
              className="underline-offset-2 hover:underline hover:text-ink"
              href="https://play.limitlesstcg.com/"
              target="_blank"
              rel="noopener"
            >
              limitlesstcg.com
            </a>
            . Not affiliated with The Pokémon Company.
          </div>
          <div>
            {stats?.lastSync
              ? `Last sync: ${new Date(stats.lastSync).toLocaleString()}`
              : "Last sync: -"}
          </div>
        </div>
      </footer>
    </div>
  );
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

function Logo() {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      className="text-accent"
      aria-hidden
    >
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="24" height="24" rx="6" fill="url(#g)" />
      <path
        d="M9 18 L9 10 L13.5 10 C16 10 17.2 11.3 17.2 13.2 C17.2 15.1 16 16.4 13.5 16.4 L11.4 16.4 L11.4 18 Z M11.4 14.4 L13.3 14.4 C14.2 14.4 14.7 14 14.7 13.2 C14.7 12.4 14.2 12 13.3 12 L11.4 12 Z"
        fill="#0b0d12"
      />
    </svg>
  );
}
