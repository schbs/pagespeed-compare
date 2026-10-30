# pagespeed-compare

Before/after website speed with Google PageSpeed Insights, done in a way you can defend:

- **Several runs per page** (3 by default), because a single PageSpeed run can be lucky or unlucky.
- **The median of each metric**, separately, so one outlier does not move the result.
- **Before and after measured the same day**, one right after the other, with the same settings (mobile by default).
- **Every run is saved** in `results.json`, so anyone can check the numbers behind the table.
- A **Markdown table** with the change of each metric and whether it got better or worse (a worse number is shown, not hidden).

No dependencies. Node.js 20.12 or newer.

[English](#usage) · [Español](#español)

## Usage

1. Optional but recommended: create a Google Cloud API key with the **PageSpeed Insights API** enabled, copy
   `.env.example` to `.env` and paste it in `PAGESPEED_API_KEY`. Without a key, Google's shared quota is very low and
   you may get `HTTP 429`.
2. Compare one page:

```bash
node pagespeed-compare.mjs --before https://example.com/ --after https://example.org/ --label Home
```

3. Or several pages at once (see `pairs.example.json`):

```bash
node pagespeed-compare.mjs --pairs pairs.example.json --runs 3
```

Options: `--runs 3`, `--strategy mobile|desktop`, `--out results.json`, `--md results.md`.
If Google answers an error for a moment (it happens, usually `HTTP 500`), the run is retried up to 2 times and the
retries are recorded.

The key is read from the environment and sent only to Google's API. It is never printed or saved in the results.

## Example output

Real run on 29/10/2026 comparing `example.com` (before) with `example.org` (after). Both serve the same tiny page, so
the point is the format and how small the run-to-run differences are, not a real improvement:

Console, while it runs:

```text
Home before #1: performance 100, accessibility 96, LCP 0.80 s
Home before #2: performance 100, accessibility 96, LCP 0.79 s
Home before #3: performance 100, accessibility 96, LCP 0.80 s
Home after #1: performance 100, accessibility 96, LCP 0.77 s
Home after #2: performance 100, accessibility 96, LCP 0.77 s
Home after #3: performance 100, accessibility 96, LCP 0.77 s
```

`results.md`:

#### Home

Before: https://example.com/  
After: https://example.org/

| Metric | Before | After | Change |
|---|---|---|---|
| Performance | 100 | 100 | same |
| Accessibility | 96 | 96 | same |
| Best practices | 100 | 100 | same |
| LCP | 0.80 s | 0.77 s | −0.02 s better |
| FCP | 0.78 s | 0.75 s | −0.02 s better |
| TBT | 0 ms | 0 ms | same |
| CLS | 0.000 | 0.000 | same |
| Page weight | 2 KB | 2 KB | +0 KB (+2.8%) worse |

Google PageSpeed Insights API v5, mobile, median of 3 runs per page (each metric separately).

The change is computed from the unrounded medians, so it can differ by one unit from subtracting the rounded columns
(0.797 s → 0.772 s shows as 0.80 → 0.77 and −0.02 s).

## How to read it

- **Performance** is a lab simulation of a mid-range phone on a slow 4G connection. Real visitors (Chrome UX Report)
  can see different numbers; say so when you share the table.
- Compare pages that do the same job (home with home, product page with product page) and with similar content.
- If a metric got worse, keep it in the table and explain it. A table with only green numbers is not credible.

## Tests

```bash
npm test
```

## Español

Mide el antes y el después de una web con PageSpeed Insights de Google: varias corridas por página (3 por defecto), la
**mediana** de cada valor por separado, las dos versiones el mismo día y con la misma configuración, y una tabla en
Markdown que muestra también lo que empeoró. Cada corrida queda guardada en `results.json`.

Uso: copiá `.env.example` a `.env`, pegá tu clave de la API de PageSpeed en `PAGESPEED_API_KEY` (opcional, pero sin
clave la cuota compartida de Google es muy baja) y corré:

```bash
node pagespeed-compare.mjs --before https://sitio-actual.example --after https://sitio-nuevo.example --label Portada
```

La clave nunca se imprime ni se guarda en los resultados.

## License

MIT. See `LICENSE`.
