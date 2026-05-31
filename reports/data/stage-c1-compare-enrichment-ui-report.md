# Stage C1 compare enrichment UI report

**Date:** 2026-05-31  
**Base commit:** `05d1b56` (Stage B live)  
**Scope:** Polish compare enrichment presentation only — no data/SEO/Supabase changes

---

## Summary

Stage C1 replaces table/list layouts with **card grids**, clearer headings, hidden empty metrics, and standardized source footnotes. Local production-mode smoke on three compare URLs: **all pass**.

| Verdict | **Ready to commit** (awaiting approval; do not push) |
|---------|------------------------------------------------------|

---

## Files changed

| File | Change |
|------|--------|
| `components/compare/CompareExternalSchoolEnrichmentSection.tsx` | Card layout, copy, metric filtering |
| `components/compare/CompareExternalStateAffordabilitySection.tsx` | Card layout, FMR 2BR focus, safety footnote |
| `components/compare/CompareExternalEnrichmentStatCard.tsx` | **New** — shared stat card |
| `components/compare/compareExternalEnrichmentFormat.ts` | **New** — shared formatters + “Not available” |
| `reports/data/stage-c1-compare-enrichment-ui-audit.md` | Pre-change audit |
| `reports/data/stage-c1-compare-enrichment-ui-report.md` | This report |

**Not changed:** JSON data, `lib/external-data/`, page bodies, SEO metadata, robots, Supabase, Auth, Payments.

---

## Before / after

| Area | Before (Stage B) | After (C1) |
|------|------------------|------------|
| University title | “College profile (public data)” | “College cost & outcomes” + “Public reference data” kicker |
| University layout | HTML tables, all rows including dashes | 2×2 card grid per school; **metrics without values hidden** |
| University source | Inline “static enrichment” jargon | Footer: “Data: College Scorecard / OpenAlex / ROR where available…” |
| State title | “Cost of living & wages (public data)” | “Cost of living & wages” + kicker |
| State metrics | DL with 1BR/2BR combined row | Cards: income, **FMR 2BR**, living wage, BLS wage |
| State safety | DL block | Compact footnote; no safe/unsafe language |
| State source | Inline agency list | Footer: “Data: Census ACS, HUD FMR, MIT Living Wage, BLS…” |
| Missing values | Em dash per cell | Metric omitted; “Not available” only for empty column |
| Visual | Plain white section | Subtle slate gradient shell matching compare page polish |

---

## Validation results

| Check | Result |
|-------|--------|
| `npm run data:validate-enrichment` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |

---

## Local smoke (`npm run start -p 3002`)

| URL | Status | New UI signals |
|-----|--------|----------------|
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | “College cost & outcomes”, stat cards, Scorecard footer |
| `/compare/states/california-vs-texas` | 200 | “Cost of living & wages”, stat cards, ACS/HUD footer |
| `/compare/states/nebraska-vs-utah` | 200 | Same state block pattern |

No visible `undefined`, `null`, or `NaN` in HTML.

**Screenshots:** Not captured in this run (headless HTTP check only). Visual verification: card grid + footers present in rendered HTML.

---

## Remaining recommendations (Stage C2+)

| Item | Priority |
|------|----------|
| i18n for labels/footers (`compareDetailUiCopy`) | P1 |
| Localized compare routes (`/es/compare/...`) | P1 |
| `unit_id` join for stronger school matching | P2 |
| Hub page teaser cards (`/compare/states`, `/compare/universities`) | P2 |
| Post-deploy smoke after C1 deploy | P0 after push |

---

## Commit prep

**Suggested message:**

```
feat(compare): polish external enrichment cards
```

**Suggested scoped add:**

```bash
git add \
  components/compare/CompareExternalSchoolEnrichmentSection.tsx \
  components/compare/CompareExternalStateAffordabilitySection.tsx \
  components/compare/CompareExternalEnrichmentStatCard.tsx \
  components/compare/compareExternalEnrichmentFormat.ts \
  reports/data/stage-c1-compare-enrichment-ui-audit.md \
  reports/data/stage-c1-compare-enrichment-ui-report.md
```

**Push:** not performed (awaiting approval).

---

## Safety confirmation

| Check | Status |
|-------|--------|
| New data sources | no |
| Supabase / migrations / Auth / Payments | untouched |
| SEO robots / canonical / noindex | untouched |
| Providers / resources / essays | untouched |
