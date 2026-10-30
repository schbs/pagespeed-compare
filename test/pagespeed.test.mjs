import assert from "node:assert/strict";
import { test } from "node:test";
import { median, summarize, toMarkdown, fromLighthouse } from "../src/pagespeed.mjs";

test("median ignores missing values and picks a value that happened", () => {
  assert.equal(median([57, 97, 60]), 60);
  assert.equal(median([3, null, 1]), 3);
  assert.equal(median([]), null);
});

test("summarize skips failed runs", () => {
  const runs = [{ performance: 90 }, { error: "HTTP 500" }, { performance: 80 }, { performance: 85 }];
  assert.equal(summarize(runs).performance, 85);
});

test("lighthouse result is converted to seconds, KB and 0-100 scores", () => {
  const lh = {
    fetchTime: "2026-01-01T00:00:00Z",
    lighthouseVersion: "12",
    categories: { performance: { score: 0.97 }, accessibility: { score: 1 }, "best-practices": { score: 0.96 } },
    audits: {
      "largest-contentful-paint": { numericValue: 1800 },
      "first-contentful-paint": { numericValue: 900 },
      "total-blocking-time": { numericValue: 40 },
      "cumulative-layout-shift": { numericValue: 0.01 },
      "total-byte-weight": { numericValue: 2048 },
    },
  };
  const r = fromLighthouse(lh);
  assert.deepEqual([r.performance, r.accessibility, r.lcp_s, r.weight_kb], [97, 100, 1.8, 2]);
});

test("table marks direction per metric", () => {
  const page = (m) => ({ url: "https://example.com", median: m });
  const md = toMarkdown([{ label: "Home", before: page({ performance: 57, weight_kb: 1000, tbt_ms: 0 }), after: page({ performance: 97, weight_kb: 100, tbt_ms: 39 }) }], 3);
  assert.match(md, /\| Performance \| 57 \| 97 \| \+40 better \|/);
  assert.match(md, /\| Page weight \| 1,000 KB \| 100 KB \| −900 KB \(−90\.0%\) better \|/);
  assert.match(md, /\| TBT \| 0 ms \| 39 ms \| \+39 ms worse \|/);
});
