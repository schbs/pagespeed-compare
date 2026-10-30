// PageSpeed Insights API v5: one run, the median of several runs and the before/after table.

export const METRICS = [
  // key, label, unit, better ("up" = higher is better), decimals
  ["performance", "Performance", "", "up", 0],
  ["accessibility", "Accessibility", "", "up", 0],
  ["bestPractices", "Best practices", "", "up", 0],
  ["lcp_s", "LCP", " s", "down", 2],
  ["fcp_s", "FCP", " s", "down", 2],
  ["tbt_ms", "TBT", " ms", "down", 0],
  ["cls", "CLS", "", "down", 3],
  ["weight_kb", "Page weight", " KB", "down", 0],
];

/** One PageSpeed run. The API key is sent in the URL and never logged or saved. */
export async function runPageSpeed(url, { key, strategy = "mobile", timeoutMs = 180000 } = {}) {
  const params = new URLSearchParams({ url, strategy });
  for (const c of ["performance", "accessibility", "best-practices"]) params.append("category", c);
  if (key) params.set("key", key);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${data?.error?.message ?? "unknown error"}`);
  return fromLighthouse(data.lighthouseResult);
}

export function fromLighthouse(lh) {
  const score = (c) => (lh.categories[c]?.score == null ? null : Math.round(lh.categories[c].score * 100));
  const audit = (a) => lh.audits[a]?.numericValue ?? null;
  const seconds = (ms) => (ms == null ? null : ms / 1000);
  return {
    fetchedAt: lh.fetchTime,
    lighthouseVersion: lh.lighthouseVersion,
    performance: score("performance"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
    lcp_s: seconds(audit("largest-contentful-paint")),
    fcp_s: seconds(audit("first-contentful-paint")),
    tbt_ms: audit("total-blocking-time"),
    cls: audit("cumulative-layout-shift"),
    weight_kb: audit("total-byte-weight") == null ? null : audit("total-byte-weight") / 1024,
  };
}

/** Median of the values that exist. With an even count it takes the upper middle value (a value that really happened). */
export function median(values) {
  const v = values.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
}

/** Median of each metric separately across runs (runs with an error are skipped). */
export function summarize(runs) {
  const ok = runs.filter((r) => !r.error);
  return Object.fromEntries(METRICS.map(([key]) => [key, median(ok.map((r) => r[key]))]));
}

const fmt = (value, unit, decimals) => (value == null ? "n/a" : value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + unit);

/** Markdown table: one block per page, before → after and the change. */
export function toMarkdown(pages, runsPerPage) {
  const lines = [];
  for (const p of pages) {
    lines.push(`### ${p.label}`, "", `Before: ${p.before.url}  `, `After: ${p.after.url}`, "");
    lines.push("| Metric | Before | After | Change |", "|---|---|---|---|");
    for (const [key, label, unit, better, decimals] of METRICS) {
      const b = p.before.median[key];
      const a = p.after.median[key];
      let change = "n/a";
      if (a != null && b != null) {
        const diff = a - b;
        const improved = better === "up" ? diff > 0 : diff < 0;
        const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";
        const pct = key === "weight_kb" && b ? ` (${sign}${Math.abs((diff / b) * 100).toFixed(1)}%)` : "";
        change = diff === 0 ? "same" : `${sign}${fmt(Math.abs(diff), unit, decimals)}${pct} ${improved ? "better" : "worse"}`;
      }
      lines.push(`| ${label} | ${fmt(b, unit, decimals)} | ${fmt(a, unit, decimals)} | ${change} |`);
    }
    lines.push("");
  }
  lines.push(`Google PageSpeed Insights API v5, mobile, median of ${runsPerPage} runs per page (each metric separately).`);
  return lines.join("\n");
}
