# D11 Structured Data Check

Date: 2026-06-01

## Routes checked

- `/resources/medical-scholarships-guide`
- `/essays/career-goals`

## Findings

### `/resources/medical-scholarships-guide`

- Uses `ResourceGuideShell`, which emits `FAQPage` JSON-LD only because visible FAQ items exist in page props.
- No new schema types were added in D11.
- New visible sections are plain HTML content blocks (`MedicalScholarshipPlanningSections`) with no additional JSON-LD.
- No `Course`, `MedicalOrganization`, `Review`, `AggregateRating`, `Product`, or `Offer` schema added.

### `/essays/career-goals`

- Uses existing `StaticEssayGuidePage` schema set:
  - `BreadcrumbList`
  - `Article`
  - `FAQPage`
- D11 added visible planning content only (`HealthcareCareerGoalsPlanningSection` + existing `PremedTopicContextCard`).
- No schema shape changes.

## Validation

- `npm run seo:validate-jsonld`: **PASS**
- No canonical / robots / sitemap policy files changed.

## Verdict

PASS — structured data remains valid and unchanged in policy scope.
