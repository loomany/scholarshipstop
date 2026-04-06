# Rendering & Caching Audit (code-based)

Date: 2026-04-05

## Scope scanned
- Next.js App Router pages under `app/**/page.tsx`
- Route handlers under `app/**/route.ts`
- Middleware and Supabase server helpers
- Scholarships hub/detail/category/resource code paths and API callers

## Key findings

1. **Project is mostly dynamic at runtime** for pages that touch Supabase server client, because `createClient()` depends on `cookies()`.
2. **No ISR/SSG primitives are currently configured** in app routes: no `revalidate`, no `generateStaticParams`, no `dynamic = 'force-static'`.
3. `/api/scholarships` already has a narrow **guest-only CDN cache policy** (`public, s-maxage=45, stale-while-revalidate=300`) for a very specific anonymous first-page hub listing; all other responses are `private, no-store`.
4. Middleware runs on almost all paths and always calls `supabase.auth.getUser()` to refresh session, which can set cookies and reduces safe full-page CDN caching opportunities.

## Route classifications (current state)

### Pages

| Route | Current behavior | Depends on auth? | User-specific data? | Current cache safety | Recommendation |
|---|---|---:|---:|---|---|
| `/` (home) | Dynamic SSR (server reads user) | Yes | CTA differs by logged-in state | Not safe for shared HTML cache | Keep SSR or split into static shell + client auth CTA |
| `/scholarships` | Dynamic SSR + client API hydration | Yes (SSR auth check + API meta/profile) | Yes for tabs/meta/subscription/profile seed | Hybrid: guest listing API partially cacheable; page HTML not shared-safe | Keep hybrid; optionally make guest shell static and fetch list client-side |
| `/scholarships/[detail-or-seo]` via catch-all | Dynamic SSR for detail + long-tail + manifest branches | Yes (passes `isAuthenticated`) | Detail UI actions & some listing behavior depend on auth | Not safe for shared HTML cache | For SEO variants, remove auth dependency and render static/ISR per path |
| `/scholarships/category/[slug]` | Dynamic SSR | Yes | `isAuthenticated` and list payload path | Not safe for full shared HTML cache | Move to ISR for guest category pages; fetch user-only meta client-side |
| `/resources` | Dynamic SSR (`force-dynamic`) | Indirect via server Supabase client | Not user-specific content-wise | Currently not cache-optimized despite public content | Candidate for ISR/SSG after using non-cookie server client |
| `/resources/[slug]` | Dynamic SSR (`force-dynamic`) | Indirect via server Supabase client | Public article content | Same as above | Strong ISR candidate (e.g., revalidate 300-900) |
| `/account` | Dynamic SSR private | Yes | Yes (profile/account) | Must stay private | Keep SSR + private/no-store |
| `/signin`, `/signin/[id]` | Dynamic SSR/redirect | Yes (cookies + auth) | Yes | Must stay private | Keep dynamic/private |
| `/onboarding` | Client page; runtime auth session checks on client | Yes (client-side) | Yes | HTML can be static, data flow private in browser | Keep as client route, avoid CDN caching user responses |
| `/saved-scholarships` | Redirect to tab URL | Indirect (target tab personalized in UX) | Yes after redirect | Do not cache personalized result variants | Keep redirect |
| `/tools/word-counter`, `/about`, `/help`, `/faq`, `/privacy-policy`, `/terms`, `/dashboard` | Static pages (no server auth/data fetch) | No | No | Safe for CDN cache | Keep static |

### APIs

| API route | Current behavior | Auth required | User-specific data | Current cache headers | Recommendation |
|---|---|---:|---:|---|---|
| `GET/POST /api/scholarships` | Dynamic route handler with mixed logic | Optional (loads user when needed) | Often yes (meta/profile/subscription/id tabs) | Mostly `private, no-store`; strict guest listing condition returns public s-maxage=45 SWR=300 | Keep mixed policy; optionally expand guest-safe variants carefully |
| `POST /api/scholarships/match` | Dynamic personalized match API | Yes (401 otherwise) | Yes (profile/subscription/match index) | No explicit public cache; should be private | Keep private/no-store |
| `GET /api/scholarships/[slugOrId]` | Dynamic by implementation (uses cookie-based server client) | No explicit auth gate | Public scholarship detail rows | No explicit cache header | Switch to anon/service server client and add public short CDN cache |
| `GET /api/categories` | Public category list but dynamic + cookie-based client | No explicit auth gate | No | No explicit cache header | Make public cacheable (short TTL) using non-cookie DB client |
| `POST /api/internal/resources/apply-article-matching` (+ legacy alias) | Protected internal mutation endpoint | Secret header | Potentially sensitive internal write | No caching intended | Must remain private/no-store |
| `POST /api/webhooks` | Stripe webhook mutating billing data | Stripe signature | Yes (billing/subscriptions/products) | No caching intended | Must remain private/no-store |
| `GET /auth/callback`, `GET /auth/reset_password` | Auth/session exchange & redirects | Auth flow token/code | Yes (session cookies) | No caching intended | Must remain private/no-store |

## Exact code markers that affect rendering/caching

- `dynamic = 'force-dynamic'` used in:
  - `app/resources/page.tsx`
  - `app/resources/[slug]/page.tsx`
  - `app/api/categories/route.ts`
  - `app/api/scholarships/route.ts`
  - `app/api/scholarships/match/route.ts`
  - `app/api/internal/resources/apply-article-matching/route.ts`
- `cookies()` usage in server path:
  - `utils/supabase/server.ts` (base server client)
  - `app/signin/page.tsx`, `app/signin/[id]/page.tsx`
- auth/session checks:
  - widespread `supabase.auth.getUser()` in home/scholarships/account/signin/api/middleware
- middleware session refresh:
  - `middleware.ts` + `utils/supabase/middleware.ts` runs on almost all non-static-asset paths
- cache headers:
  - `app/api/scholarships/route.ts` sets guest public cache in one case, else private/no-store
- **Not found in code scan**:
  - no `export const revalidate`
  - no `generateStaticParams`
  - no `unstable_noStore` / `noStore()`
  - no route-level `fetch(..., { next: { revalidate } })` or explicit `fetch cache` control in server components

## High-priority improvement plan (minimal-risk)

1. Keep private SSR as-is for `/account`, auth callbacks, match API, webhook/internal APIs.
2. Keep `/api/scholarships` mixed policy, but document and test cache key behavior for guest mode.
3. Convert public content routes (`/resources`, `/resources/[slug]`) to ISR by replacing cookie-bound server DB access with an anonymous/service DB client in those read paths and adding `revalidate`.
4. For scholarship SEO pages (manifest/long-tail/category/detail), split guest SEO HTML from user personalization:
   - server-render/cache public SEO payload via ISR,
   - load auth-dependent controls (save/ignore/matches/subscription-limited data) client-side.
5. Add explicit `Cache-Control` to `GET /api/categories` and `GET /api/scholarships/[slugOrId]` once migrated off cookie-bound server client.

## One-change verdict for `/scholarships` auth-user filter performance

### Problem in current flow
- On `/scholarships`, auth users trigger `POST /api/scholarships` for list fetch and a separate `POST /api/scholarships` (`meta_only=1`) for sidebar/meta sync when filters change.
- In the API, auth/profile/subscription loading used to run for nearly every hub request because `isHubPrimaryListing` forced it, even when the request only needed base catalog rows.

### Single architectural change
- **Decouple personalization context loading from base catalog filtering in `app/api/scholarships/route.ts`:**
  - Load auth/profile/subscription **only** when request needs personalization context:
    - `includeMeta` / `metaOnly`
    - personalized scope/tabs
    - id-based user tabs (`saved/ignored/started/submitted`)
  - Keep base catalog list (`scope=catalog`, regular filter/sort/page changes) independent of auth/profile fetches.

### Why this is stable and low risk
- No query param changes.
- No filter/sort/pagination behavior changes.
- No API contract changes.
- Personalization still exists and is returned where needed (meta/personalized contexts), but removed from critical path of plain filtered catalog list.
