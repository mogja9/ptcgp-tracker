"use client";

import { useFavorites } from "@/lib/favorites";

export function FavoriteStar({
  playerId,
  size = 14,
  className = "",
}: {
  playerId: string;
  size?: number;
  className?: string;
}) {
  const { has, toggle } = useFavorites();
  const active = has(playerId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(playerId);
      }}
      aria-label={active ? "Unfollow player" : "Follow player"}
      aria-pressed={active}
      title={active ? "Following - click to remove" : "Follow this player"}
      className={`inline-flex items-center justify-center rounded-md hover:bg-bg-hover transition-colors p-1 -m-1 ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className={active ? "text-gold" : "text-ink-dim hover:text-ink"}
        aria-hidden
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88L2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  );
}
