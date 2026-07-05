#!/usr/bin/env node
/**
 * Build verification: runs `vite build` and surfaces the full
 * Rollup/Vite error (id, frame, plugin, code, loc, full stack)
 * instead of the truncated default output.
 */
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const mode = process.argv.includes("--prod") ? "production" : "development";
const started = performance.now();

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

console.log(`${CYAN}${BOLD}[verify-build]${RESET} mode=${mode}`);

const child = spawn(
  "node",
  [
    "--stack-trace-limit=100",
    "node_modules/vite/bin/vite.js",
    "build",
    "--mode",
    mode,
    "--logLevel",
    "info",
  ],
  {
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=4096 --stack-trace-limit=100`.trim(),
      DEBUG: process.env.DEBUG ?? "vite:*",
      FORCE_COLOR: "1",
      ROLLUP_VERBOSE: "1",
    },
    stdio: ["inherit", "pipe", "pipe"],
  },
);

const stdoutBuf = [];
const stderrBuf = [];

child.stdout.on("data", (d) => {
  const s = d.toString();
  stdoutBuf.push(s);
  process.stdout.write(s);
});
child.stderr.on("data", (d) => {
  const s = d.toString();
  stderrBuf.push(s);
  process.stderr.write(s);
});

child.on("exit", (code) => {
  const elapsed = ((performance.now() - started) / 1000).toFixed(2);
  if (code === 0) {
    console.log(`\n${CYAN}${BOLD}[verify-build]${RESET} ✓ build succeeded in ${elapsed}s`);
    process.exit(0);
  }

  const stderr = stderrBuf.join("");
  const stdout = stdoutBuf.join("");
  const combined = stderr + "\n" + stdout;

  console.error(`\n${RED}${BOLD}━━━ BUILD FAILED (exit ${code}, ${elapsed}s) ━━━${RESET}`);

  const extract = (label, re) => {
    const m = combined.match(re);
    if (m) console.error(`${YELLOW}${label}:${RESET} ${m[1].trim()}`);
  };

  extract("Plugin",   /plugin:\s*([^\n]+)/i);
  extract("Code",     /\b(?:error\s+)?code:?\s*['"]?([A-Z_][A-Z0-9_]+)['"]?/);
  extract("File",     /(?:file|id):\s*([^\n]+)/i);
  extract("Location", /(?:loc|at line):\s*([^\n]+)/i);

  const frameMatch = combined.match(/\n((?: *\d+\s*\|[^\n]*\n){1,7})/);
  if (frameMatch) {
    console.error(`\n${YELLOW}Source frame:${RESET}\n${DIM}${frameMatch[1]}${RESET}`);
  }

  const stackLines = combined
    .split("\n")
    .filter((l) => /^\s*at\s+/.test(l))
    .slice(0, 40);
  if (stackLines.length) {
    console.error(`\n${YELLOW}Stack trace:${RESET}`);
    for (const l of stackLines) console.error(`  ${l.trim()}`);
  }

  console.error(`\n${RED}${BOLD}━━━ END BUILD FAILURE ━━━${RESET}`);
  console.error(
    `${DIM}Tip: re-run with \`node scripts/verify-build.mjs --prod\` to verify production mode.${RESET}`,
  );
  process.exit(code ?? 1);
});
