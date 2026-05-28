# RSS Stage 1 Implementation Report - ScholarshipTop

Date: 2026-05-28
Mode: RSS-related implementation only. No push.

## Summary

RSS Stage 1 is implemented for the safe public content groups requested from the inventory audit:

| Feed | Status | Local live item count | Source groups |
|---|---:|---:|---|
| `/rss.xml` | Implemented | 500 | Curated master mix from resources, essays, compare guides, and category pages |
| `/rss/resources.xml` | Implemented | 926 | Published EN `content_posts`, static resource guides, resources hub |
| `/rss/essays.xml` | Implemented | 12 | EN static essay guides and essays hub; generated DB essays are included only when the public query returns rows that pass the essay SEO quality policy |
| `/rss/compare.xml` | Implemented | 5 | `/compare` hub and static compare guides |
| `/rss/categories.xml` | Implemented | 11 | Promoted scholarship category pages |

The feeds return RSS 2.0 XML with `title`, `link`, `description`, `pubDate`, and `guid` for every item. All links/guid values are absolute `https://scholarshiptop.com` URLs.

## Files Added

- `app/rss.xml/route.ts`
- `app/rss/resources.xml/route.ts`
- `app/rss/essays.xml/route.ts`
- `app/rss/compare.xml/route.ts`
- `app/rss/categories.xml/route.ts`
- `lib/rss/rssXml.ts`
- `lib/rss/rssRoute.ts`
- `lib/rss/stage1Feeds.ts`
- `scripts/seo/validate-rss-stage1.ts`
- `reports/seo/rss-stage-1-implementation-report-2026-05-28.md`

## Implementation Notes

- Feed routes are `force-dynamic` so `next build` does not perform DB-backed RSS generation.
- Responses are cacheable with `Cache-Control: public, max-age=300, s-maxage=3600`.
- `HEAD` handlers return RSS headers without generating the feed body, keeping crawler/header checks cheap.
- Read-only DB calls use the existing public Supabase client and an 8 second abort timeout. If DB content is unavailable, feeds fall back to safe static entries instead of returning a 500.
- The master feed caps at 500 items and reserves room for essays, comparison guides, and categories while filling the remaining safe capacity from resources.
- No RSS route was added yet for scholarships, providers, or GEO pages.

## Source Groups

Included now:

- Published EN resources from `content_posts` with `published_at` or `updated_at`.
- Static scholarship/resource guides with the existing stable source date used by the sitemap layer.
- EN static essay guides with `updatedAt`.
- Generated EN essay guides only if returned by the public essays query and passing `getEssaySeoQualityPolicy`.
- Static compare guides with `updatedAt`.
- Promoted scholarship categories from the existing category allowlist.

Excluded in Stage 1:

- `/rss/scholarships.xml`
- `/rss/providers.xml`
- `/rss/geo.xml`
- localized essay pages, because the audit found 404/noindex mismatch
- thin SEO examples such as `/scholarships/california` and `/scholarships/no-essay`
- auth/account/dashboard/checkout/payment/API/admin/onboarding/user-specific URLs

## Validation

`git diff --check`

- Passed.
- Only pre-existing line-ending warnings were printed for unrelated `reports/seo/i18n-*` files.

`npm run build`

- Passed.
- RSS routes appear as dynamic server-rendered routes:
  - `/rss.xml`
  - `/rss/categories.xml`
  - `/rss/compare.xml`
  - `/rss/essays.xml`
  - `/rss/resources.xml`

Static RSS builder validation:

```json
{
  "/rss.xml": 38,
  "/rss/resources.xml": 10,
  "/rss/essays.xml": 12,
  "/rss/compare.xml": 5,
  "/rss/categories.xml": 11
}
```

Note: `npx tsx scripts/seo/validate-rss-stage1.ts` does not load `.env.local`, so that run validates the static fallback path without DB rows.

Local production-style live validation with `next start -p 3028`:

```json
{
  "/rss.xml": 500,
  "/rss/resources.xml": 926,
  "/rss/essays.xml": 12,
  "/rss/compare.xml": 5,
  "/rss/categories.xml": 11
}
```

The live validator confirmed:

- status `200`
- RSS root present
- `Content-Type: application/rss+xml; charset=utf-8`
- no duplicate `guid`
- no duplicate `link`
- no `localhost`, `127.0.0.1`, `staging`, or `preview` URLs in feed XML
- no disallowed URL patterns such as `/api`, `/account`, `/dashboard`, `/checkout`, `/payments`, `/onboarding`, `/admin`, `/auth`, `/login`, `/signup`, `/profile`, `/settings`, `/essay/`, or `/essays/u/`

## Curl HEAD Results

Checked against local production server at `http://localhost:3028` after `npm run build`:

| Feed | Status | Content-Type | Cache-Control |
|---|---:|---|---|
| `/rss.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` |
| `/rss/resources.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` |
| `/rss/essays.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` |
| `/rss/compare.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` |
| `/rss/categories.xml` | 200 | `application/rss+xml; charset=utf-8` | `public, max-age=300, s-maxage=3600` |

## Protected Areas

Confirmed untouched:

- auth
- payments
- Lemon Squeezy
- checkout
- onboarding
- Supabase RLS
- DB schema and migrations
- SEO policy/noindex rules
- sitemap logic
- robots.txt
- Cloudflare/env

## Remaining Work

Stage 2:

- Add `/rss/scholarships.xml` with strict active/indexable/expired quality gates.
- Add `/rss/providers.xml` only after provider date/source-quality rules are finalized.

Stage 3:

- Add `/rss/geo.xml` only after GEO/thin-page gates are verified.
- Consider `rel="alternate"` and optional robots/feed discovery links after production RSS smoke is complete.
