# Stage C2 post-deploy smoke

**Date:** 2026-05-31  
**Deployed commit:** `9bd739f` — `feat(data): expand static enrichment to site sections`  
**Production base:** https://scholarshiptop.com  
**Method:** Live HTTP fetch + HTML inspection (read-only, PowerShell `Invoke-WebRequest`)

---

## Overall result

| Verdict | **PASS** |
|---------|----------|
| Rollback needed? | **No** |
| Stage C3 can start? | **Yes** |

All 10 primary URLs returned **HTTP 200**. No server error pages, no visible `undefined` / `null` / `NaN` tokens in rendered HTML. C2 hub teasers and provider context cards are live. Resource/essay context cards correctly **hidden** when slug/title state mapping is ambiguous (by design). C1 compare detail enrichment remains intact. Canonical and robots match existing policy.

---

## URL results

| # | URL | Status | Time | Loads OK | C2 enrichment | Visible garbage | Canonical | Robots |
|---|-----|--------|------|----------|---------------|-----------------|-----------|--------|
| 1 | [/compare/universities](https://scholarshiptop.com/compare/universities) | **200** | ~0.9s | yes | **Yes** (hub teaser) | none | self | index (default) |
| 2 | [/compare/states](https://scholarshiptop.com/compare/states) | **200** | ~1.5s | yes | **Yes** (hub teaser) | none | self | index (default) |
| 3 | [/providers/loyola-university-chicago](https://scholarshiptop.com/providers/loyola-university-chicago) | **200** | ~2.0s | yes | **Yes** (provider card) | none | self | index (default) |
| 4 | [/providers/tarleton-state-university](https://scholarshiptop.com/providers/tarleton-state-university) | **200** | ~2.0s | yes | **Yes** (provider card) | none | self | index (default) |
| 5 | [/resources/best-scholarship-websites](https://scholarshiptop.com/resources/best-scholarship-websites) | **200** | ~0.9s | yes | **No** (expected) | none | self | index (default) |
| 6 | [/resources/how-to-find-scholarships](https://scholarshiptop.com/resources/how-to-find-scholarships) | **200** | ~0.2s | yes | **No** (expected) | none | self | index (default) |
| 7 | [/essays/financial-need](https://scholarshiptop.com/essays/financial-need) | **200** | ~0.2s | yes | **No** (expected) | none | self | index (default) |
| 8 | [/essays/career-goals](https://scholarshiptop.com/essays/career-goals) | **200** | ~0.2s | yes | **No** (expected) | none | self | index (default) |
| 9 | [/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida](https://scholarshiptop.com/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida) | **200** | ~2.6s | yes | **Yes** (C1 detail cards) | none | self | `noindex, follow` |
| 10 | [/compare/states/california-vs-texas](https://scholarshiptop.com/compare/states/california-vs-texas) | **200** | ~1.9s | yes | **Yes** (C1 detail cards) | none | self | `noindex, follow` |

**URL selection notes**

- Providers: from existing SEO audit sample (`scholarshiptop-url-sample-audit-2026-05-25.csv`) — both are real university providers with `hqState`.
- Resources / essays: live CMS/static guides from site inventory; no state token in slug/title → context card correctly absent.

---

## C2-specific checks

### Compare hub — universities (#1)

| Signal | Production |
|--------|------------|
| Teaser heading “Compare colleges with tuition, admissions, outcomes, and earnings context” | **Present** |
| “Schools enriched” stat | **6,197** |
| “Tuition data” stat | **3,625** |
| “Earnings data” / “Research signal” pills | **Present** |
| Scorecard reference copy | **Present** |
| Accidental C1 detail section on hub | **Absent** |

### Compare hub — states (#2)

| Signal | Production |
|--------|------------|
| Teaser heading “Compare states by affordability, wages, rent, and public reference data” | **Present** |
| “States covered” / rent / living wage / public context pills | **Present** |
| Census/HUD/MIT/BLS reference copy | **Present** |

### Provider pages (#3, #4)

| Signal | Loyola | Tarleton |
|--------|--------|----------|
| “College / provider context” heading | yes | yes |
| “Matched to {school}” copy | Loyola University Chicago | Tarleton State University |
| Location | Chicago, IL | present (TX context) |
| In-state tuition in card | **$53,710** | present |
| Scorecard source footer | yes | yes |
| Wrong college match | **None observed** | **None observed** |

**Negative control (extra check, not in primary table):** [/providers/alamo-colleges-foundation](https://scholarshiptop.com/providers/alamo-colleges-foundation) — provider context card **absent** (foundation name; strict match correctly hides block).

### Resources / essays (#5–#8)

| Signal | Result |
|--------|--------|
| “Affordability & cost context” / essay planning card | **Absent** on sampled URLs |
| Page otherwise loads | **Yes** |
| Matches C2 conservative design | **Yes** — no state slug in title/slug |

### Compare detail regression (#9, #10)

| Signal | UMass vs USF | CA vs TX |
|--------|--------------|----------|
| “College cost & outcomes” / “Cost of living & wages” (HTML entity `&amp;`) | yes | yes |
| Sample enrichment value UMass in-state **$17,772** | yes | N/A |
| Sample enrichment value CA FMR **$1,975** | N/A | yes |
| C1 Scorecard / Census footers | yes | yes |
| C2 hub teaser on detail page | **Absent** (correct) |

---

## Runtime / bundle heuristics

| Check | Result |
|-------|--------|
| Server 500 / Next error page | **None** (all 200; no `Internal Server Error` or `statusCode":500` in payload) |
| `lib/external-data` JSON import errors in HTML | **None observed** |
| Server component crash markers | **None observed** |
| Visible `undefined` / `null` / `NaN` | **None** |
| Client bundle bloat symptoms | **None obvious** — pre-push build First Load JS unchanged in order of magnitude (`/compare/*` hubs ~188 kB, `/providers/[id]` ~329 kB, `/resources/[slug]` ~323 kB, `/essays/[slug]` ~323 kB) |

---

## Metadata / SEO policy

| Page type | Canonical | Robots | Change from pre-C2? |
|-----------|-----------|--------|---------------------|
| Compare hubs | Self | index (default) | **No** |
| Compare detail | Self | `noindex, follow` | **No** |
| Provider profiles | Self | index (default) | **No** |
| Resource / essay articles | Self | index (default) | **No** |

---

## Visual / data issues

| Issue | Severity | Notes |
|-------|----------|-------|
| None blocking | — | All expected C2 surfaces render correctly |
| Resource/essay cards rarely visible | Info | By design until slug/title yields unambiguous state (Stage C3 may wire localized routes / richer metadata) |
| Loyola avg net price field | Info | Card may omit metrics when null in Scorecard row — not a bug |

---

## Rollback assessment

**Rollback needed: No**

C2 changes are additive server-rendered reference blocks. No 500s, no SEO policy drift, no wrong-college matches on sampled university providers. Foundation provider correctly suppresses card.

---

## Stage C3 readiness

**Stage C3 can start: Yes**

Recommended C3 scope (from C2 final report):

- Wire provider/resource/essay context into localized pilot routes (`/[locale]/providers`, `/[locale]/resources`, `/[locale]/essays`)
- Post-deploy smoke for hub teasers on localized compare hubs if applicable
- Document ambiguous provider match samples from staging/production logs

---

## Related reports

- `stage-c2-preflight.md`
- `stage-c2-validation-report.md`
- `stage-c2-static-enrichment-expansion-report.md`
- `stage-c1-post-deploy-smoke.md` (compare detail baseline)
