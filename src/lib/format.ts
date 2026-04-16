export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function fmtRelative(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const day = 24 * 3600 * 1000;
  if (diff < day) return "today";
  const days = Math.floor(diff / day);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function fmtNum(n: number) {
  return n.toLocaleString();
}

export function fmtPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}
