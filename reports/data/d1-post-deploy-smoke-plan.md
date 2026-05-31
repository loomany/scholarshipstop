# D1 Growth Sprint — Post-Deploy Smoke Plan

**Date:** 2026-05-31  
**Deploy:** After merge of `feat(seo): add data-driven insight blocks`

## URLs to verify (production)

| URL | Expect |
|-----|--------|
| `/compare/states/california-vs-texas` | Visual bars, “Why this matters for scholarship planning”, scholarship links for CA & TX, source footer |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | School bars, “Cost, outcomes, and scholarship fit”, state scholarship links |
| `/scholarships/california` | Sidebar with mini-bars, planning copy, compare/resources links |
| `/scholarships/texas` | Same sidebar pattern |
| `/scholarships/texas/tarleton-state-university` | School cost context + bars; no wrong school name |
| `/providers/loyola-university-chicago` | “College / provider context”, compact metrics + bars |
| `/resources/best-scholarships-texas-international-students` | Texas affordability context box + scholarship link |
| `/resources/best-scholarship-websites` | **No** enrichment context block |
| `/essays/financial-need` | **No** enrichment context block |

## Pass criteria

- HTTP 200 (no 500)
- No visible `undefined`, `NaN`, `$null`, or empty stat cards where data exists
- Bars hidden when both sides of a metric are missing
- Provider/school names match expected institution (strict match)
- Generic pages do not show state context box
- `canonical` and `robots` meta unchanged vs pre-deploy
- View-source: no embedded full JSON dataset blobs
- Lighthouse / bundle: no new heavy chart JS chunk

## Public safety copy

On states with FBI aggregate data:

- Must read as neutral planning context
- Must **not** use safe / unsafe / dangerous / best / worst language
- Footer must include public-safety methodology note when shown

## Rollback trigger

Rollback if:

- Wrong school/provider match on any smoke URL
- 500 on compare or scholarship enrichment routes
- Generic resource/essay pages show state box incorrectly
- SEO indexation policy regression (unexpected noindex/index flip)

## Suggested smoke commands

```bash
curl -sI https://scholarshiptop.com/compare/states/california-vs-texas | head -1
curl -s https://scholarshiptop.com/resources/best-scholarship-websites | grep -c "Planning context"
# expect 0 for generic page
curl -s https://scholarshiptop.com/resources/best-scholarships-texas-international-students | grep -c "Texas"
# expect >= 1 for state-specific page
```
