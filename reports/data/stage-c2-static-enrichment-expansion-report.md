# Stage C2 static enrichment expansion report

**Date:** 2026-05-31  
**Base commit:** `02027a3` — `feat(compare): polish external enrichment cards`  
**Suggested commit:** `feat(data): expand static enrichment to site sections`

---

## Executive summary

Stage C2 extends existing static enrichment (`data/external/scholarshiptop-enrichment/`) to compare hubs, provider profiles, and content-hub resource/essay pages using **server-only** helpers and conservative match rules. Scholarship state/university pages were **audited only** with a C4 implementation plan.

All validation gates pass. No Supabase, SEO policy, or auth changes.

---

## Routes audited

| Route | File |
|-------|------|
| `/providers/[id]` | `app/providers/[id]/page.tsx` |
| `/resources/[slug]` | `app/resources/[slug]/page.tsx` |
| `/essays/[slug]` | `app/essays/[slug]/page.tsx` |
| `/compare/universities` | `app/compare/universities/universityCompareHubPageBody.tsx` |
| `/compare/states` | `app/compare/states/stateCompareHubPageBody.tsx` |
| `/scholarships/[state]` | `app/scholarships/[[...slugPath]]/page.tsx` |
| `/scholarships/[state]/[university]` | `app/scholarships/[state]/[university]/page.tsx` |

Full matrix: `stage-c2-route-enrichment-audit.md`

---

## Routes changed

| Route | Change |
|-------|--------|
| `/compare/universities` | Aggregate coverage teaser (school enrichment stats) |
| `/compare/states` | Aggregate coverage teaser (state affordability stats) |
| `/providers/[id]` | `ProviderExternalSchoolContext` after About section |
| `/resources/[slug]` | `ResourceExternalContextCard` after article header |
| `/essays/[slug]` | `EssayExternalContextCard` after article header |

---

## Routes skipped (and why)

| Route | Reason |
|-------|--------|
| `/scholarships/[state]` | High SEO/client-bundle risk — C4 plan only |
| `/scholarships/[state]/[university]` | Same — C4 plan only |
| `/[locale]/providers/[slug]` | Separate localized component tree |
| `/[locale]/essays/[slug]` | Localized mirror not in C2 scope |
| `/[locale]/resources/[slug]` | Localized mirror not in C2 scope |

---

## Components added

| Component | Purpose |
|-----------|---------|
| `components/compare/CompareHubExternalDataTeaser.tsx` | Hub aggregate stat pills |
| `components/providers/ProviderExternalSchoolContext.tsx` | College/provider Scorecard context |
| `components/content-hub/ExternalReferenceContextCard.tsx` | Shared state/school stat card layout |
| `components/resources/ResourceExternalContextCard.tsx` | Resource page wrapper |
| `components/essays/EssayExternalContextCard.tsx` | Essay page wrapper |

Reuses C1 formatters: `compareExternalEnrichmentFormat.ts`, `CompareExternalEnrichmentStatCard.tsx`.

---

## Helpers added / updated

### New files

- `lib/external-data/enrichmentStats.ts` — `getSchoolEnrichmentCoverageStats`, `getUniversityComparePreview`
- `lib/external-data/resolveContentEnrichmentContext.ts` — content slug/title state resolution

### Updated exports (`lib/external-data/index.ts`)

| Helper | Module |
|--------|--------|
| `findSchoolByNameState` | schoolEnrichment |
| `findSchoolBySlugOrName` | schoolEnrichment |
| `matchProviderToSchool` | schoolEnrichment |
| `findStateAffordabilityByNameOrCode` | stateAffordability |
| `getTopStateAffordabilityHighlights` | stateAffordability |
| `getStateAffordabilityCoverageStats` | stateAffordability |
| `getStateComparePreview` | stateAffordability |
| `stateDisplayName` | stateAffordability |
| `findCityAffordabilityByCityState` | cityAffordability |
| `resolveContentEnrichmentContext` | resolveContentEnrichmentContext |
| `resolveStateCodeFromContentHints` | resolveContentEnrichmentContext |
| `hasDisplayableContentContext` | resolveContentEnrichmentContext |

### Behavior change

`getSchoolByNameAndState` now returns **`null`** when duplicate name+state keys exist (40 documented duplicates). Prevents wrong-college matches on ambiguous Scorecard rows.

---

## Match confidence rules

### Providers (`matchProviderToSchool`)

1. Require valid 2-letter `hqState`.
2. Normalize display name (strip foundation/scholarship suffix noise).
3. Exact name+state match → show.
4. Else require institution-like keywords (`university`, `college`, `institute`, …) **and** single unambiguous `matchSchoolForInstitution` result.
5. Otherwise **hide block** (no fuzzy guess).

### Resources / essays (`resolveStateCodeFromContentHints`)

1. Parse slug segments against `SEO_ROUTE_STATE_SLUG_TO_CODE`.
2. If exactly one state code from slug → use it.
3. Else scan title for US state names — exactly one match → use it.
4. Otherwise **hide block**.
5. Optional school row only when explicit `schoolName` passed (not from DB in C2).

### Compare hubs

Aggregate counts only — no per-row matching, no ambiguity.

---

## Validation results

See `stage-c2-validation-report.md`.

| Gate | Result |
|------|--------|
| `npm run data:validate-enrichment` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |

---

## Scoped diff summary

**Modified (9 files, +263 / −6 tracked lines):**

- `app/compare/states/stateCompareHubPageBody.tsx`
- `app/compare/universities/universityCompareHubPageBody.tsx`
- `app/essays/[slug]/page.tsx`
- `app/providers/[id]/page.tsx`
- `app/resources/[slug]/page.tsx`
- `lib/external-data/cityAffordability.ts`
- `lib/external-data/index.ts`
- `lib/external-data/schoolEnrichment.ts`
- `lib/external-data/stateAffordability.ts`

**New (untracked):**

- `lib/external-data/enrichmentStats.ts` (68 lines)
- `lib/external-data/resolveContentEnrichmentContext.ts` (96 lines)
- `components/compare/CompareHubExternalDataTeaser.tsx` (84 lines)
- `components/content-hub/ExternalReferenceContextCard.tsx` (107 lines)
- `components/providers/ProviderExternalSchoolContext.tsx` (105 lines)
- `components/resources/ResourceExternalContextCard.tsx` (27 lines)
- `components/essays/EssayExternalContextCard.tsx` (27 lines)
- `reports/data/stage-c2-*.md` (5 reports)

**Estimated total C2 scope:** ~780 lines added across helpers, components, wiring, and reports.

---

## Remaining recommendations

### Stage C3

- Wire same provider/resource/essay context into localized pilot routes (`/[locale]/providers`, `/[locale]/essays`, `/[locale]/resources`).
- Post-deploy smoke for hub teasers + sample provider with known college match.
- Document ambiguous provider examples from staging logs.

### Stage C4

- Implement scholarship sidebar per `stage-c2-scholarship-page-sidebar-plan.md`.
- University hub: strict `matchSchoolForInstitution` + state affordability stack.
- State hub: `getTopStateAffordabilityHighlights` only when state slug resolves.

---

## Commit prep

**Ready to commit:** yes (pending user approval)

**Suggested message:**

```
feat(data): expand static enrichment to site sections
```

**Stage only these paths** — do not include unrelated i18n, SEO reports, `.env*`, or content drafts.

**Do not push** without explicit approval.

---

## Related reports

- `stage-c2-preflight.md`
- `stage-c2-route-enrichment-audit.md`
- `stage-c2-scholarship-page-sidebar-plan.md`
- `stage-c2-validation-report.md`
