# D16 Post-Deploy Smoke Result

Date: 2026-06-01  
Production commit: `4ad9a8c` (`fix(seo): include medical scholarship guide in sitemap`)  
Pushed: `origin/main` @ `4ad9a8c` (HEAD matches remote)  
Deploy propagation: ~4 minutes after initial push  
Closeout re-verification: production `--prod` script re-run PASS (medical guide in `resources.xml`)

## Verdict

**PASS**

Rollback needed: **no**

## Route table

| URL | HTTP | Canonical | Robots | Expected in sitemap | Found in sitemap | Sitemap bucket | Result |
|---|---:|---|---|---|---|---|---|
| `/resources/medical-scholarships-guide` | 200 | self | (none) | yes | yes | resources | **PASS** |
| `/essays/career-goals` | 200 | self | (none) | yes | yes | essays-0 | **PASS** |
| `/providers/loyola-university-chicago` | 200 | self | (none) | yes | yes | providers | **PASS** |
| `/resources/best-scholarships-texas-international-students` | 200 | self | (none) | yes | yes | resources | **PASS** |
| `/compare/states/california-vs-texas` | 200 | self | noindex, follow | no | no | — | **PASS** |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | self | noindex, follow | no | no | — | **PASS** |

## D16 primary fix validation

| Check | Result |
|---|---|
| Medical guide HTTP 200 | **PASS** |
| Self-canonical | **PASS** |
| No accidental noindex | **PASS** |
| Present in live `resources.xml` | **PASS** |
| `/sitemap.xml` lists `resources.xml` | **PASS** |
| Career-goals still in sitemap | **PASS** |
| Loyola provider still in sitemap | **PASS** |
| Noindex compare pages not newly forced into sitemap | **PASS** |
| robots/canonical/noindex policy unchanged | **PASS** |

## Pre-existing note (out of D16 scope)

| URL | Note |
|---|---|
| `/scholarships/texas/tarleton-state-university` | `index, follow` but university hub URL not in targeted sitemap buckets (pre-existing gap from D15/D16 verification). **Not introduced by D16.** |

## Script output

```bash
npx tsx scripts/seo/verify-sitemap-priority-urls.ts --prod
```

Medical guide: `found_in_sitemap=yes`, `sitemap_bucket=resources`, `result=ok`

CSV: `reports/data/d16-sitemap-targeted-verification.csv` (post-deploy run)

## GSC access

**Still manual** — service account GSC permission not changed in D16. See `reports/data/d16-gsc-access-fix-checklist.md`.

## Next recommended action

1. **URL Inspection** on `/resources/medical-scholarships-guide` → request indexing if not on Google or stale
2. Grant GSC property access to indexing service account (or manual Performance export)
3. Monitor medical guide impressions over 7/28 days

## Policy confirmation

No changes to canonical, robots, noindex, Auth, Payments, Supabase, or RLS in commit `4ad9a8c`.
