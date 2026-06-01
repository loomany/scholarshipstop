# D13 Post-Deploy Smoke Plan

Date: 2026-06-01  
Deploy: after commit `feat(seo): polish medical and state planning copy`

## Routes

| URL | Expected |
|---|---|
| `/resources/medical-scholarships-guide` | Lead planning summary + D11 sections; single “Continue your healthcare scholarship research” link block; no “Useful internal links” h2 |
| `/essays/career-goals` | Essay-focused planning copy; single “Planning pages for your essay research” block |
| `/scholarships/texas` | “Scholarship value can feel different…” summary + InsightCallout |
| `/scholarships/california` | same |
| `/scholarships/new-york` | same |
| `/scholarships/florida` | same |
| `/scholarships/illinois` | same |
| `/resources/how-to-find-scholarships` | Clean — no medical enrichment |
| `/resources/best-scholarship-websites` | Clean — no medical enrichment |

## Checks

```text
- HTTP 200 all routes
- no visible undefined/null/NaN
- improved planning copy visible (phrases below)
- generic pages stay clean
- no duplicate SmartRelatedLinks title blocks
- no forbidden wording as claims (best state, guaranteed eligibility, etc.)
- canonical self; robots unchanged (state listings noindex)
- no residency/hospital blocks
```

## Key phrases to verify on production

| Route | Phrase |
|---|---|
| Medical guide | “Use these data points as planning context, not as a scholarship eligibility rule.” |
| Career goals | “When writing a career-goals essay, connect your goal to specific experiences” |
| State scholarships | “Scholarship value can feel different depending on rent, wages, and cost of attendance” |

## Rollback trigger

Rollback if:
- Generic pages show medical planning blocks
- Duplicate link clusters reappear
- Visible bad data literals
- Canonical/robots regression

## Performance (record only)

- `/scholarships/texas` — note response time; no rollback for latency alone
- `/resources/best-scholarships-texas-international-students` — note if >10s persists

## Verdict template

```text
D13 post-deploy: PASS / PASS with warnings / FAIL
Rollback needed: yes/no
```
