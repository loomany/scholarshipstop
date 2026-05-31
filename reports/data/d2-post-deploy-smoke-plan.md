# D2 — Post-Deploy Smoke Plan

**Date:** 2026-05-31  
**After deploy of:** `feat(seo): expand contextual enrichment links`

## URLs

| URL | Expect |
|-----|--------|
| `/resources/best-scholarships-texas-international-students` | Texas affordability box + links to `/scholarships/texas`, `/compare/states`, `/compare/universities`, `/essays/financial-need` |
| `/resources/harvard-scholarships-international-students` | Harvard school stats + compare/resources links (no wrong school) |
| `/resources/best-scholarship-websites` | **No** enrichment block |
| `/resources/how-to-find-scholarships` | **No** enrichment block |
| `/essays/financial-need` | **No** enrichment block |
| `/essays/career-goals` | **No** enrichment block |
| `/providers/loyola-university-chicago` | Provider context + scholarship/compare/resource links |
| `/scholarships/texas` | Unchanged D1 sidebar (regression check) |
| `/compare/states/california-vs-texas` | Unchanged D1 bars (regression check) |

## Pass criteria

- HTTP 200
- No `$NaN`, `undefined`, or empty stat cards where data exists
- Generic pages: no “Planning context” / “Affordability & cost context” block
- State/school pages: compact stats only (no heavy charts on resources)
- Link hrefs valid (no 404 on linked paths)
- Canonical / robots unchanged vs pre-deploy
- Scholarship lists still visible on state pages

## Rollback trigger

- Generic page shows enrichment block incorrectly
- Wrong school/state match on Harvard/Texas smoke URLs
- Duplicate link nav appears twice on same page

## Quick curl checks

```bash
curl -sI https://scholarshiptop.com/resources/best-scholarship-websites | head -1
curl -s https://scholarshiptop.com/resources/best-scholarships-texas-international-students | grep -c "Compare states"
curl -s https://scholarshiptop.com/resources/harvard-scholarships-international-students | grep -c "Harvard University"
curl -s https://scholarshiptop.com/essays/financial-need | grep -c "Planning context for your essay"
# expect 0 on generic essay
```
