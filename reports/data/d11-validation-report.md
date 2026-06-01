# D11 Validation Report

Date: 2026-06-01

## Commands

| Command | Result |
|---|---|
| `npm run data:validate-enrichment` | PASS |
| `npm run seo:validate-jsonld` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |

## Data validation notes

- D10 enrichment files unchanged and valid
- Total enrichment size: 10.58 MB (< 25 MB cap)
- Pre-existing duplicate-key warnings only

## Build notes

- `/resources/medical-scholarships-guide` built successfully
- `/essays/career-goals` built via static essay guide pipeline
- No type or lint failures

## Local smoke (post-build, port 3020)

| URL | HTTP | Medical context | Result |
|---|---:|---|---|
| `/resources/medical-scholarships-guide` | 200 | expected planning sections + card | PASS |
| `/essays/career-goals` | 200 | expected card + planning section | PASS |
| `/resources/how-to-find-scholarships` | 200 | clean | PASS |
| `/resources/best-scholarship-websites` | 200 | clean | PASS |
| `/providers/loyola-university-chicago` | 200 | no medical school card | PASS |
| `/scholarships/texas` | 200 | clean | PASS |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | clean | PASS |

## Policy checks

- SEO/canonical/robots changed: **no**
- Supabase/Auth/Payments changed: **no**

## Verdict

PASS
