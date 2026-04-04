/**
 * Dev bootstrap for the preview runner.
 *
 * The macOS sandbox used by Claude's preview tool blocks Turbopack from
 * spawning its internal Node.js subprocess pool (needed for PostCSS).
 *
 * Workaround:
 *  1. Run the Tailwind CLI (via full node path) to generate /public/tw.css
 *  2. Watch for changes with a separate node process
 *  3. Start Next.js dev server — postcss.config.mjs is absent so Turbopack
 *     never tries to spawn the PostCSS worker
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const node = "/opt/homebrew/bin/node";
const env = {
  ...process.env,
  PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`,
};

// 1. Tailwind CSS watch (fire-and-forget, inherits cleanup when parent dies)
const twInput  = join(dir, "src", "app", "globals.css");
const twOutput = join(dir, "public", "tw.css");
const twCli    = join(dir, "node_modules", ".bin", "tailwindcss");

const twWatcher = spawn(
  node,
  [twCli, "-i", twInput, "-o", twOutput, "--watch"],
  { env, stdio: "ignore", detached: false }
);
twWatcher.on("error", () => {}); // non-fatal if CLI not present

// 2. Next.js dev server
const next  = join(dir, "node_modules", ".bin", "next");
const nextProc = spawn(node, [next, "dev", "--hostname", "0.0.0.0"], { env, stdio: "inherit" });
nextProc.on("exit", (code) => process.exit(code ?? 0));
