// Run a query function and return its result, or `fallback` (default `null`)
// if it throws. Errors are logged so they aren't silently lost.
export function safe<T>(fn: () => T): T | null;
export function safe<T>(fn: () => T, fallback: T): T;
export function safe<T>(fn: () => T, fallback: T | null = null): T | null {
  try {
    return fn();
  } catch (e) {
    console.error("[safe] query failed:", e);
    return fallback;
  }
}
