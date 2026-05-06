"use client";

import { ReactNode, useMemo, useState } from "react";

// SortableTable receives data with cells already rendered as ReactNodes (so
// server components can build the cell content). It owns three pieces of
// client state - filter text, sort column/direction, page number - and runs
// the rows through filter -> sort -> paginate before rendering.

export type ColumnDef = {
  id: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  className?: string;
  headerOnly?: string;
};

export type RowData = {
  key: string;
  cells: ReactNode[];
  sortValues?: Record<string, string | number | null | undefined>;
  filterText?: string;
};

export type SortableTableProps = {
  columns: ColumnDef[];
  rows: RowData[];
  filterPlaceholder?: string;
  enableFilter?: boolean;
  defaultSort?: { id: string; dir: "asc" | "desc" };
  pageSize?: number;
  emptyMessage?: ReactNode;
};

export function SortableTable({
  columns,
  rows,
  filterPlaceholder = "Filter...",
  enableFilter = true,
  defaultSort,
  pageSize = 50,
  emptyMessage = "No rows.",
}: SortableTableProps) {
  const [sortId, setSortId] = useState<string | null>(defaultSort?.id ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSort?.dir ?? "desc");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f || !enableFilter) return rows;
    return rows.filter((r) => (r.filterText ?? "").toLowerCase().includes(f));
  }, [rows, filter, enableFilter]);

  const sorted = useMemo(() => {
    if (!sortId) return filtered;
    const mult = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a.sortValues?.[sortId];
      const bv = b.sortValues?.[sortId];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
      return String(av).localeCompare(String(bv)) * mult;
    });
  }, [filtered, sortId, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageBounded = Math.min(page, totalPages);
  const sliceStart = (pageBounded - 1) * pageSize;
  const slice = sorted.slice(sliceStart, sliceStart + pageSize);

  function onHeaderClick(col: ColumnDef) {
    if (!col.sortable) return;
    if (sortId === col.id) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortId(col.id);
      // Probe row 0 to choose a sensible default direction for the new column.
      const sample = rows[0]?.sortValues?.[col.id];
      setSortDir(typeof sample === "number" ? "desc" : "asc");
    }
    setPage(1);
  }

  return (
    <div>
      {enableFilter && (
        <div className="px-5 py-3 border-b border-line flex items-center gap-3">
          <label className="relative block flex-1 max-w-xs">
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
              type="text"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              placeholder={filterPlaceholder}
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-md border border-line bg-bg-raised pl-8 pr-2 py-1.5 text-sm placeholder:text-ink-dim text-ink focus:outline-none focus:border-accent/60 focus:bg-bg-card transition-colors"
            />
          </label>
          <span className="text-xs text-ink-dim tabular ml-auto">
            {sorted.length === rows.length
              ? `${rows.length} rows`
              : `${sorted.length} of ${rows.length}`}
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm sticky-head">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-dim">
              {columns.map((col) => {
                const isSorted = sortId === col.id;
                return (
                  <th
                    key={col.id}
                    className={`px-4 py-3 font-medium ${col.align === "right" ? "text-right" : ""} ${col.className ?? ""} ${col.headerOnly ?? ""} ${col.sortable ? "cursor-pointer select-none" : ""}`}
                    onClick={() => onHeaderClick(col)}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "justify-end w-full" : ""}`}>
                      {col.label}
                      {col.sortable && (
                        <span className={isSorted ? "text-accent" : "text-ink-dim"}>
                          {isSorted ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="hairline">
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-6 text-sm text-ink-muted text-center">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              slice.map((row) => (
                <tr key={row.key} className="hover:bg-bg-hover/40 transition-colors">
                  {columns.map((col, i) => (
                    <td
                      key={col.id}
                      className={`px-4 py-2.5 ${col.align === "right" ? "text-right" : ""} ${col.className ?? ""}`}
                    >
                      {row.cells[i]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-line flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageBounded === 1}
            className="rounded-md border border-line bg-bg-raised px-2.5 py-1 text-xs text-ink-muted hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-xs text-ink-dim tabular">
            Page {pageBounded} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageBounded === totalPages}
            className="rounded-md border border-line bg-bg-raised px-2.5 py-1 text-xs text-ink-muted hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
