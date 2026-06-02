# D14 Post-Deploy Smoke Result

Date: 2026-06-01  
Base: https://scholarshiptop.com  
Expected production commit: `b50e801` (`perf(seo): reduce enriched page payload risk`)

## Verdict

**PASS**

Rollback needed: **no**  
D15 can start: **yes**

## Route Table

| URL | HTTP | Context visible | Reference/footer count | Bad tokens | Canonical | Robots | Response time | Result |
|---|---:|---|---:|---|---|---|---:|---|
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | yes — Public reference data, college cost, city rent/wage | **1** (pre-fix: 10) | none | self-canonical | `noindex, follow` | ~20.7s | **PASS** |
| `/providers/loyola-university-chicago` | 200 | yes — College/provider context | **1** | none | self-canonical | none | ~2.2s | **PASS** |
| `/scholarships/texas/tarleton-state-university` | 200 | yes — college cost + state affordability | **1** | none | self-canonical | `index, follow` | ~2.9s | **PASS** |
| `/resources/medical-scholarships-guide` | 200 | yes — D13 planning sections + cluster | **1** | none | self-canonical | none | ~0.3s | **PASS** |
| `/resources/best-scholarships-texas-international-students` | 200 | yes — Planning context / state affordability | **1** | none | self-canonical | none | ~31.8s | **PASS** |
| `/scholarships/texas` | 200 | yes — D13 GEO summary sidebar | **1** | none | self-canonical | `noindex, follow` | ~3.4s | **PASS** |

CSV: `reports/data/d14-post-deploy-smoke.csv`

## Key D14 Validation

| Check | Result |
|---|---|
| Footer dedupe on compare university | **PASS** — `Reference only` count **1** (was **10** pre-fix) |
| All routes single consolidated footer | **PASS** — count 1 on all 6 routes |
| D1–D13 enrichment blocks present | **PASS** — metrics, bars, links, planning copy intact |
| Visible `undefined` / `null` / `NaN` | **none** |
| Canonical / robots policy | **unchanged** |
| Supabase / Auth / Payments | **not involved** |

## Compare University Detail

Production visible-text counts on `/compare/universities/...`:

- `Reference only`: **1**
- `Data availability varies`: **1** (same consolidated footer block)
- `not ScholarshipTop eligibility rules or guarantees`: **1**
- Enrichment sections: Public reference data, visual comparisons, school columns, link cluster — all present

## Performance Warnings

| Route | ms | Note |
|---|---:|---|
| `/resources/best-scholarships-texas-international-students` | ~31,761 | Slow outlier — same class as D12/D13; not a D14 regression |
| `/compare/universities/...` | ~20,710 | Slow fetch; HTML payload improved via footer dedupe |
| `/scholarships/texas` | ~3,364 | Listing SSR — unchanged class |
| Medical guide | ~318 | Lean |

Footer dedupe reduces HTML size but does not fix listing SSR latency.

## Rollback

Not needed — D14 fix live and working as intended.
