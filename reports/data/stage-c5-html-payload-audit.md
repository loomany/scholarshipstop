# Stage C5 HTML payload audit

**Date:** 2026-05-31  
**Scope:** Verify enrichment rollout did not embed full static JSON into HTML

---

## Summary

| Check | Result |
|-------|--------|
| Full `school_enrichment.json` in page HTML | **Not found** |
| Full `state_affordability.json` in page HTML | **Not found** |
| Full `city_affordability.json` in page HTML | **Not found** |
| Raw `"records"` arrays in scholarship HTML | **0 occurrences** |
| Raw `"unitid":` / `"median_household_income":` field patterns | **0 occurrences** on `/scholarships/texas` |
| Only selected rows rendered | **Yes** — stat cards with formatted values |

**Verdict:** **PASS** — no accidental full-dataset embedding detected.

---

## HTML size before / after

| Page type | Before enrichment rollout | After (production `d76d94e`) | Assessment |
|-----------|---------------------------|------------------------------|------------|
| `/scholarships/texas` (alternate state template) | ~**40 KB** (C4 smoke, no sidebar) | ~**170 KB** (C4.1, sidebar + listing SSR) | **Expected increase** — not JSON bloat |
| `/scholarships/california` | ~**170 KB** (promoted chrome + sidebar) | ~**170 KB** | Stable |
| `/compare/universities/…-vs-…` | ~220 KB (Stage B prod) | ~**220 KB** | Stable |
| `/compare/states/california-vs-texas` | ~126 KB | ~**126 KB** | Stable |
| `/providers/loyola-university-chicago` | n/a | ~**295 KB** | Provider page body + listings dominate; enrichment is small section |
| `/resources/best-scholarship-websites` | n/a | ~**108 KB** | No enrichment card — size unchanged vs generic article |
| `/essays/financial-need` | n/a | ~**68 KB** | No enrichment card |

### State page +130 KB explanation

The Texas/New York increase aligns with C4.1 fix: alternate state routes now render the same SSR listing shell + `ScholarshipStateExternalContextSidebar` (~4 stat cards + copy) previously missing. HTML growth is **rendered markup + listing payload**, not inlined JSON files.

Sample sidebar adds roughly:
- Heading + intro copy
- 4× stat card markup
- Source footnotes

The bulk of ~170 KB remains scholarship hub client/stream payload (filters, listing cards, RSC flight data) — same class as California pre-fix.

---

## What appears in HTML

| Route | Enrichment in HTML |
|-------|-------------------|
| Compare uni detail | Formatted tuition, admission, completion strings per matched school |
| Compare state detail | Two state columns with income, FMR, wage strings |
| Provider Loyola | Location, in-state tuition, admission/completion cards |
| Resource Texas | Single state context card (highlights only) |
| Scholarship state | Single state sidebar (highlights only) |
| Scholarship uni | School card + optional state subsection (highlights only) |

No raw JSON objects from `data/external/scholarshiptop-enrichment/` appear in fetched HTML.

---

## Server-only loaders

| Module | `server-only` |
|--------|---------------|
| `lib/external-data/loadStaticEnrichment.ts` | **Yes** |
| `lib/external-data/schoolEnrichment.ts` | **Yes** |
| `lib/external-data/stateAffordability.ts` | **Yes** |
| `lib/external-data/scholarshipPageEnrichment.ts` | **Yes** |
| `lib/external-data/resolveContentEnrichmentContext.ts` | **Yes** |
| All other `lib/external-data/*` loaders | **Yes** |

JSON imports (`@/data/external/scholarshiptop-enrichment/*.json`) exist **only** in `loadStaticEnrichment.ts`.

---

## Optimization candidates (non-blocking)

| Route | Note |
|-------|------|
| Scholarship state pages ~170 KB | Monitor; optimize only if TTFB/HTML weight becomes a product priority — not a rollback trigger |
| Provider pages ~290 KB | Pre-existing listing-heavy template; enrichment adds ~2–4 KB markup |

---

## Rollback trigger?

**No** — size increases are explained by intentional SSR enrichment markup, not data-layer leaks.
