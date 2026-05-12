// Long-running wrapper that re-runs the sync at a configurable interval.
// Intended for `docker run`, a systemd service, or a `screen`/`tmux` session.
//
// Env vars:
//   INTERVAL_MINUTES   How long to wait between runs (default 120 = 2h).
//   PAGES              Passed through to the underlying sync (default 2).
//   SKIP_PAIRINGS      Passed through.
//   LIMITLESS_API_KEY  Same key the one-shot sync uses (optional).
//
// On error the loop logs and continues; it doesn't exit, since the next pass
// usually heals transient failures (rate limiting, network blips).

import { spawn } from "node:child_process";
import path from "node:path";

const INTERVAL_MINUTES = Math.max(1, Number(process.env.INTERVAL_MINUTES ?? 120));
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

async function runOnce(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [require.resolve("tsx/cli"), path.resolve(__dirname, "sync.ts")],
      {
        stdio: "inherit",
        env: { ...process.env },
      }
    );
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", (err) => {
      console.error("sync spawn failed:", err);
      resolve(1);
    });
  });
}

async function main() {
  console.log(`sync-loop: starting, interval ${INTERVAL_MINUTES}min`);
  let n = 0;
  for (;;) {
    n++;
    const startedAt = new Date().toISOString();
    console.log(`\n=== sync run #${n} at ${startedAt} ===`);
    try {
      const code = await runOnce();
      console.log(`sync run #${n} exited ${code}`);
    } catch (e: any) {
      console.error(`sync run #${n} threw:`, e?.message ?? e);
    }
    console.log(`sleeping ${INTERVAL_MINUTES}min before next run...`);
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main();
