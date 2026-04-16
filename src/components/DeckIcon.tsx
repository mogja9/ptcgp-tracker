/* eslint-disable @next/next/no-img-element */
// Limitless serves Pokémon icon sprites from r2.limitlesstcg.net - same set
// of slugs the API returns in `deck.icons[]` (e.g. "altaria-mega", "suicune").
//
// CDN pattern: https://r2.limitlesstcg.net/pokemon/gen9/<slug>.png
// `referrerPolicy="no-referrer"` is set because the bucket only serves images
// to clients that don't send a Referer header.

function iconUrl(slug: string) {
  return `https://r2.limitlesstcg.net/pokemon/gen9/${slug}.png`;
}

export function DeckIcon({
  a,
  b,
  size = 32,
  className = "",
}: {
  a: string | null | undefined;
  b?: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const slugs = [a, b].filter(Boolean) as string[];
  if (slugs.length === 0) {
    return (
      <span
        className={`inline-block rounded-full bg-bg-raised border border-line ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center -space-x-2 ${className}`}
      style={{ height: size }}
    >
      {slugs.map((s, i) => (
        <img
          key={`${s}-${i}`}
          src={iconUrl(s)}
          alt={s}
          width={size}
          height={size}
          loading="lazy"
          className="rounded-full ring-1 ring-line bg-bg-raised object-contain"
          referrerPolicy="no-referrer"
        />
      ))}
    </span>
  );
}
