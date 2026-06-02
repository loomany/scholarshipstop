# D11 Post-Deploy Smoke Result

Date: 2026-06-01
Base: https://scholarshiptop.com
Expected production commit: `ce73c61` (`feat(seo): strengthen medical scholarship topic cluster`)

## Verdict

PASS

Rollback needed: no

D12 can start: yes

## Route Table

| URL | HTTP | Expected context | Actual context | Bad tokens | Canonical | Robots | Result |
|---|---:|---|---|---|---|---|---|
| `/resources/medical-scholarships-guide` | 200 | D11 planning sections + healthcare planning card | **Medical school scholarships** card; sections **What this data can and cannot tell you**, **Health workforce planning context**, **Medical school planning context**, **Related next steps**, **Source note** | none | self-canonical | no explicit robots meta | PASS |
| `/essays/career-goals` | 200 | Healthcare planning card + career goals planning section | **STEM to medical career path** card; **Healthcare career goals planning context** section with related planning links | none | self-canonical | no explicit robots meta | PASS |
| `/resources/how-to-find-scholarships` | 200 | Generic page stays clean | No healthcare planning card or D11 medical sections | none | self-canonical | no explicit robots meta | PASS |
| `/resources/best-scholarship-websites` | 200 | Generic page stays clean | No healthcare planning card or D11 medical sections | none | self-canonical | no explicit robots meta | PASS |
| `/providers/loyola-university-chicago` | 200 | No wrong medical school match | College/provider context for **Loyola University Chicago**; **no** Stritch card; **no** `Medical school context` block | none | self-canonical | no explicit robots meta | PASS |
| `/scholarships/texas` | 200 | No broad medical block | No healthcare planning card or D11 medical sections | none | self-canonical | `noindex, follow` | PASS |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | No broad medical block | City rent context only (expected D9 compare layout); no D11 healthcare sections | none | self-canonical | `noindex, follow` | PASS |

## Content Checks

- All seven routes returned HTTP 200; no 500 pages observed.
- No visible `undefined`, `null`, or literal `NaN` strings were observed in rendered page copy (script/style blocks excluded).
- D11 planning sections appear only on `/resources/medical-scholarships-guide`.
- Healthcare career goals planning section appears only on `/essays/career-goals`.
- Generic resource pages `/resources/how-to-find-scholarships` and `/resources/best-scholarship-websites` stayed clean.
- `/scholarships/texas` and the university compare route did not show broad medical/pre-med blocks.
- No residency-program, hospital-quality, NPPES, CMS provider, or Open Payments enrichment blocks were observed.
- Loyola provider page matched the undergraduate institution only; **Stritch School of Medicine** did not appear.
- Canonical and robots behavior matched route expectations and appeared unchanged:
  - resource/essay/provider pages checked: self-canonical, no explicit robots meta
  - `/scholarships/texas`: self-canonical, `noindex, follow`
  - compare university page: self-canonical, `noindex, follow`
- No Supabase, Auth, or Payments behavior was involved in these checks.

## Notes

- `/essays/career-goals` now shows **STEM to medical career path** topic card (D11 topic resolution change from D10 first-generation-pre-med card).
- `/resources/best-scholarship-websites` still contains normal editorial mentions of visa/residency eligibility language in article copy; that is expected page content, not D11 enrichment UI.
- Compare route still shows expected D9 city rent cards for the two-school layout.

## Performance Warnings

Rough fetch timings during smoke (HTML download only):

- `/resources/medical-scholarships-guide`: ~2.02s
- `/essays/career-goals`: ~0.30s
- `/resources/how-to-find-scholarships`: ~0.23s
- `/resources/best-scholarship-websites`: ~1.24s
- `/providers/loyola-university-chicago`: ~2.22s
- `/scholarships/texas`: ~3.44s
- `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`: ~2.50s

No new performance regressions were observed relative to prior compare/state route weight. `/scholarships/texas` remains the slowest checked route because of listing payload size.
