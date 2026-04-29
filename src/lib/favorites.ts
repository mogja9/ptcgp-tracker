"use client";

import { useEffect, useState, useCallback } from "react";

const KEY = "pocket-tracker:favorites";

// Subscribe via a tiny event bus so every <FavoriteStar /> stays in sync with
// the "Following" rail and with stars on other pages.
type Listener = (next: Set<string>) => void;
const listeners = new Set<Listener>();

function readStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function writeStorage(next: Set<string>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    /* quota / private mode - silently ignore */
  }
  listeners.forEach((l) => l(next));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFavorites(readStorage());
    const onListChange: Listener = (next) => setFavorites(new Set(next));
    listeners.add(onListChange);
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setFavorites(readStorage());
    }
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onListChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggle = useCallback((playerId: string) => {
    const cur = readStorage();
    if (cur.has(playerId)) cur.delete(playerId);
    else cur.add(playerId);
    writeStorage(cur);
  }, []);

  const has = useCallback((playerId: string) => favorites.has(playerId), [favorites]);

  return { favorites, toggle, has };
}
