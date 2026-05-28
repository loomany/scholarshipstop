# RSS Stage 2 Plan: Scholarships, Providers, GEO - 2026-05-28

## Verdict

- Do not implement `/rss/scholarships.xml`, `/rss/providers.xml`, or `/rss/geo.xml` yet.
- The next RSS feeds need quality gates because scholarship, provider, and GEO surfaces vary more in freshness, depth, and indexability than Stage 1 resources/essays/compare/categories.

## `/rss/scholarships.xml`

Recommended initial scope:

- Cap: 1000 items.
- Sorting: recently updated or newly published first, using a reliable source date only.
- Cache: same pattern as Stage 1, `public, max-age=300, s-maxage=3600`, with route-level revalidation.

Inclusion gates:

- Public canonical scholarship detail URL.
- 200 response.
- Indexable metadata, no `noindex`.
- Not private, tokenized, account, API, checkout, or application-only.
- Has stable title.
- Has provider name or provider path when available.
- Has deadline/amount/eligibility detail when available.
- Not expired, unless there is a deliberate evergreen expired-scholarship policy.
- Structured detail page has enough SSR text and useful internal links.

Exclusion gates:

- Expired with no evergreen value.
- Missing canonical or canonical mismatch.
- Noindex.
- Thin page or missing title.
- URLs with query strings, localhost, staging, preview, account, API, checkout, admin, or dashboard paths.

Risks:

- Expired scholarship pollution.
- Stale pubDate if using sitemap generation date.
- Large DB read if generated uncached.
- Duplicate provider/application paths if dedupe rules are weak.

## `/rss/providers.xml`

Recommended initial scope:

- Cap: 500-1000 items.
- Sorting: reliable provider content updated date if available; otherwise use a curated priority score, not invented dates.

Inclusion gates:

- Provider page returns 200.
- Canonical production URL.
- Indexable metadata, no `noindex`.
- Display name present.
- Meaningful SSR text.
- Connected scholarship count or useful provider context.
- No thin placeholder providers.

Exclusion gates:

- Weak provider pages with minimal text.
- Missing provider name.
- No connected scholarship or context.
- No reliable date source, unless feed omits that provider until date source is available.

Risks:

- Provider pages vary in depth; a broad provider RSS could amplify thin pages.
- `lastmod` from sitemap should not be treated as a real provider content date unless confirmed.

## `/rss/geo.xml`

Recommended initial scope:

- Cap: 250 items.
- Content: approved/indexable cross-country pages first.
- Sorting: reliable manifest updated date if available; otherwise curated priority order with stable dates only when source date is known.

Inclusion gates:

- Approved or approved-priority manifest status.
- `robots` resolves to index/follow.
- 200 response.
- Canonical production URL.
- Meaningful SSR text, ideally above 2500 chars.
- Useful scholarship/resource/internal links.

Exclusion gates:

- `manual_review`.
- `published_noindex`.
- Thin state/topic/degree pages.
- Pages with 404/noindex/canonical mismatch.
- Infinite combinations or noisy filter URLs.

Risks:

- GEO route families include both strong cross-country pages and thin state/topic filter pages.
- A single broad GEO feed would blur quality unless limited to approved cross-country rows first.

## Implementation stages

1. Build a read-only candidate validator for scholarships/providers/GEO.
2. Produce a candidate report with status, canonical, robots, text length, title, description, and internal links.
3. Implement one feed at a time behind strict gates.
4. Validate duplicate GUIDs, forbidden URLs, XML validity, and crawler access.
5. Add discovery links only after each feed passes production smoke.

## Acceptance criteria for Stage 2 feeds

- Every feed returns 200.
- `Content-Type: application/rss+xml; charset=utf-8`.
- Valid RSS 2.0 XML.
- Public, indexable, canonical production URLs only.
- No localhost/staging/preview.
- No private/auth/account/API/checkout/admin/dashboard/token URLs.
- No duplicate `guid` or `link`.
- Reliable `pubDate`; do not invent dates.
- RSS generation is cached and does not create heavy DB load.
- CCBot, GPTBot, Googlebot, and Bingbot receive 200.

## Protected areas

No implementation was performed for these feeds. No auth, payments, Lemon Squeezy, checkout, onboarding, Supabase RLS, DB schema, migrations, account/dashboard/profile, private user essay pages, private API endpoints, or pricing logic changed.
