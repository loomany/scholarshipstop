# Stage 2 Build Blocker Fix (P0)

Date: 2026-05-19

## Executive summary

`npm run build` failed during static generation for `/` with repeated 60s worker timeouts. The **root cause was not slow Supabase alone** — it was **non-serializable props passed into Client Components** after the ES/FR homepage localization refactor. That triggered React/Next errors during prerender, retries, and eventual SSG timeout.

A minimal fix keeps all homepage sections visible, preserves English/ES/FR behavior, and adds **bounded timeouts** on Supabase-backed Suspense fetches as defense in depth.

**Result:** clean `npm run build` passes; `tsc` and 32/32 i18n tests pass; production smoke checks pass.

---

## Root cause

### 1. Primary — Client Component serialization (i18n refactor)

During `Generating static pages`, Next logged:

```text
Error: Functions cannot be passed directly to Client Components ...
  {sectionPadX: ..., sectionY: ..., copy: ..., hrefForPath: function u}
```

and:

```text
  {..., destinationsCount: function destinationsCount, ...}
```

**Affected client components:**

| Component | Invalid props |
|-----------|----------------|
| `HomeInternationalGrantsUsp` (`'use client'`) | `hrefForPath` function; `copy` with `destinationsCount`, `countryListings`, `countryAria` functions |
| `HomeGuidedEssaySupport` (`'use client'`) | `hrefForPath` function |

**Why this appeared now:** On `HEAD`, `HomeInternationalGrantsUsp` used hardcoded `/get-scholarships` links and inline English strings — no functions in props. The i18n pass introduced `hrefForLocalizedUi` via `hrefForPath` and function formatters in `homePageCopy.internationalGrants`, passed through `HomeStatsAsync` into the client boundary.

Server-only components (`HomeTrustStrip`, `HomeWhatWeVerify`) may still receive `hrefForPath` — that is valid on the server.

### 2. Secondary — Supabase Suspense during SSG

`HomeStatsAsync` → `getCachedHomeListingStatsForMarketing()`  
`HomeResourcesAsync` → `fetchHomeResourcesCarouselItems()`

These existed **before** the refactor (same on committed `app/page.tsx`). They can hang when Supabase is slow; `try/catch` does not help if the promise never settles. **Not the sole cause** of this failure, but worth bounding.

---

## Was this caused by the i18n refactor?

| Factor | Verdict |
|--------|---------|
| Supabase Suspense on homepage | **Pre-existing** |
| Passing functions into client components | **Introduced by i18n / `HomePageContent` localization** |
| Static `/es` + `/fr` home via `generateStaticParams` | **Amplifies** build work (more home prerenders) but not the serialization bug |
| Observed symptom (`/` SSG timeout) | **Triggered by (1); worsened by retries + (2)** |

---

## Fix (minimal)

### A. Serializable client props

- Resolve localized URLs in **server** parents (`HomePageContent`, `HomeStatsAsync`) and pass **strings**:
  - `getScholarshipsBaseHref`
  - `essayLinkHref`
  - `resourcesLinkHref`, `essaysLinkHref`
- Replace function formatters in `homePageCopy.internationalGrants` with **templates**:
  - `destinationsCountTemplate`, `countryListingsTemplate`, `countryAriaTemplate`
- Apply templates in the client via `applyCopyTemplate()` (`lib/i18n/copyTemplates.ts`)

### B. Bounded Supabase fetches

- `lib/server/promiseWithTimeout.ts` — `promiseWithTimeout`, `homepageSupabaseFetchTimeoutMs()` (12s in `phase-production-build`, 25s otherwise)
- Wrapped fetches in `HomeStatsAsync` and `HomeResourcesAsync`; existing empty-state fallbacks unchanged

---

## Files changed

| File | Change |
|------|--------|
| `lib/i18n/copyTemplates.ts` | **New** — `{key}` template helper for client-safe copy |
| `lib/i18n/homePageCopy.ts` | International grants: templates instead of functions |
| `lib/server/promiseWithTimeout.ts` | **New** — timeout helper + build-aware ms |
| `components/home/HomeInternationalGrantsUsp.tsx` | String href + template copy |
| `components/home/HomeStatsAsync.tsx` | `getScholarshipsBaseHref`; fetch timeout |
| `components/home/HomeGuidedEssaySupport.tsx` | `essayLinkHref` instead of `hrefForPath` |
| `components/home/HomeResourcesAsync.tsx` | Resolved link hrefs; fetch timeout |
| `components/home/FeaturedResources.tsx` | Resolved link hrefs |
| `components/home/HomePageContent.tsx` | Wire resolved hrefs into children |
| `scripts/i18n-build-smoke-check.ts` | **New** — post-build HTTP/SEO smoke (optional) |

---

## Verification

### Build

```powershell
Remove-Item -Recurse -Force .next
npm run build
```

**Result:** exit 0 (2026-05-19)

### Typecheck & tests

```powershell
npx tsc --noEmit          # pass
npx tsx --test lib/i18n/__tests__/*.test.ts   # 32/32 pass
```

### Smoke (production `next start -p 3000`)

| Path | Status | Canonical / SEO |
|------|--------|-----------------|
| `/` | 200 | `https://scholarshiptop.com` |
| `/es` | 200 | `https://scholarshiptop.com/es` |
| `/fr` | 200 | `https://scholarshiptop.com/fr` |
| `/scholarships` | 200 | English root canonical |
| `/es/scholarships` | 200 | `/es/…` self-canonical |
| `/fr/scholarships` | 200 | `/fr/…` self-canonical |
| `/essays`, `/es/essays`, `/fr/essays` | 200 | Localized canonicals OK |
| `/compare/scholarship-vs-grant` (+ es/fr) | 200 | hreflang en/es/fr present |
| `/en` | **404** | — |
| `/de` | **404** | — |

Query `noindex`, sitemap scope, and hreflang rules: unchanged (covered by existing i18n unit tests).

---

## What was not touched

- Auth, payments, subscription, Lemon, RLS, onboarding
- OpenAI / translation APIs
- New locales beyond `es` / `fr`
- Scholarship/provider long-tail translation
- Visual removal of homepage sections

---

## Follow-up (optional)

- If build logs show repeated homepage fetch timeouts in CI, tune `homepageSupabaseFetchTimeoutMs` or add Supabase client fetch `signal` at the data layer.
- Localize `ScholarshipPreviewList` mock strings (cosmetic, non-blocking).
