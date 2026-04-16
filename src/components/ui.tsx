import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-bg-card ${className}`}
    >
      {(title || subtitle || action) && (
        <header className="px-5 py-4 border-b border-line flex items-center gap-3">
          <div>
            {title && (
              <h2 className="font-medium tracking-tightish text-ink">{title}</h2>
            )}
            {subtitle && (
              <div className="text-xs text-ink-dim mt-0.5">{subtitle}</div>
            )}
          </div>
          {action && <div className="ml-auto">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-card px-5 py-4">
      <div className="text-xs uppercase tracking-wider text-ink-dim">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-dim">{sub}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "gold" | "silver" | "bronze";
  className?: string;
}) {
  const toneClass = {
    default: "border-line text-ink-muted",
    accent: "border-accent/30 text-accent",
    gold: "border-gold/40 text-gold",
    silver: "border-silver/40 text-silver",
    bronze: "border-bronze/40 text-bronze",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-bg-raised border border-line px-2 py-0.5 text-[11px] text-ink-muted ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body?: ReactNode;
  cta?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line border-dashed bg-bg-card/40 p-10 text-center">
      <div className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-xl border border-line bg-bg-raised text-ink-dim mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l3 2" />
        </svg>
      </div>
      <div className="text-ink font-medium">{title}</div>
      {body && <div className="text-sm text-ink-muted mt-2 max-w-md mx-auto">{body}</div>}
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}

export function RankCell({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="text-gold font-semibold tabular">{rank}</span>;
  if (rank === 2)
    return <span className="text-silver font-semibold tabular">{rank}</span>;
  if (rank === 3)
    return <span className="text-bronze font-semibold tabular">{rank}</span>;
  return <span className="text-ink-muted tabular">{rank}</span>;
}
