# Stage B static enrichment integration report

**Date:** 2026-05-31  
**Status:** completed (no commit/push/deploy)

## 1. Files copied

Into `data/external/scholarshiptop-enrichment/`:

| File | Rows | Size |
|------|------|------|
| `school_enrichment.json` | 6197 | ~3.20 MB |
| `state_affordability.json` | 52 | ~0.05 MB |
| `city_affordability.json` | 2759 | ~0.98 MB |
| `location_crosswalk.json` | 2704 | ~0.76 MB |

Also added: `README.md`, `MANIFEST.json`

**Sanitization:** removed `meta.package_root` (local adek path) from all four JSON files on copy.

## 2. Helpers created

`lib/external-data/` (all `server-only`):

| Module | Exports |
|--------|---------|
| `types.ts` | `SchoolEnrichment`, `StateAffordability`, `CityAffordability`, `LocationCrosswalk`, … |
| `loadStaticEnrichment.ts` | JSON loaders with dev/test empty fallback |
| `schoolEnrichment.ts` | `getSchoolByUnitId`, `findSchoolsByName`, `getSchoolsByState`, `getSchoolByNameAndState`, `matchSchoolForInstitution` |
| `stateAffordability.ts` | `getStateAffordability`, `isPlausibleHouseholdIncome` |
| `cityAffordability.ts` | `getCityAffordability` |
| `locationCrosswalk.ts` | `getLocationByCityState`, `getLocationByKey` |
| `index.ts` | public barrel |

Indexes use in-memory `Map` built lazily on first server access.

## 3. Pages changed (Stage B)

| Page | Change |
|------|--------|
| `app/compare/states/stateCompareDetailPageBody.tsx` | Added `CompareExternalStateAffordabilitySection` — median income, HUD FMR, living wage, BLS wage, neutral FBI aggregate context |
| `app/compare/universities/universityCompareDetailPageBody.tsx` | Added `CompareExternalSchoolEnrichmentSection` — tuition, admission/completion, earnings, size, research signal when name+state match |

New components:

- `components/compare/CompareExternalStateAffordabilitySection.tsx`
- `components/compare/CompareExternalSchoolEnrichmentSection.tsx`

## 4. Pages planned only

- `/compare/states`, `/compare/universities` (hubs)
- `/providers/[id]`
- `/resources/[slug]`, `/essays/[slug]`
- `/scholarships/[state]`, `/scholarships/[state]/[university]`
- `seo_hub_content.cost_of_living_json` policy merge

See `stage-b-page-integration-audit.md` and `stage-c-ui-expansion-plan.md`.

## 5. Validation & scripts

| Artifact | Path |
|----------|------|
| Validation script | `scripts/data/validate-static-enrichment.ts` |
| npm script | `data:validate-enrichment` |

Validation: **pass** (see `stage-b-validation-report.md`).

## 6. Typecheck

`npx tsc --noEmit`: **pass**

## 7. Risks

| Risk | Mitigation |
|------|------------|
| University name mismatch vs Scorecard | Section hidden when no match; Stage C can add unit_id/OPEID from institutions table |
| 40 school name+state duplicate keys | Documented; prefer unit_id when available |
| NV median income outlier in source data | `isPlausibleHouseholdIncome` hides invalid values in UI |
| FBI public safety data | Neutral copy only; no safety ratings |
| Client bundle bloat | `server-only` on all loaders; do not import in client components |
| i18n | New stat sections English-only in Stage B; localize in Stage C |

## 8. Safety confirmation

| Item | Status |
|------|--------|
| Supabase schema | unchanged |
| Migrations | none |
| Auth / RLS / Payments | untouched |
| Commit / push / deploy | not performed |

## 9. Next steps

Stage C UI expansion — see `stage-c-ui-expansion-plan.md`.
