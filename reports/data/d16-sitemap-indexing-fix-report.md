# D16 Sitemap Indexing Fix Report

Date: 2026-06-01

## Problem

D15 found `/resources/medical-scholarships-guide`:

- HTTP 200, indexable, self-canonical, enriched content live
- **Missing from all sitemap buckets**

This blocked optimal crawl discovery for the medical/pre-med scholarship cluster flagship page.

## Root cause

Sitemap resource entries come from CMS `content_posts` + `STATIC_SCHOLARSHIP_GUIDES` manifest only.

The medical guide is a **dedicated app route** listed in `RESOURCE_GUIDE_SLUGS` but outside both sources.

## Fix

New module `lib/seo/dedicatedResourceGuideSitemap.ts`:

- Maps `RESOURCE_GUIDE_SLUGS` → `resources.xml` entries
- Skips slugs already covered by `STATIC_SCHOLARSHIP_GUIDES`

Wired into `buildResourcesSitemapEntries()` in `lib/seo/sitemaps.ts`.

**Primary URL fixed:** `/resources/medical-scholarships-guide`

**Also included (same class, indexable dedicated routes):**

- `/resources/how-to-apply-for-scholarships`
- `/resources/scholarship-deadlines-explained`
- `/resources/combine-multiple-scholarships`
- `/resources/scholarships-for-international-students-guide`

## What did not change

- robots / canonical / noindex policy
- State listing `noindex` pages
- Compare detail `noindex` pages
- Supabase / Auth / Payments
- Static enrichment JSON datasets

## Verification

| URL | Post-fix code | Live prod (pre-deploy) |
|---|---|---|
| `/resources/medical-scholarships-guide` | **in resources bucket** | pending deploy |
| `/essays/career-goals` | unchanged | ok (essays-0) |
| `/providers/loyola-university-chicago` | unchanged | ok (providers) |
| noindex compare pages | unchanged | correctly absent / note only |

Script: `scripts/seo/verify-sitemap-priority-urls.ts`

## GSC

API 403 remains a **manual permission task** — see `d16-gsc-access-fix-checklist.md`. Not a code defect.

## Suggested commit

```
fix(seo): include medical scholarship guide in sitemap
```

## Next step after deploy

1. Post-deploy smoke (`d16-post-deploy-smoke-plan.md`)
2. GSC URL Inspection + request indexing for medical guide
3. Grant service account GSC access for automated feedback loop
