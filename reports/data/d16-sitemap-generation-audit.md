# D16 Sitemap Generation Audit

Date: 2026-06-01

## Sitemap index

| Component | Location |
|---|---|
| Index route | `app/sitemap.xml/route.ts` → `buildSitemapIndexDocuments()` |
| Child sitemap routes | `app/sitemaps/[slug]/route.ts` → `getSitemapDocumentBySlug()` |
| Core logic | `lib/seo/sitemaps.ts` |
| Slug dispatch | `lib/seo/sitemapSlugDispatcher.ts` |

`/sitemap.xml` is a lightweight index listing shard URLs (`core.xml`, `resources.xml`, `essays-N.xml`, `providers.xml`, `seo.xml`, `scholarships-0.xml`, `compare.xml`, localized pilots, etc.).

## Resource URL generation

`buildResourcesSitemapEntries()` in `lib/seo/sitemaps.ts` merges:

1. **CMS posts** — `fetchAllPublishedContentPostsForSitemap()` → `/resources/{slug}`
2. **Static manifest** — `STATIC_SCHOLARSHIP_GUIDES` from `lib/resources/staticScholarshipGuides.ts` (9 slugs)

Output bucket: **`resources.xml`**

## Why `/resources/medical-scholarships-guide` was missing

The medical guide is a **dedicated Next.js app route** (`app/resources/medical-scholarships-guide/page.tsx`), registered in `RESOURCE_GUIDE_SLUGS` (`lib/scholarships/resourceGuideRoutes.ts`) for href normalization and internal links.

It is **not** in `STATIC_SCHOLARSHIP_GUIDES` (CMS-style manifest with title/body for `/resources/[slug]` dynamic route) and is **not** a `content_posts` row.

Therefore `buildResourcesSitemapEntries()` never emitted it.

Same pattern affects other dedicated guides (`how-to-apply-for-scholarships`, `scholarship-deadlines-explained`, `combine-multiple-scholarships`, `scholarships-for-international-students-guide`) — D16 fix covers all `RESOURCE_GUIDE_SLUGS` not already in `STATIC_SCHOLARSHIP_GUIDES`.

## Safest fix

Add `buildDedicatedResourceGuideSitemapEntries()` in **`lib/seo/dedicatedResourceGuideSitemap.ts`**:

- Source of truth: `RESOURCE_GUIDE_SLUGS`
- Exclude slugs already in `STATIC_SCHOLARSHIP_GUIDES` (dedupe)
- Concat into `resources` bucket in `buildResourcesSitemapEntries()`

**Why this is safe:**

- Only adds indexable dedicated `/resources/*` routes already live in production
- No robots/canonical/noindex changes
- No new datasets or Supabase changes
- Dedupes against existing manifest slugs

## Priority URL sitemap status (pre-fix production)

| URL | Expected | Pre-fix production |
|---|---|---|
| `/resources/medical-scholarships-guide` | yes | **missing** |
| `/essays/career-goals` | yes | essays-0 ✓ |
| `/resources/best-scholarships-texas-international-students` | yes | resources ✓ |
| `/providers/loyola-university-chicago` | yes | providers ✓ |
| `/scholarships/texas` | no (noindex) | in seo.xml (existing policy) |
| `/compare/states/california-vs-texas` | no (noindex) | absent ✓ |
| `/compare/universities/...-south-florida` | no (noindex) | absent from targeted buckets ✓ |

## Files changed in D16

- `lib/seo/dedicatedResourceGuideSitemap.ts` (new)
- `lib/seo/sitemaps.ts` (concat dedicated entries)
- `lib/seo/__tests__/dedicatedResourceGuideSitemap.test.ts` (new)
- `scripts/seo/verify-sitemap-priority-urls.ts` (new verification script)
