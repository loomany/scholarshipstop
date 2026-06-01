# D14 Validation Report

Date: 2026-06-01

## Automated Checks

| Check | Result |
|---|---|
| `npm run data:validate-enrichment` | **PASS** |
| `npm run seo:validate-jsonld` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |

## Local Smoke (localhost:3000, post-fix build)

| URL | HTTP | Context visible | Footer count | Bad tokens |
|---|---:|---|---:|---|
| `/scholarships/texas` | 200 | yes | 1 | none |
| `/scholarships/texas/tarleton-state-university` | 200 | yes | 1 | none |
| `/resources/best-scholarships-texas-international-students` | 200 | yes | 1 | none |
| `/resources/medical-scholarships-guide` | 200 | yes | 1 | none |
| `/compare/universities/...` | 200 | yes | 1 | none |
| `/providers/loyola-university-chicago` | 200 | yes | 1 | none |

## Content Checks

| Check | Result |
|---|---|
| D13 GEO copy still visible | **PASS** |
| Generic pages unchanged | N/A (not in smoke set) |
| JSON-LD policy | **unchanged** |
| Canonical/robots files touched | **no** |

## Files Changed

```
components/data-viz/StateSocialContextBlock.tsx
components/data-viz/InstitutionResearchContext.tsx
components/data-viz/CityRentMetroContext.tsx
components/data-viz/MedicalSchoolContext.tsx
components/content-hub/PremedTopicContextCard.tsx
components/content-hub/MedicalScholarshipPlanningSections.tsx
components/content-hub/ExternalReferenceContextCard.tsx
components/scholarships/ScholarshipStateExternalContextSidebar.tsx
components/scholarships/ScholarshipUniversityExternalContextSidebar.tsx
components/compare/CompareExternalStateAffordabilitySection.tsx
components/compare/CompareExternalSchoolEnrichmentSection.tsx
components/providers/ProviderExternalSchoolContext.tsx
app/resources/medical-scholarships-guide/page.tsx
reports/data/d14-*.md
```

## Verdict

**PASS** — ready for scoped commit (not pushed).
