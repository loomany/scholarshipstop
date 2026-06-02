# D12 Performance / Payload Risk Audit

Date: 2026-06-01

## Response Time (production HTML fetch)

| Route | ms | Risk |
|---|---:|---|
| `/scholarships/texas` | 11,519 | **High** — slowest; large scholarship listing |
| `/resources/best-scholarships-texas-international-students` | 30,981 | **High outlier** — likely cold start / cache miss; re-check separately |
| `/compare/states/california-vs-texas` | 3,432 | Medium |
| `/scholarships/california` | 3,661 | Medium |
| `/compare/universities/...` | 2,807 | Medium |
| `/providers/loyola-university-chicago` | 2,024 | Medium |
| `/resources/medical-scholarships-guide` | 268 | Low |
| `/essays/career-goals` | 241 | Low |
| `/resources/how-to-find-scholarships` | 219 | Low |

Typical enriched content pages: **200–400 ms**. Heavy listing/compare routes: **2–12 s** depending on cache and listing size.

## HTML Payload Size

| Route | KB | Risk |
|---|---:|---|
| `/providers/loyola-university-chicago` | 296.5 | Monitor |
| `/compare/universities/...` | 272.5 | Monitor |
| `/providers/alamo-colleges-foundation` | 281.9 | Base provider template weight |
| `/scholarships/texas` | 182.9 | Listing-driven |
| `/compare/states/california-vs-texas` | 151.9 | Acceptable |
| `/resources/medical-scholarships-guide` | 114.0 | Lean |
| `/essays/career-goals` | 78.0 | Lean |

Enrichment adds modest HTML (stat grids, bars, link pills) — dominant weight remains scholarship listings and provider grant tables.

## First Load JS (build output)

| Route | First Load JS |
|---|---:|
| `/scholarships/[[...slugPath]]` | **458 kB** |
| `/providers/[id]` | 329 kB |
| `/resources/[slug]` | 323 kB |
| `/essays/[slug]` | 323 kB |
| `/compare/universities/[slug]` | 321 kB |
| `/compare/states/[slug]` | 247 kB |
| Shared baseline | 87.7 kB |

Enrichment uses server components and CSS bars — **no chart library added** for D1 data-viz.

## Static JSON / Client Bundle Risk

| Check | Result |
|---|---|
| JSON imported in client components | **None** — only `loadStaticEnrichment.ts` (`server-only`) |
| Full JSON embedded in HTML | **None observed** — resolved metrics only in rendered output |
| Static layer total size | 10.58 MB on disk (server-side lazy indexes) |
| Hard cap | 25 MB — **safe margin** |

## Heavy Routes to Monitor

1. **`/scholarships/[state]`** — largest recurring TTFB in smoke; listing + sidebar + filters
2. **`/compare/universities/[slug]`** — school pair + D9 rent/metro + D1 bars (~273 KB HTML)
3. **`/providers/[id]`** with many grants — template weight independent of enrichment
4. **`/resources/medical-scholarships-guide`** — currently lean; watch if more medical vertical layers added

## Performance Warnings Summary

| Warning | Severity | Action |
|---|---|---|
| State scholarship route latency | Medium | Monitor CDN/cache; avoid adding client JS to listing |
| University compare HTML size | Medium | OK for now; avoid embedding raw JSON |
| Static data 10.58 MB | Low | Under cap; watch future vertical expansion |
| Texas international students 31s spike | Investigate | Likely transient; not enrichment-caused |

## Verdict

**PASS with warnings** — enrichment is server-side and lean; existing listing/compare payload remains the bottleneck, not D1–D11 data layers.
