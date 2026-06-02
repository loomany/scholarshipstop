# D10 Post-Deploy Smoke Result

Date: 2026-06-01
Base: https://scholarshiptop.com
Commit expected in production: `ba9ccae` (`feat(data): add medical scholarship context layer`)

## Verdict

PASS

Rollback needed: no

D11 can start: yes

## Route Table

| URL | HTTP | Expected context | Actual context | Bad tokens | Canonical | Robots | Result |
|---|---:|---|---|---|---|---|---|
| `/resources/medical-scholarships-guide` | 200 | Medical/pre-med planning card on dedicated guide | Guide renders with title, FAQ, body sections, and `Healthcare planning context` card topic **Medical school scholarships** | none | self-canonical | no explicit robots meta | PASS |
| `/essays/career-goals` | 200 | Healthcare/career planning card allowed for this essay slug | `Healthcare planning context` card topic **First-generation pre-med** with planning disclaimer | none | self-canonical | no explicit robots meta | PASS |
| `/providers/loyola-university-chicago` | 200 | No wrong medical school match; college/provider context only if matched | Matched to **Loyola University Chicago** from College Scorecard; city rent card present; **no** `Medical school context`, **no** Stritch School of Medicine | none | self-canonical | no explicit robots meta | PASS |
| `/resources/how-to-find-scholarships` | 200 | Generic page stays clean | No healthcare planning card, no medical school block, no health workforce block | none | self-canonical | no explicit robots meta | PASS |
| `/resources/best-scholarship-websites` | 200 | Generic page stays clean | No healthcare planning card, no medical school block, no health workforce block | none | self-canonical | no explicit robots meta | PASS |
| `/scholarships/texas` | 200 | No broad medical/pre-med block on state listing | No healthcare planning card, no medical school block, no health workforce block | none | self-canonical | `noindex, follow` | PASS |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | No broad medical/pre-med block on general compare page | City rent cards only (expected D9 compare layout); no healthcare planning card, no medical school block | none | self-canonical | `noindex, follow` | PASS |

## Content Checks

- All seven routes returned HTTP 200 on the smoke pass. One initial probe of `/resources/medical-scholarships-guide` returned a transient Cloudflare `520`; immediate retry returned `200` and the route remained stable on subsequent checks.
- No 500 pages were observed.
- No visible `undefined`, `null`, or literal `NaN` strings were observed in rendered page copy (script/style blocks excluded).
- `Healthcare planning context` appeared only on the expected medical guide and career-goals essay routes.
- Generic resource pages `/resources/how-to-find-scholarships` and `/resources/best-scholarship-websites` stayed clean.
- `/scholarships/texas` and the university compare route did not show broad medical/pre-med cards.
- No residency-program, hospital-quality, NPPES, CMS provider, or Open Payments enrichment blocks were observed.
- Loyola provider page matched the undergraduate institution only; no wrong Stritch School of Medicine card appeared.
- Canonical and robots behavior matched route expectations and appeared unchanged:
  - resource/essay/provider pages checked: self-canonical, no explicit robots meta
  - `/scholarships/texas`: self-canonical, `noindex, follow`
  - compare university page: self-canonical, `noindex, follow`
- No Supabase, Auth, or Payments behavior was involved in these checks.

## Notes

- `/resources/best-scholarship-websites` still contains normal editorial mentions of visa/residency eligibility language in article copy. That is expected page content, not D10 enrichment UI.
- `/essays/career-goals` maps to the curated **First-generation pre-med** topic via the D10 page-target index; this is expected for the career-goals slug override.
- `/providers/loyola-university-chicago` still shows existing D9 city rent context alongside college/provider context; no D10 medical-school card was added incorrectly.

## Performance Warnings

- Rough fetch timings during smoke (HTML download only):
  - `/resources/medical-scholarships-guide`: ~0.95s
  - `/essays/career-goals`: ~0.36s
  - `/providers/loyola-university-chicago`: ~0.88s
  - `/resources/how-to-find-scholarships`: ~0.34s
  - `/resources/best-scholarship-websites`: ~1.17s
  - `/scholarships/texas`: ~1.51s
  - `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`: ~3.20s
- No new performance regressions were observed relative to prior compare/state route weight. Compare remains the slowest checked route because of dual-school enrichment payload size.
- One transient Cloudflare `520` on the first medical-guide probe is worth monitoring, but it did not reproduce on retry and is not treated as a deploy blocker.
