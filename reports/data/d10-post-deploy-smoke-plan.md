# D10 Post-Deploy Smoke Plan

Base URL: `https://scholarshiptop.com`

## Routes

| Route | Expected result |
|---|---|
| `/resources/how-to-find-scholarships` | 200, generic page stays clean, no medical/pre-med card |
| `/resources/best-scholarship-websites` | 200, generic page stays clean, no medical/pre-med card |
| `/resources/medical-scholarships-guide` | 200, medical/pre-med planning context appears |
| `/essays/career-goals` | 200, career-goals essay may show healthcare planning context |
| `/providers/loyola-university-chicago` | 200, no wrong medical school match |
| `/scholarships/texas` | 200, no broad medical block on generic state scholarship page |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200, no broad medical block on general university compare page |

## Checks

- HTTP 200; no 500.
- No visible `undefined`, `null`, or `NaN`.
- Medical/pre-med/nursing context appears only on matching medical/healthcare/career-goals surfaces.
- Generic resource pages remain clean.
- No residency, program match, board pass, hospital-quality, NPPES, CMS, or Open Payments raw data appears.
- No best/worst/ranking wording.
- No admissions guarantee or scholarship eligibility claim.
- Canonical, robots, sitemap, and noindex policy unchanged.
- Supabase/Auth/Payments/RLS unchanged.
- Rollback needed: only if a route 500s, generic pages show medical cards, or a visible wrong school/provider match appears.
