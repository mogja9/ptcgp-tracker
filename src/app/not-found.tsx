import Link from "next/link";
import { Shell } from "@/components/Shell";
import { parseSeasonParam } from "@/lib/seasons";

export default function NotFound() {
  // not-found.tsx can't read searchParams; default the picker to the current season.
  const filter = parseSeasonParam(undefined);
  return (
    <Shell filter={filter}>
      <div className="rounded-2xl border border-line bg-bg-card p-12 text-center">
        <div className="text-xs uppercase tracking-widest text-accent">404</div>
        <h1 className="mt-2 text-2xl font-semibold">Nothing here.</h1>
        <p className="mt-2 text-ink-muted">
          That player, deck, or tournament isn't in the local cache for this season.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-4 py-2 rounded-md border border-line bg-bg-raised text-ink hover:bg-bg-hover text-sm"
        >
          ← Back to rankings
        </Link>
      </div>
    </Shell>
  );
}
