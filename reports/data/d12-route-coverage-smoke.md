# D12 Route Coverage Smoke

Date: 2026-06-01  
Base: https://scholarshiptop.com  
Method: `Invoke-WebRequest` HTML fetch (no browser automation)

CSV: `reports/data/d12-route-coverage-smoke.csv`

## Verdict

**PASS** — all 16 routes returned HTTP 200.

## Summary Table

| Group | Routes checked | HTTP 200 | Context visible | Internal links | Notes |
|---|---:|---:|---|---|---|
| Compare | 4 | 4 | 2/4 detail pages | 2/4 detail | Hub pages are teasers only |
| Scholarships | 4 | 4 | 4/4 | 4/4 | State pages `noindex`; university pages `index, follow` |
| Providers | 2 | 2 | 1/2 | 1/2 | Alamo foundation has no school/nonprofit enrichment match |
| Resources | 4 | 4 | 2/4 enriched | 3/4 | Generic pages stay clean |
| Essays | 2 | 2 | 1/2 | 2/2 | Financial-need stays generic |

## Route Details

### Compare

| URL | ms | KB | Result | Notes |
|---|---:|---:|---|---|
| `/compare/states` | 2,342 | 100.3 | PASS | Hub teaser; JSON-LD present |
| `/compare/states/california-vs-texas` | 3,432 | 151.9 | PASS | Affordability context + link cluster visible; `noindex, follow` |
| `/compare/universities` | 640 | 96.6 | PASS | Hub only |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 2,807 | 272.5 | PASS | D9 rent/metro cards + useful next steps links; `noindex, follow` |

### Scholarships

| URL | ms | KB | Result | Notes |
|---|---:|---:|---|---|
| `/scholarships/texas` | 11,519 | 182.9 | PASS | Slowest route; state sidebar + link cluster; `noindex, follow` |
| `/scholarships/california` | 3,661 | 182.4 | PASS | Same pattern as Texas |
| `/scholarships/texas/tarleton-state-university` | 2,817 | 178.9 | PASS | University cost context + links; `index, follow` |
| `/scholarships/california/california-state-university-northridge` | 2,824 | 164.4 | PASS | Same pattern; `index, follow` |

### Providers

| URL | ms | KB | Result | Notes |
|---|---:|---:|---|---|
| `/providers/loyola-university-chicago` | 2,024 | 296.5 | PASS | School context + planning links; no Stritch false match |
| `/providers/alamo-colleges-foundation` | 2,222 | 281.9 | PASS | Foundation page; no enrichment block (expected) |

### Resources / Essays

| URL | ms | KB | Result | Notes |
|---|---:|---:|---|---|
| `/resources/medical-scholarships-guide` | 268 | 114.0 | PASS | D11 planning sections + medical cluster links |
| `/resources/best-scholarships-texas-international-students` | 30,981 | 153.4 | PASS | Slow outlier (likely cold/cache); state context + D2 links |
| `/resources/best-scholarship-websites` | 867 | 105.9 | PASS | **Clean** — no D11 medical blocks |
| `/resources/how-to-find-scholarships` | 219 | 63.0 | PASS | **Clean** — editorial links only |
| `/essays/career-goals` | 241 | 78.0 | PASS | D11 healthcare planning section + topic card |
| `/essays/financial-need` | 221 | 66.3 | PASS | **Clean** — no medical enrichment |

## bad_tokens Column Note

CSV `bad_tokens` flags (`undefined`, `null`, `NaN`) are **false positives** from Next.js/React script bundles in raw HTML. Visible-text checks (script/style stripped) found **no** literal `>undefined<`, `>null<`, or `>NaN<` on any route.

## Canonical / Robots

| Pattern | Observed |
|---|---|
| Self-canonical on all checked routes | yes |
| `/scholarships/[state]` | `noindex, follow` (unchanged) |
| `/scholarships/[state]/[university]` | `index, follow` |
| Compare detail pages | `noindex, follow` |
| Resources / essays / providers checked | no explicit robots meta |

Policy unchanged from D11 smoke.

## Charts

No Recharts client charts detected in HTML. D1 uses server-side HTML/CSS bar components (`MetricComparisonBars`) — automated `charts_visible` flag under-reports; bars are present on compare/state/university enrichment sections as CSS bars, not chart libraries.
