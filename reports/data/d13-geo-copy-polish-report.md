# D13 GEO Copy Polish Report

Date: 2026-06-01

## Pages Changed

| Page | Component(s) | Change type |
|---|---|---|
| `/resources/medical-scholarships-guide` | `MedicalScholarshipPlanningSections.tsx`, `page.tsx`, `PremedTopicContextCard.tsx` | Copy + layout |
| `/essays/career-goals` | `HealthcareCareerGoalsPlanningSection.tsx`, `StaticEssayGuidePage.tsx`, `PremedTopicContextCard.tsx` | Copy + dedupe |
| `/scholarships/texas` | `ScholarshipStateExternalContextSidebar.tsx` | Copy (shared component) |
| `/scholarships/california` | same | Copy |
| `/scholarships/new-york` | same | Copy |
| `/scholarships/florida` | same | Copy |
| `/scholarships/illinois` | same | Copy |
| All enrichment pages using footers | `DataSourceFooter.tsx` | Methodology copy |
| State pages with social context | `StateSocialContextBlock.tsx` | GEO wording |

## Copy Improvements

### Medical guide

- Added lead section **Medical scholarship planning context** with required GEO phrases:
  - “Use these data points as planning context, not as a scholarship eligibility rule.”
  - “Medical scholarship requirements vary by program, school, state, and funding source.”
  - “Compare scholarship amounts alongside tuition, living costs, career goals, and school context.”
- Tightened **What this data can and cannot tell you** bullets
- Renamed cluster title to **Continue your healthcare scholarship research**
- Expanded **Source note** with consolidated methodology language

### Career goals essay

- Added essay-writing guidance:
  - “When writing a career-goals essay, connect your goal to specific experiences…”
  - “Healthcare examples should be personal and evidence-based…”
- Added scholarship planning bridge copy without making page medical-only
- Renamed cluster title to **Planning pages for your essay research**

### State scholarship pages (top 5)

- Added GEO summary: scholarship value vs rent/wages/cost of attendance
- Added **InsightCallout**: “Why this matters for scholarship planning”
- Clarified state-level vs city/household variance
- Updated **StateSocialContextBlock**: county-level community indicator disclaimer

### Source / methodology (global)

`DataSourceFooter.tsx`:
- “Sources: public education, workforce, affordability, and institution datasets where available.”
- “Reference only — not ScholarshipTop eligibility rules or guarantees.”
- “Data availability varies by school, city, state, and source year.”

## Forbidden Wording Check

No new uses of: `best state`, `worst state`, `best medical school`, `top ranked`, `guaranteed` (as claims), `safe`/`unsafe`/`dangerous` (as ratings).

Existing editorial mentions (e.g. “whether you qualify” in negation, “avoid guaranteed impact” in do/don’t table) are intentional guardrails.

## Pages Intentionally Skipped

- `/compare/states/california-vs-texas` — already strong D1/D5 copy
- `/compare/universities/...` — out of D13 primary scope
- `/scholarships/[state]/[university]` — university sidebar unchanged
- Generic resources/essays — no enrichment added

## Policy

| Item | Changed |
|---|---|
| SEO/canonical/robots/sitemap | **no** |
| Supabase/Auth/Payments | **no** |
| Static JSON outputs | **no** |
