# D13 Post-Deploy Smoke Result

Date: 2026-06-01  
Base: https://scholarshiptop.com  
Deployed commit: `a5cb7ba` (`feat(seo): polish medical and state planning copy`)  
Prior production commit: `ce73c61`

## Verdict

**PASS**

Rollback needed: **no**  
D14 can start: **yes**

## Route Table

| URL | HTTP | Expected copy/context | Actual copy/context | Duplicate links | Bad tokens | Canonical | Robots | Result |
|---|---:|---|---|---|---|---|---|---|
| `/resources/medical-scholarships-guide` | 200 | D13 lead + planning sections; single cluster block | **Medical scholarship planning context** lead visible; **Use these data points as planning context** present; **Continue your healthcare scholarship research** cluster present; **Useful internal links** section removed | single-block (title in nav + visible label) | none | self-canonical | none | **PASS** |
| `/essays/career-goals` | 200 | Essay-writing healthcare planning copy + single cluster | **When writing a career-goals essay** visible; **Planning pages for your essay research** cluster present | single-block | none | self-canonical | none | **PASS** |
| `/scholarships/texas` | 200 | Improved state GEO summary | **Scholarship value can feel different** + **Why this matters for scholarship planning** callout visible | none | none | self-canonical | `noindex, follow` | **PASS** |
| `/scholarships/california` | 200 | Improved state GEO summary | **Scholarship value can feel different** visible | none | none | self-canonical | `noindex, follow` | **PASS** |
| `/scholarships/new-york` | 200 | Improved state GEO summary | **Scholarship value can feel different** visible | none | none | self-canonical | `noindex, follow` | **PASS** |
| `/scholarships/florida` | 200 | Improved state GEO summary | **Scholarship value can feel different** visible | none | none | self-canonical | `noindex, follow` | **PASS** |
| `/scholarships/illinois` | 200 | Improved state GEO summary | **Scholarship value can feel different** visible | none | none | self-canonical | `noindex, follow` | **PASS** |
| `/resources/how-to-find-scholarships` | 200 | Generic page stays clean | No medical/healthcare planning blocks | none | none | self-canonical | none | **PASS** |
| `/resources/best-scholarship-websites` | 200 | Generic page stays clean | No medical/healthcare planning blocks | none | none | self-canonical | none | **PASS** |

CSV: `reports/data/d13-post-deploy-smoke.csv`

## Content Checks

- All 9 routes returned HTTP 200; no 500 pages observed.
- No visible `undefined`, `null`, or literal `NaN` strings in rendered copy (script/style excluded).
- D13 GEO copy live on medical guide, career-goals, and top 5 state scholarship pages.
- Medical guide duplicate **Useful internal links** section removed on production.
- Career-goals and medical guide each show one SmartRelatedLinks cluster (title may appear in aria-label + visible heading — not duplicate blocks).
- Generic resource pages remain clean.
- No residency/hospital-only enrichment blocks observed.
- Forbidden claim wording not detected as live claims (negations like “not a scholarship eligibility rule” are present and acceptable).
- Canonical and robots behavior unchanged from prior expectations.
- No Supabase, Auth, or Payments behavior involved.

## Pre-Push Verification (same session)

| Check | Result |
|---|---|
| Commit scope (`a5cb7ba`) | 14 D13-only files; no i18n/seo/supabase/env/auth/policy files |
| `npm run data:validate-enrichment` | PASS |
| `npm run seo:validate-jsonld` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `git push origin main` | `ce73c61..a5cb7ba` |

## Performance Warnings

Rough HTML fetch times during smoke:

| Route | ms |
|---|---:|
| `/resources/medical-scholarships-guide` | ~692 |
| `/essays/career-goals` | ~283 |
| `/resources/how-to-find-scholarships` | ~289 |
| `/resources/best-scholarship-websites` | ~1,219 |
| `/scholarships/california` | ~3,402 |
| `/scholarships/new-york` | ~3,708 |
| `/scholarships/florida` | ~3,843 |
| `/scholarships/illinois` | ~3,424 |
| `/scholarships/texas` | ~3,966 |

State listing routes remain slower than content pages due to listing payload — unchanged from D12; not a D13 regression.

Initial smoke at T+45s after push failed (old `ce73c61` still served). Re-check at T+~3m confirmed D13 copy live.

## Rollback

Not needed.
