# D13 Validation Report

Date: 2026-06-01

## Automated Checks

| Check | Result |
|---|---|
| `npm run data:validate-enrichment` | **PASS** — 10.58 MB, no schema changes |
| `npm run seo:validate-jsonld` | **PASS** — 13 blocks, 10 cases |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |

## Local Smoke (`npm run start` → localhost:3000)

| URL | HTTP | Planning copy | Generic clean | Notes |
|---|---:|---|---|---|
| `/resources/medical-scholarships-guide` | 200 | **Medical scholarship planning context** visible | n/a | Single cluster block |
| `/essays/career-goals` | 200 | **When writing a career-goals essay** visible | n/a | Cluster deduped from related pills |
| `/scholarships/texas` | 200 | **Scholarship value can feel different** visible | n/a | Sidebar unchanged position |
| `/scholarships/california` | 200 | same | n/a | |
| `/scholarships/new-york` | 200 | same | n/a | |
| `/scholarships/florida` | 200 | same | n/a | |
| `/scholarships/illinois` | 200 | same | n/a | |
| `/resources/how-to-find-scholarships` | 200 | n/a | **clean** | No medical blocks |
| `/resources/best-scholarship-websites` | 200 | n/a | **clean** | No medical blocks |

## Content Checks

| Check | Result |
|---|---|
| Visible `undefined` / `null` / `NaN` | **none** |
| Duplicate SmartRelatedLinks blocks | **none** |
| Residency/hospital-only data | **none** |
| Canonical/robots policy files touched | **no** |

## Performance Note (unchanged)

| Route | Note |
|---|---|
| `/scholarships/texas` | Still slow (~50s local cold fetch) — not refactored in D13 |
| Production `/resources/best-scholarships-texas-international-students` | Still monitor — out of D13 scope |

## Files Changed (D13 scope)

```
app/resources/medical-scholarships-guide/page.tsx
components/content-hub/MedicalScholarshipPlanningSections.tsx
components/content-hub/HealthcareCareerGoalsPlanningSection.tsx
components/content-hub/PremedTopicContextCard.tsx
components/essays/StaticEssayGuidePage.tsx
components/scholarships/ScholarshipStateExternalContextSidebar.tsx
components/data-viz/DataSourceFooter.tsx
components/data-viz/StateSocialContextBlock.tsx
reports/data/d13-*.md
```

## Verdict

**PASS** — ready for scoped commit.
