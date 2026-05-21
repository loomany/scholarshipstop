# Stage 2 Locale Navigation Fix (ES/FR)

Date: 2026-05-19  
Priority: P0  
**No commit / no push.**

---

## Problem

On `/es` or `/fr`, internal links sometimes dropped the locale prefix (e.g. `/es` → click Scholarships → `/scholarships`). Root causes:

1. **Missing helper usage** — Several hub/guide components built URLs with `essayHubArticlePath()` / `resourcesArticlePath()` directly instead of `hrefForLocalizedUi` / `localizedPilotHref`.
2. **Scholarships hub footer** — `ContinueScholarshipSearchCardGrid` hard-coded `/resources`, `/essays`, `/providers`, `/compare`.
3. **Scholarships catalog intro** — Pilot trust chips in `ScholarshipCatalogRootIntro` used raw English paths.
4. **Providers trust block** — `ProviderDirectoryTrustSection` omitted `hrefForPath`.
5. **Resource shell related guides** — `ResourceGuideShell` related cards ignored locale.
6. **Language switcher / footer pathname** — (Prior session) footer `pathname` stale; switcher without `currentLocale` could flash English on client nav.

---

## Solution

### Core helper: `localizedPilotHref(locale, canonicalPath)`

Added in `lib/i18n/pilotRoutes.ts`:

| Locale | Pilot path | Non-pilot path |
|--------|------------|----------------|
| `en` | `/scholarships` | `/scholarships/hub/easy-apply` |
| `es` | `/es/scholarships` | `/scholarships/hub/easy-apply` (English fallback) |
| `fr` | `/fr/essays/checklist` | `/essay` (English fallback) |

Rules:

- Never emits `/en/...`
- Only Stage 2 canonical paths get `/es` or `/fr`
- `hrefForLocalizedUi` now delegates to `localizedPilotHref`

### Language switcher

- Uses `localizedPilotHref` for all items
- Filters any href containing `/en/`
- Nav passes `currentLocale`; footer uses `usePathname()`

### Middleware / cookie

- **No locale cookie** in codebase; URL locale is authoritative via path + `x-scholarshiptop-locale` header for `/es` and `/fr` only.
- Unsupported locale segments (`/en`, `/de`, `/pt`, …) are not pilot locales → `app/[locale]/[[...slugPath]]` → `notFound()` (404).

---

## Files changed

| File | Change |
|------|--------|
| `lib/i18n/pilotRoutes.ts` | `localizedPilotHref`; switcher uses it + `/en/` guard |
| `lib/i18n/localizedHref.ts` | `hrefForLocalizedUi` → `localizedPilotHref`; re-export |
| `lib/i18n/__tests__/localizedPilotHref.test.ts` | **New** — 6 tests |
| `components/ui/Navbar/Navlinks.tsx` | `localHref` → `localizedPilotHref` |
| `components/ui/Footer/SiteFooterNav.tsx` | `localizedPilotHref`; `usePathname` |
| `components/ui/Footer/SiteFooter.tsx` | Home link via `localizedPilotHref` |
| `components/i18n/LanguageSwitcher.tsx` | `currentLocale` prop (prior) |
| `components/i18n/LocalizedPilotPage.tsx` | `hrefForPage` → `localizedPilotHref` |
| `components/i18n/LocalizedMarketingPage.tsx` | Same |
| `components/i18n/LocalizedResourceShellPage.tsx` | Same + `cardHrefForSlug` + switcher locale |
| `components/scholarships/ContinueScholarshipSearchCardGrid.tsx` | `locale` prop; pilot hubs localized |
| `app/scholarships/scholarshipsSlugPathPageBody.tsx` | Pass `locale` to grid; intro `hrefForPath` |
| `components/essays/EssaysIndexPageContent.tsx` | `EssaysGrid` + featured guides use `hrefForPath` |
| `components/content-hub/ResourcesIndexPageContent.tsx` | Static guides + CMS grid use `hrefForPath` |
| `components/providers/ProvidersHubPageContent.tsx` | Trust chips use `hrefForPath` |
| `components/content-hub/resourceGuides/ResourceGuideShell.tsx` | Optional `cardHrefForSlug` |

**Already correct (verified):** `HomePageContent`, hub index components (`Compare`, `Resources`, `Providers`, `Essays`), `TrustPageTemplate`, `StaticEssayGuidePage`, `StaticCompareGuidePage`, `StaticScholarshipGuidePage`, `LocalizedProductionPage`.

---

## Before / after examples

| Context | Before | After (locale `es`) |
|---------|--------|---------------------|
| Essays hub featured guide | `/essays/checklist` | `/es/essays/checklist` |
| Resources static guide card | `/resources/how-to-find-scholarships` | `/es/resources/how-to-find-scholarships` |
| Scholarships hub “Continue search” | `/essays` | `/es/essays` |
| Navbar Scholarships | `/scholarships` (if pathname stale) | `/es/scholarships` |
| Language switcher on `/es/terms` | Español selected | Stable; EN → `/terms`, ES → `/es/terms` |
| Non-pilot hub card | `/scholarships/hub/easy-apply` | unchanged (English) |

---

## Tests

```text
npx tsx --test lib/i18n/__tests__/*.test.ts  → 38/38 pass
npx tsc --noEmit                             → pass
npm run build                                → pass (190 pages)
```

New coverage: `localizedPilotHref.test.ts` (prefix, fallback, no `/en`, switcher hrefs).

---

## Manual smoke (recommended)

Start at **`/es`**:

- Navbar: Scholarships, Essays, Providers, Compare, Resources → `/es/...`
- Footer trust links → `/es/about`, `/es/faq`, etc. (where in pilot footer set)
- Home trust cards → `/es/scholarship-verification-methodology`, …
- `/es/scholarships` footer cards → `/es/resources`, `/es/essays`, …

Start at **`/fr`** — same with `/fr` prefix.

Deep pages:

- `/es/essays/checklist` — internal pilot links → `/es/...`
- `/fr/compare/scholarship-vs-grant` — compare/resources/scholarships CTAs → `/fr/...`
- CMS-only essay/resource slug from hub grid → stays English (not in pilot)

Unsupported: `/en`, `/de`, `/pt`, `/ar`, `/zh-Hans`, `/hi`, `/id`, `/vi`, `/ru` → **404**.

---

## SEO (unchanged)

- English URLs unchanged
- ES/FR self-canonical + hreflang en/es/fr/x-default
- Query pages noindex
- Sitemap: 106 pilot URLs only under `locale-*` buckets
- No translated scholarship/provider long-tail

---

## Intentionally not touched

- Auth, payments, subscription, Lemon, onboarding, RLS
- `ScholarshipsHubPageClient` tab URLs (`/scholarships/hub/...`) — not in Stage 2 pilot
- `HomePrimaryCtaClient` → `/get-scholarships` / hub matches (onboarding flow)
- DB-backed essay/resource listing cards → English when slug not in pilot
- Scholarship detail, provider profile, compare university/state pages
- OpenAI / Supabase writes / new languages

---

## Sign-off

- [x] `localizedPilotHref` helper
- [x] Header/footer/switcher preserve locale
- [x] Hub + guide internal links fixed where pilot paths exist
- [x] Tests + build pass
- [x] No commit / no push
