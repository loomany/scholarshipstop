# Stage C1 compare enrichment UI audit

**Date:** 2026-05-31  
**Baseline:** production after commit `05d1b56` (Stage B)  
**Sample URLs reviewed:** live HTML + component source

---

## Production samples audited

| URL | Status | Block present |
|-----|--------|---------------|
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | Yes |
| `/compare/states/california-vs-texas` | 200 | Yes |
| `/compare/states/nebraska-vs-utah` | 200 | Yes |

---

## Findings (Stage B UI — before C1 polish)

### Visual placement

| Aspect | Assessment |
|--------|------------|
| Position on page | Below main comparison table / climate — reasonable, non-intrusive |
| Section weight | Plain white box; visually similar to FAQ/sources — easy to skim past |
| Hierarchy | H2 adequate but generic (“College profile (public data)”) |

**Issue:** Blocks read like debug tables, not product UI.

### Mobile layout

| Aspect | Assessment |
|--------|------------|
| University block | Two stacked `<table>` layouts — cramped on narrow screens; label/value rows hard to scan |
| State block | Definition list with flex rows — OK on mobile but dense |
| Touch targets | N/A (read-only) |

**Issue:** Tables don’t match card-based patterns used elsewhere on compare pages (`CompareCardGrid`, gradient CTAs).

### Copy clarity

| Item | Before |
|------|--------|
| University title | “College profile (public data)” — vague |
| University intro | Long dash sentence about “static enrichment” — internal jargon |
| State title | “Cost of living & wages (public data)” — redundant “(public data)” |
| State intro | Lists agencies inline — helpful but wall-of-text feel |
| Source attribution | Buried in body copy, not a clear footer line |

**Issue:** Users may not understand these are **reference** stats vs scholarship totals.

### Missing values behavior

| Behavior | Before |
|----------|--------|
| Missing metric | Shows em dash (`—`) for every empty cell — looks like broken data |
| No school match | Plain paragraph — OK |
| Invalid income (e.g. NV outlier) | Hidden via `isPlausibleHouseholdIncome` on state side only |

**Issue:** Too many dashes in tables; should hide empty metrics.

### FBI / public safety wording

| Check | Before |
|-------|--------|
| Neutral tone | Yes — “aggregate state-level public data” |
| Safe/unsafe labels | None |
| Clarity | “Public safety context” + rate per 100k — acceptable but cramped in DL |

**OK** — minor polish only (footnote style).

### Data source labels

| Block | Before |
|-------|--------|
| University | “College Scorecard static enrichment” — engineer-facing |
| State | Agencies named in intro only |

**Issue:** Need concise footer: College Scorecard / OpenAlex / ROR; Census / HUD / MIT / BLS.

### Useful vs spammy

| Signal | Assessment |
|--------|------------|
| Relevance | High — tuition/wages align with compare intent |
| Duplication | Low overlap with scholarship RPC table |
| Noise | Medium — full tables with many dashes feel like filler |

**Verdict:** Content useful; **presentation** needs polish (cards, hide empties, clearer source line).

---

## C1 scope decisions

| In scope | Out of scope |
|----------|--------------|
| Card layout, copy, formatters | New data sources |
| Hide missing metrics | i18n (Stage C later) |
| Shared stat card component | SEO robots/canonical |
| Source footnotes | Providers/resources/essays |

---

## Acceptance targets for C1

- [ ] Card grid (2-col per institution/state on mobile)
- [ ] Title: “College cost & outcomes” / “Cost of living & wages”
- [ ] Max ~6 metrics per school; research only when present
- [ ] State: income, FMR 2BR, living wage, BLS wage cards
- [ ] “Not available” only when column empty; hide individual missing metrics
- [ ] Footer source lines per spec
- [ ] No safe/unsafe language
