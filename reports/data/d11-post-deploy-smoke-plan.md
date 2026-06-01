# D11 Post-Deploy Smoke Plan

Base URL: `https://scholarshiptop.com`

## Routes

| Route | Expected result |
|---|---|
| `/resources/medical-scholarships-guide` | 200; planning sections visible; healthcare planning card present |
| `/essays/career-goals` | 200; healthcare planning card + career goals planning section |
| `/resources/how-to-find-scholarships` | 200; no healthcare planning card |
| `/resources/best-scholarship-websites` | 200; no healthcare planning card |
| `/providers/loyola-university-chicago` | 200; no wrong Stritch/medical school card |
| `/scholarships/texas` | 200; no broad medical block |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200; no broad medical block |

## Checks

- HTTP 200; no 500
- No visible `undefined`, `null`, or `NaN`
- Medical/pre-med context only on expected routes
- Generic pages remain clean
- No residency/hospital/NPPES/CMS/Open Payments blocks
- No wrong medical school match on Loyola
- Canonical/robots unchanged
- No Supabase/Auth/Payments behavior involved

## Rollback trigger

Rollback only if:

- a smoke route 500s
- generic pages show healthcare planning cards
- Loyola or another university provider shows a wrong medical school card
