"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  ALL_SEASONS_ID,
  SEASONS,
  getCurrentSeason,
  type Season,
} from "@/lib/seasons";

type Props = {
  current: { kind: "season"; id: string } | { kind: "all" };
  seasonsWithData: string[]; // ids that have rows in the DB
};

export function SeasonPicker({ current, seasonsWithData }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const haveData = new Set(seasonsWithData);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function go(value: string) {
    const sp = new URLSearchParams(params?.toString());
    const currentDefault = getCurrentSeason().id;
    if (value === currentDefault) {
      sp.delete("season"); // keep URL clean when picking the implicit default
    } else {
      sp.set("season", value);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  const label =
    current.kind === "all" ? "All seasons" : labelFor(current.id);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-raised px-3 py-1.5 text-sm hover:bg-bg-hover transition-colors"
      >
        <CalendarIcon />
        <span className="text-ink">{label}</span>
        <Chevron />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-64 rounded-lg border border-line bg-bg-card shadow-xl z-20 overflow-hidden"
        >
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-ink-dim border-b border-line">
            Season
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {[...SEASONS].reverse().map((s) => (
              <Row
                key={s.id}
                label={s.name}
                hint={dateRange(s)}
                active={current.kind === "season" && current.id === s.id}
                muted={!haveData.has(s.id)}
                onSelect={() => go(s.id)}
              />
            ))}
            <Row
              label="All seasons"
              hint="Across-time aggregate"
              active={current.kind === "all"}
              muted={false}
              onSelect={() => go(ALL_SEASONS_ID)}
              className="border-t border-line"
            />
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  hint,
  active,
  muted,
  onSelect,
  className = "",
}: {
  label: string;
  hint: string;
  active: boolean;
  muted: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <li className={className}>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-bg-hover transition-colors ${
          active ? "bg-bg-hover" : ""
        }`}
        role="option"
        aria-selected={active}
      >
        <span className="mt-0.5">
          {active ? <Check /> : <span className="inline-block w-3.5" aria-hidden />}
        </span>
        <span className="flex-1 min-w-0">
          <div className={`text-sm truncate ${muted ? "text-ink-dim" : "text-ink"}`}>
            {label}
            {muted && (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-dim">no data</span>
            )}
          </div>
          <div className="text-xs text-ink-dim mt-0.5 tabular">{hint}</div>
        </span>
      </button>
    </li>
  );
}

function labelFor(id: string) {
  const s = SEASONS.find((x) => x.id === id);
  return s?.name ?? id;
}

function dateRange(s: Season) {
  const start = fmt(s.start);
  const end = s.end ? fmt(addDays(s.end, -1)) : "ongoing";
  return `${start} – ${end}`;
}
function fmt(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-dim">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-ink-dim">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-accent">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
