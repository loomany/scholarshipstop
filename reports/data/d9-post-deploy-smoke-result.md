# D9 Post-Deploy Smoke Result

Date: 2026-06-01
Base: https://scholarshiptop.com
Commit in production: `d2a455f` (`feat(data): add city rent and metro context`)

## Verdict

PASS

Rollback needed: no

## Route Table

| URL | HTTP | City card expected | City card seen | Match quality | Visible `undefined`/`null`/`NaN` | Canonical | Robots | Result |
|---|---:|---|---|---|---|---|---|---|
| `/scholarships/texas/tarleton-state-university` | 200 | yes | yes | `Stephenville, TX` shown; no wrong metro detected | none | self-canonical | `index, follow` | PASS |
| `/scholarships/california/california-state-university-northridge` | 200 | yes | yes | `Northridge, CA` shown; HUD-only card is appropriate | none | self-canonical | `index, follow` | PASS |
| `/providers/loyola-university-chicago` | 200 | yes | yes | `Chicago, IL` and Chicago metro shown; no wrong city/metro detected | none | self-canonical | no explicit robots meta | PASS |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | yes | yes | Amherst and Tampa context present; no wrong city/metro detected | none | self-canonical | `noindex, follow` | PASS |
| `/resources/best-scholarships-texas-international-students` | 200 | no | no | no city card rendered, which is correct for this page | none | self-canonical | no explicit robots meta | PASS |
| `/resources/best-scholarship-websites` | 200 | no | no | generic resource page stayed clean; no city card rendered | none | self-canonical | no explicit robots meta | PASS |

## Content Checks

- No 500 pages were observed.
- No visible `undefined`, `null`, or literal `NaN` strings were observed in rendered page copy.
- `City rent and wage context` appeared only on the expected scholarship, provider, and compare routes.
- The generic resource page `/resources/best-scholarship-websites` did not show a city card.
- No wrong city or metro match was observed on the checked routes.
- No `best/worst`, `cheap/expensive ranking`, `safe/unsafe`, or eligibility-claim wording was found inside the city rent/wage context blocks.
- Canonical and robots behavior looked unchanged from route expectations:
  - scholarship detail pages: self-canonical, `index, follow`
  - compare university detail page: self-canonical, `noindex, follow`
  - provider/resource pages checked: self-canonical, no explicit robots meta

## Notes

- Scholarship pages still contain normal scholarship eligibility language outside the city card, which is expected and unrelated to D9.
- One compare route showed two city context blocks as expected for the two-school layout.

## Performance Warnings

- None observed during this smoke pass.
