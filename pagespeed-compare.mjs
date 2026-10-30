// Before/after with Google PageSpeed Insights (mobile): N runs per page, the median of each metric, a Markdown table.
// Usage:
//   node pagespeed-compare.mjs --before https://old.example.com --after https://new.example.com [--label Home]
//   node pagespeed-compare.mjs --pairs pairs.json          # [{ "label": "Home", "before": "...", "after": "..." }]
// Options: --runs 3   --strategy mobile|desktop   --out results.json   --md results.md
// API key: PAGESPEED_API_KEY in the environment or in .env (optional, but without it Google's quota is very low).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { runPageSpeed, summarize, toMarkdown } from "./src/pagespeed.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");
const { values: o } = parseArgs({
  options: {
    before: { type: "string" },
    after: { type: "string" },
    label: { type: "string", default: "Page" },
    pairs: { type: "string" },
    runs: { type: "string", default: "3" },
    strategy: { type: "string", default: "mobile" },
    out: { type: "string", default: "results.json" },
    md: { type: "string", default: "results.md" },
  },
});

const pairs = o.pairs ? JSON.parse(readFileSync(o.pairs, "utf8")) : [{ label: o.label, before: o.before, after: o.after }];
if (!pairs.every((p) => p.before && p.after)) {
  console.error("Give --before and --after, or --pairs with a JSON file. See README.");
  process.exit(1);
}
const key = process.env.PAGESPEED_API_KEY || "";
if (!key) console.warn("No PAGESPEED_API_KEY: using Google's shared quota, which may answer 429. See README.");

const RUNS = Number(o.runs);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure(url, name) {
  const runs = [];
  for (let i = 1; i <= RUNS; i++) {
    // PageSpeed sometimes answers 500 for a moment: up to 2 retries, recorded in the run.
    const errors = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await runPageSpeed(url, { key, strategy: o.strategy });
        runs.push({ ...r, retries: errors.length });
        console.log(`${name} #${i}: performance ${r.performance}, accessibility ${r.accessibility}, LCP ${r.lcp_s?.toFixed(2)} s`);
        break;
      } catch (e) {
        // Out of quota: retrying won't help until Google resets it.
        if (e.message.startsWith("HTTP 429")) {
          console.error(`${name} #${i}: ${e.message}\nOut of PageSpeed quota. Set PAGESPEED_API_KEY (see README) or try again tomorrow.`);
          process.exit(1);
        }
        errors.push(e.message);
        console.error(`${name} #${i}, attempt ${attempt}: ${e.message}`);
        if (attempt === 3) runs.push({ error: errors.join(" | ") });
        else await wait(20000);
      }
    }
    await wait(3000);
  }
  return { url, median: summarize(runs), runs };
}

const pages = [];
for (const p of pairs) {
  // Before and after are measured the same day, one after the other, with the same settings.
  pages.push({ label: p.label, before: await measure(p.before, `${p.label} before`), after: await measure(p.after, `${p.label} after`) });
}

const md = toMarkdown(pages, RUNS);
writeFileSync(o.out, JSON.stringify({ date: new Date().toISOString(), source: `PageSpeed Insights API v5, strategy=${o.strategy}`, runsPerPage: RUNS, criterion: "median of each metric separately", pages }, null, 2));
writeFileSync(o.md, md + "\n");
console.log("\n" + md + `\n\nSaved ${o.out} (every run) and ${o.md} (table).`);
const empty = pages.flatMap((p) => [p.before, p.after]).filter((m) => m.runs.every((r) => r.error));
if (empty.length) {
  console.error(`No successful run for: ${empty.map((m) => m.url).join(", ")}`);
  process.exitCode = 1;
}
