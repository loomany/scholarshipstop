# Supabase Egress + Cache Audit

## Executive Summary

ScholarshipTop has multiple public SEO pages with `revalidate` set (good), but public traffic still triggers substantial Supabase reads because many route handlers and SSR pathways are explicitly dynamic or read auth cookies. The heaviest likely egress sources are scholarship listing/detail fetches, provider/content detail fetches, and sitemap generation hitting Supabase repeatedly.  
Current “low cached egress” is consistent with a system where cacheable edges exist for some HTML, but most data access is still request-time Supabase calls (or private/no-store API responses that bypass shared cache).

## Current Risk

- **Cost risk (high):** Public crawl traffic can repeatedly hit Supabase for SEO pages, list APIs, and sitemap builders.
- **Performance risk (medium):** Dynamic/API no-store behavior increases TTFB under bot bursts.
- **SEO risk (medium):** Some public routes are safely cacheable, but auth-aware route internals can accidentally force dynamic behavior if not split cleanly.
- **Security risk (low in current state):** Private routes are mostly correctly `force-dynamic`/auth-gated/no-store; main risk is accidental public caching of personalized API outputs if changed incorrectly.

## Route Cache Matrix

| Route group | Public/private | Uses cookies/session | Supabase SSR | Current cache behavior | Safe to cache? | Recommended TTL | SEO risk |
|---|---|---:|---:|---|---|---|---|
| `/` | Public | No direct cookies in page | Indirect via async components/content fetch | `revalidate = 300` in `app/page.tsx` | Yes | 300s | Low |
| `/scholarships` | Public shell + optional auth-aware personalization | Yes (server auth probe in page body) | Yes, public + optional cookie client in `scholarshipsSlugPathPageBody` | `revalidate = 300` at page, but runtime fetch paths are dynamic/auth-mixed | Conditionally (anon variant only) | 60-300s anon; no-store personalized | Medium if mixed guest/auth HTML is cached |
| `/scholarships/hub/*` | Public SEO/listing | Same as above | Yes | Same as above (`revalidate=300` page wrapper, dynamic internals) | Anon only | 60-300s | Medium |
| `/scholarships/[slug]` (implemented via catch-all) | Public detail | Auth snapshot bridge present | Yes (detail + related fetches) | SSR fetch on each render path; no explicit page cache beyond segment | Anon detail payload can be cached if decoupled from auth | 300-900s anon detail shell | Medium (premium-field redaction differs by auth) |
| `/providers` | Public | No cookie read in page | Yes (`fetchProviderHubListing`) | `revalidate = 300` in `app/providers/page.tsx` | Yes | 300s | Low |
| `/providers/[id]` | Public | No cookie/session in page | Yes (`getCachedProviderProfilePage`) | `revalidate = 60` + `unstable_cache` 60s in provider server | Yes | 60-300s | Low |
| `/resources` | Public | No | Yes (`fetchAllPublishedContentPostsListFields`) | `revalidate = 300` | Yes | 300s | Low |
| `/resources/[slug]` | Public | No | Yes (`fetchPublishedContentPostBySlug`, related scholarships) | `revalidate = 300`; post fetch is `unstable_cache(300)` | Yes | 300-900s | Low |
| `/essays` | Public | No | Yes (`fetchEssaysHubIndexPage`) | `revalidate = 300` | Yes | 300s | Low |
| `/essays/[slug]` | Public | No | Yes (`fetchPublishedEssayBySlug`, related scholarships/resources) | `revalidate = 300`; detail fetch cached 300s | Yes | 300-900s | Low |
| `robots` | Public | No | No | Static metadata route (`app/robots.ts`) | Yes | Long (1d+) | Low |
| `sitemap index` `/sitemap.xml` | Public | No | Yes (`buildSitemapDocuments`) | `revalidate = SITEMAP_REVALIDATE_SECONDS`; explicit `Cache-Control public` | Yes | 3600s already | Low |
| `sitemap docs` `/sitemaps/[slug].xml` | Public | No | Yes (`getSitemapDocumentBySlug`) | Has both `revalidate` and `dynamic = 'force-dynamic'` + `public` cache header | Yes; remove dynamic force | 3600s | Low |

## API Cache Matrix

### Public/anonymous data APIs (candidate for public cache)

| Route | Type | Current cache | Supabase usage | Payload risk | Safe cache recommendation |
|---|---|---|---|---|---|
| `/api/scholarships` | Mixed (public + personalized) | Conditional: guest hub path can set `public, s-maxage=45`; otherwise `private, no-store` | Heavy (list/meta/profile reads) | High | Keep split behavior; expand anonymous fast-paths only |
| `/api/categories` | Public catalog metadata | `dynamic = force-dynamic`, no explicit public cache header | Reads `categories` table | Low | Safe for public `s-maxage=300-3600` |
| `/api/compare/university-match` | Public compare lookup | No explicit caching observed | Uses `createPublicClient` | Medium | Safe for short public cache if response is fully non-personalized |
| `/api/scholarships/university-suggestions` | Public suggestions | No explicit cache noted | Likely Supabase search | Medium | Short public cache (30-120s) |

### Authenticated/personalized APIs (must remain private/no-store)

`/api/account/*`, `/api/billing/*`, `/api/interviewer/*`, `/api/essay/*`, `/api/gpt/search`, `/api/scholarships/[slugOrId]`, `/api/account/saved-scholarships`, `/api/account/saved-filter-presets`, `/api/account/notification-preferences`, `/api/account/saved-filters-snapshot`, `/api/track-gpt-visit`, `/api/telemetry/ai-navigator-click`  
Reason: user session + profile/subscription + personal content/quota/actions.

### Internal/service/webhook/sensitive APIs (never public-cache)

`/api/internal/*`, `/api/webhooks`, `/api/telegram/webhook`, `/api/auth/* callback-like flows`, `/api/revalidate`, `/api/cron/*`, `/api/internal/google-indexing*`, `/api/internal/seo/*`, `/api/internal/subscription-debug`, `/api/internal/lemon-webhook-debug`, `/api/internal/resources/*`, `/api/internal/grant-notifications/*`  
Reason: service-role, signatures, revalidation side effects, queue workers, admin/debug operations.

## Heavy Payload Findings

### `select('*')` and broad payload hotspots

- `app/api/scholarships/route.ts:100` -> profile read with `.select('*')` (user profile payload in hot list API path).
- `app/scholarships/scholarshipsSlugPathPageBody.tsx:198` -> profile `.select('*')` during hub SSR auth probe.
- `lib/providers/providerProfileServer.ts:314` and `:338` -> `providers.select('*')` (provider detail rows).
- `lib/content-hub/contentPostsServer.ts:183` -> `content_posts.select('*')` for resource detail fetch.
- `app/api/billing/update-subscription/route.ts:65`, `app/api/billing/skip-trial/route.ts:56`, `app/api/billing/resume-subscription/route.ts:42`, `app/api/billing/cancel-subscription/route.ts:41` -> subscription rows via `select('*')`.
- `app/api/webhooks/route.ts:165` and `:421` -> internal webhook reads with `select('*')`.

### Listing payloads likely larger than needed

- `lib/scholarships/supabase.ts` `LISTING_CARD_SELECT_COLUMNS` includes many fields including `raw_data` (`:198`) in list-card select baseline.
- `PUBLIC_LIST_CARD_SELECT` strips some internals, but list payload remains wide for cards.
- `ACTIVE_CATALOG_SELECT` includes long text/SEO fields (`description`, `seo_*`, etc.) and can inflate transfer.
- Commented note confirms payload-size risk in scripts (`SCRIPT_CATALOG_PAGE_SIZE = 300`, lines `41-45`).

### Detail-only fields leaking risk

- Scholarship list card base includes `raw_data`; if this path is used in high-frequency list APIs it can inflate egress.
- Content post detail currently uses `select('*')`; article page likely needs a narrower field list.

## No-store / Dynamic Findings

### Explicit dynamic/no-store markers

- `app/api/scholarships/route.ts:53` -> `dynamic = 'force-dynamic'`
- `app/api/scholarships/route.ts:595` and `:876` -> `Cache-Control: private, no-store`
- `app/api/scholarships/[slugOrId]/route.ts:33` -> `private, no-store`
- `app/account/page.tsx:21` + `:24` -> `force-dynamic` + `noStore()`
- `app/subscription/page.tsx:26` + `:59` -> `force-dynamic` + `noStore()`
- `app/sitemaps/[slug]/route.ts:10` -> `dynamic = 'force-dynamic'` (despite revalidate/public cache header)
- `app/api/categories/route.ts:5` -> `force-dynamic`
- Many auth/internal APIs set `force-dynamic` (analytics, billing, essay, interviewer, internal SEO/indexing/resources, webhooks).

### Cookie/header usage that can force dynamic render paths

- `app/layout.tsx:124` -> `headers()`
- `app/signin/[id]/page.tsx:39` -> `cookies()`
- `utils/supabase/server.ts:8` -> `cookies()` in server Supabase client constructor
- `utils/auth-helpers/server.ts` and `utils/auth-email-redirect.server.ts` read headers/cookies for auth flows.

### Supabase server client usage in render paths

- `app/scholarships/scholarshipsSlugPathPageBody.tsx` uses both `createPublicClient` and `createServerSupabase` with auth probe.
- `app/providers/[id]/page.tsx` -> `getCachedProviderProfilePage` (Supabase-backed) + `revalidate=60`.
- `app/resources/[slug]/page.tsx` and `app/essays/[slug]/page.tsx` -> Supabase-backed content/detail SSR.

## SEO Impact

- Public routes already implement canonical + robots controls for non-canonical query variants:
  - `/scholarships` catch-all metadata sets canonical + conditional `noindex` for noise query.
  - `/providers` and `/providers/[id]` mark non-canonical listing states as `noindex`.
  - `/resources` and `/essays` set canonical base and `noindex` for filtered/paginated variants.
- Sitemap generation is robust and includes drip logic/canonical eligibility in `lib/seo/sitemaps.ts`.
- Main SEO-safe caching rule: only cache anon-stable HTML/data where canonical/robots do not depend on session.  
  Current public metadata logic appears query-based, not session-based, so anon cache is generally SEO-safe.
- High-risk area: scholarship detail/list endpoints with auth-based field redaction (premium fields). These must not share cached personalized payloads publicly.

## Top 5 Fix Candidates

1. **Split anonymous scholarship listing path harder from auth path**
   - Expected egress reduction: **high**
   - Difficulty: medium
   - SEO risk: low-medium (if canonical behavior unchanged)
   - Rollback: toggle by env flag on list API path selection.

2. **Remove `dynamic='force-dynamic'` from public sitemap doc route**
   - Expected egress reduction: **medium**
   - Difficulty: low
   - SEO risk: low
   - Rollback: re-add dynamic flag.

3. **Narrow `select('*')` in high-traffic public content/detail fetches**
   - Expected egress reduction: **medium**
   - Difficulty: medium
   - SEO risk: low if fields preserved
   - Rollback: restore previous select list.

4. **Add explicit public cache headers to safe anonymous APIs (`/api/categories`, compare/suggestions if anonymous)**
   - Expected egress reduction: **medium**
   - Difficulty: low-medium
   - SEO risk: low
   - Rollback: remove cache headers.

5. **Reduce list payload width (exclude heavy fields like `raw_data` from card/list paths)**
   - Expected egress reduction: **high** on bot/list traffic
   - Difficulty: medium-high (field contract checks)
   - SEO risk: low if card UI fields retained
   - Rollback: restore old select constant.

## Questions Before Coding

1. Can we treat scholarship list responses as strictly anonymous for non-authenticated users and never include profile-derived counts in that response?
2. Should guest `/scholarships` “best/recommended” behavior remain real-time personalized-preview, or can it be simplified to static guest defaults?
3. Is it acceptable to enforce a strict field budget for all list cards (scholarships/providers/resources), even if some UI badges disappear?
4. Should `/api/categories` and other anonymous metadata APIs be allowed CDN/shared cache with `s-maxage`?
5. Do we want bot-oriented caching strategy at app layer first, or defer to edge layer later (without changing Cloudflare now)?
6. For scholarship detail, is a fully anonymous cached payload acceptable while premium/user-specific enrichments load client-side?
7. Are internal debug routes intended to remain deploy-exposed, or should they be gated tighter before cache work?

