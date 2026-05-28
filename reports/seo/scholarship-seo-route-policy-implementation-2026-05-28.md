# Scholarship SEO Route Policy Implementation - 2026-05-28

## Files changed

- `lib/seo/scholarshipSeoQualityPolicy.ts`
- `app/scholarships/scholarshipSlugLayoutMetadata.ts`
- `lib/seo/sitemaps.ts`
- `lib/seo/__tests__/scholarshipSeoQualityPolicy.test.ts`
- `scripts/seo/audit-scholarship-seo-quality.ts`
- `artifacts/seo/scholarship-seo-quality-sample-2026-05-28.json`

## Metadata behavior

`generateScholarshipSlugLayoutMetadata` now applies the shared scholarship SEO route policy for:

- manifest SEO routes
- canonical redirects into scholarship SEO routes
- legacy long-tail routes

Weak routes receive:

```ts
robots: { index: false, follow: true }
```

Strong manifest routes continue to receive:

```ts
robots: { index: true, follow: true }
```

## Sitemap behavior

`buildSeoSitemapEntries` now filters:

- manifest SEO paths through the shared policy
- legacy long-tail paths through the shared policy
- state-only RPC rows through the shared policy
- programmatic generated hub rows through the shared policy

Protected sitemap groups were not changed:

- categories
- resources
- essays
- providers
- scholarship detail sitemaps
- compare
- RSS routes

## Known examples after implementation

| URL | Metadata | `seo.xml` |
|---|---|---|
| `/scholarships/california` | `noindex, follow` | removed |
| `/scholarships/no-essay` | `noindex, follow` | removed |
| `/scholarships/connecticut/high-school/nursing` | `noindex, follow` | removed |
| `/scholarships/texas/high-school/arts` | `noindex, follow` | removed |
| `/scholarships/engineering` | `index, follow` | remains |
| `/scholarships/for-students-from/canada/study-in/united-states` | `index, follow` | remains |

## Non-changes

- No RSS Stage 1 route changes.
- No auth, payments, Lemon, checkout, onboarding, Supabase RLS, DB schema, migrations, env, private APIs, or dashboard/account changes.
- No mass content generation.
