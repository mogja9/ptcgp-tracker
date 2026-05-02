"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";
const KEY = "pocket-tracker:theme";

function readSaved(): Theme {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(KEY);
  return v === "dark" || v === "light" || v === "system" ? v : "system";
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved =
    theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : theme;
  if (resolved === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(readSaved());
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function cycle() {
    const order: Theme[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    apply(next);
  }

  const label =
    theme === "system" ? "System theme" : theme === "light" ? "Light theme" : "Dark theme";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label} - click to change`}
      title={label}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-line bg-bg-raised hover:bg-bg-hover transition-colors text-ink-muted hover:text-ink"
    >
      {theme === "system" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M9 21h6M12 17v4" />
        </svg>
      )}
      {theme === "light" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
      {theme === "dark" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
        </svg>
      )}
    </button>
  );
}

// Inline script string used in layout.tsx to apply the saved theme before
// React mounts, avoiding a flash of the dark default for light-mode users.
export const themeBootstrap = `
(function() {
  try {
    var v = localStorage.getItem('${KEY}');
    var resolved = v === 'light' || v === 'dark'
      ? v
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    if (resolved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  } catch (e) {}
})();
`.trim();
