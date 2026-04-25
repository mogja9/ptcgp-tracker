"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  playerId: string;
  displayName: string;
  country: string | null;
  appearances: number;
};

function flag(cc?: string | null) {
  if (!cc || cc.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  const up = cc.toUpperCase();
  return String.fromCodePoint(A + (up.charCodeAt(0) - a), A + (up.charCodeAt(1) - a));
}

export function PlayerSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Result[] = await res.json();
        setResults(data);
        setActive(0);
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      const r = results[active];
      if (r) {
        e.preventDefault();
        setOpen(false);
        setQ("");
        router.push(`/players/${encodeURIComponent(r.playerId)}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="relative block">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-dim"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => q.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search players..."
          spellCheck={false}
          autoComplete="off"
          className="w-44 lg:w-56 rounded-lg border border-line bg-bg-raised pl-8 pr-9 py-1.5 text-sm placeholder:text-ink-dim text-ink focus:outline-none focus:border-accent/60 focus:bg-bg-card transition-colors"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular text-ink-dim border border-line rounded px-1 py-0.5 hidden lg:inline">
          ⌘K
        </kbd>
      </label>
      {open && q.trim().length > 0 && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-80 rounded-lg border border-line bg-bg-card shadow-xl z-30 overflow-hidden"
        >
          {loading && results.length === 0 && (
            <div className="px-3 py-2.5 text-xs text-ink-dim">Searching...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2.5 text-xs text-ink-dim">
              No players matching <span className="text-ink">{q}</span>
            </div>
          )}
          <ul>
            {results.map((r, i) => (
              <li key={r.playerId}>
                <Link
                  href={`/players/${encodeURIComponent(r.playerId)}`}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                  }}
                  role="option"
                  aria-selected={i === active}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    i === active ? "bg-bg-hover" : "hover:bg-bg-hover"
                  }`}
                  onMouseEnter={() => setActive(i)}
                >
                  <span aria-hidden>{flag(r.country)}</span>
                  <span className="flex-1 min-w-0 truncate text-ink">{r.displayName}</span>
                  <span className="text-[10px] tabular text-ink-dim">
                    {r.appearances} events
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
