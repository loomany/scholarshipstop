# D8 Post-Deploy Smoke Plan

## Routes

- `/providers/loyola-university-chicago`
- `/providers/alamo-colleges-foundation`
- `/resources/best-scholarships-texas-international-students`
- `/scholarships/texas`
- `/scholarships/texas/tarleton-state-university`
- `/compare/states/california-vs-texas`
- `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`

## Checks

- No 500 responses
- No wrong provider match
- Alamo Colleges Foundation keeps school card hidden and nonprofit card hidden unless a strict nonprofit match exists
- Loyola University Chicago gets school and research context through strict Scorecard/OpenAlex/ROR/NIH joins
- Tarleton State University scholarship page gets compact research context
- State pages and state compare get neutral social context blocks where source data exists
- Resource/essay pages only show context when the existing strict resolver finds a state or school
- No undefined/null/NaN in rendered cards
- Canonical/robots/sitemap behavior unchanged

## Remaining For Later

- Add city/rent V2 from BLS metro and Zillow ZORI after a city-page rollout plan
- Add manual provider nonprofit overrides only if the product team wants reviewed foundation matches
- Add future medical-school vertical outputs from WDOMS/AACOM/LCME/COCA/admit.med

## Local Smoke Result

Production server smoke was run locally with Playwright body text checks.

| Route | Status | Visible undefined/null/NaN | Expected D8 context |
|---|---:|---|---|
| `/providers/loyola-university-chicago` | 200 | no | research yes |
| `/providers/alamo-colleges-foundation` | 200 | no | school hidden, nonprofit hidden because no strict ProPublica match |
| `/resources/best-scholarships-texas-international-students` | 200 | no | social context yes |
| `/scholarships/texas` | 200 | no | social context yes |
| `/scholarships/texas/tarleton-state-university` | 200 | no | research and social context yes |
| `/compare/states/california-vs-texas` | 200 | no | social context yes |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | no | research context yes |
