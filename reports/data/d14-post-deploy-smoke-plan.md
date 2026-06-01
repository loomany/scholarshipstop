# D14 Post-Deploy Smoke Plan

Date: 2026-06-01  
Deploy after: `perf(seo): reduce enriched page payload risk`

## Routes

| URL | Expected |
|---|---|
| `/scholarships/texas` | State sidebar visible; **1** consolidated source footer |
| `/scholarships/texas/tarleton-state-university` | University + state context; **1** footer |
| `/resources/best-scholarships-texas-international-students` | State context; **1** footer |
| `/resources/medical-scholarships-guide` | D13 copy + planning sections; **1** footer |
| `/compare/universities/...` | Enrichment section; **1** footer (not 10) |
| `/providers/loyola-university-chicago` | School context; **1** footer |

## Checks

```text
- HTTP 200
- enrichment context still visible
- no visible undefined/null/NaN
- Reference only appears once per page (visible text)
- D13 GEO copy unchanged
- canonical/robots unchanged
- JSON-LD present and valid
```

## Rollback Trigger

- Missing enrichment context on key routes
- Multiple duplicate footers return
- SEO policy regression

## Performance (record only)

- State listings ~2–4s acceptable if unchanged
- Texas intl resource / CSUN outliers — note ms, no rollback for latency alone

## Verdict Template

```text
D14 post-deploy: PASS / PASS with warnings / FAIL
Rollback needed: yes/no
```
