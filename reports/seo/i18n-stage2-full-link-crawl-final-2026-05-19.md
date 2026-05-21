# Stage 2 full link crawl — final readiness (2026-05-19)

## Executive summary

| Gate | Before (session start) | After | Exit |
|------|------------------------|-------|------|
| FULL locale-link audit (`scripts/i18n-locale-link-audit.ts`) | 67 blocking | **0 blocking** | **0** |
| Visible-text audit | not re-run (prior failures) | **0 blocking English UI** | **0** |
| `lib/i18n/__tests__/*.test.ts` | — | 47/47 pass | **0** |
| `tsc --noEmit` | — | clean | **0** |
| `npm run build` | — | clean | **0** |
| Nav/footer click tests | 16/18 pass | **18/18 pass** | — |

**Acceptance: P0 full locale-link crawl is green.** No commit, no push.

---

## Commands (exact)

```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm run build
# restart prod server on :3000
$env:SCREENSHOT_BASE_URL='http://localhost:3000'
Remove-Item Env:LINK_AUDIT_CLICKS_ONLY -ErrorAction SilentlyContinue
npx tsx scripts/i18n-locale-link-audit.ts          # exit 0
npx tsx scripts/i18n-visible-text-audit.ts         # exit 0
npx tsx --test lib/i18n/__tests__/*.test.ts        # exit 0
npx tsc --noEmit                                   # exit 0
npm run build                                      # exit 0
```

- **Base URL:** `http://localhost:3000`
- **`LINK_AUDIT_CLICKS_ONLY`:** unset (full crawl, not click-only smoke)
- **Mode:** production `next start` after clean build

---

## Full locale-link audit

| Metric | Value |
|--------|--------|
| Pages crawled | 118 |
| Blocking link issues | **0** |
| Allowed Zone C (DB/long-tail English) | 712 |
| Click tests | 18 pass / 0 fail |
| Pricing on `/es` nav | not visible (expected) |

Reports:

- `reports/seo/i18n-locale-link-audit-2026-05-19.md`
- `reports/seo/i18n-locale-link-audit-2026-05-19.json`

---

## Root causes fixed

1. **Hub URL normalization dropped locale** — `buildHubCatalogBrowserUrl()` always returned English `/scholarships/hub/...`. `replaceListingParams` / `buildPageHref` in `ScholarshipsHubPageClient` now wrap paths with `localizedHubCatalogBrowserPath()`. This fixed nav click tests landing on English `/scholarships/hub/best-recommendation` and most sidebar/tab/chip links on ES/FR hub pages.

2. **Scholarship card filter chips** — `ScholarshipCard` `prefixHubHref` now uses `localizedHubCatalogBrowserPath` with pathname + `window.location` fallback for locale detection (FR hub category/geo chips).

3. **Footer / error home links** — `SiteFooter` uses `hrefForLocalizedUiRequired` for home; `LocaleAwareHomeLink` on `not-found` and `error` pages.

4. **Sign-in on hub** — `NavbarUserSlot` receives `initialLocale` from layout via `Navlinks` when pathname is not yet hydrated.

5. **Category breadcrumbs** — `ScholarshipCategoryListingBreadcrumbs` accepts `locale` and localizes `/` and `/scholarships`.

6. **Invalid audit target removed** — `/scholarships/hub/no-essay` is not a canonical hub segment (404); removed from `EXTRA_LOCALIZED_TARGETS` in link audit.

7. **Hub canonical intro / guest explore copy** — localized `hubCanonicalIntro` and guest explore headings in `scholarshipsHubUiCopy` for ES/FR hub pages.

---

## `/get-scholarships` decision

- **Zone B funnel** — ES/FR use `/es/get-scholarships` and `/fr/get-scholarships` (production template, localized UI, noindex policy preserved).
- Country/query links on localized provider/hub pages must use `/${locale}/get-scholarships?country=...` (not English `/get-scholarships?...`).
- Funnel is **not** Zone C; audit classifies English funnel links on ES/FR as blocking.

---

## Examples of fixed link patterns

| Before (blocking) | After |
|-------------------|--------|
| `/scholarships/hub/matches?category=education` on `/fr/scholarships` | `/fr/scholarships/hub/matches?category=education` |
| `/signin` on `/es/scholarships` | `/es/signin` |
| `/resources`, `/essays`, `/providers`, `/compare` on hub footer cards | `/es/resources`, `/es/essays`, … |
| `/` breadcrumb on `/es/essays` | `/es` |
| Nav “Buscar becas” click → `/scholarships/hub/best-recommendation` | `/es/scholarships/hub/best-recommendation` |

---

## Allowed Zone C (unchanged policy)

- Scholarship/provider detail URLs without ES/FR translation
- DB-backed CMS articles without localized version
- Compare state/university long-tail without ES/FR version
- `/essay`, `/iq`, account/subscription paths (explicit allowlist)

**Not Zone C:** pilot hubs, funnel (`/get-scholarships`, `/signin`), static/pilot pages with ES/FR wrappers.

---

## Visible-text audit

- **116** pages audited; **0** blocking English UI; **0** blocking aria/placeholder/title.
- Scholarships hub: localized canonical intro + guest explore titles; audit waits for hydrated nav/sidebar and uses word-boundary matching.
- Note: 12 pages still log **link** issues in visible-text report (English DB resource cards on home) — those are informational in that script; exit code is driven only by blocking visible English UI.

Report: `reports/seo/i18n-visible-text-audit-2026-05-19.md`

---

## Click tests (18/18)

**ES:** Buscar becas → `/es/scholarships` or `/es/scholarships/hub/*`; Proveedores, Comparar, Recursos, Ensayos; footer About/Terms/FAQ/Privacy → `/es/...`

**FR:** Chercher des bourses → `/fr/scholarships` or `/fr/scholarships/hub/*`; Fournisseurs, Comparer, Ressources, Guides d'essai; footer → `/fr/...`

---

## SEO / scope preserved

- English URLs unchanged; `/en` → 404; unsupported locales → 404
- ES/FR self-canonical; hreflang en/es/fr/x-default only
- No scholarship/provider long-tail translation or sitemap expansion
- Auth, payments, subscription, Lemon, RLS, onboarding, Supabase writes — **not touched**

---

## Files changed (this session)

### Core link locale

- `lib/i18n/localizedHref.ts` — `localizedHubCatalogBrowserPath()`
- `lib/i18n/__tests__/localizedPilotHref.test.ts` — hub browser path tests
- `app/scholarships/ScholarshipsHubPageClient.tsx` — localize hub `router.replace` / pagination URLs; guest explore titles; scope notice title
- `components/scholarships/ScholarshipCard.tsx` — chip/hub href localization
- `components/scholarships/ScholarshipsSidebar.tsx` — default UI copy from `locale`
- `components/scholarships/ScholarshipHubCanonicalSeo.tsx` — localized intro + footer hrefs
- `components/scholarships/ScholarshipCategoryListingBreadcrumbs.tsx` — locale prop
- `app/scholarships/category/ScholarshipCategoryPageClient.tsx` — pass locale to breadcrumbs
- `app/scholarships/scholarshipsSlugPathPageBody.tsx` — pass locale to hub intro/footer
- `components/ui/Footer/SiteFooter.tsx` — home href required localization
- `components/ui/Navbar/NavbarUserSlot.tsx` — `initialLocale`
- `components/ui/Navbar/Navlinks.tsx` — pass `initialLocale` to user slot
- `components/i18n/LocaleAwareHomeLink.tsx` — new
- `app/not-found.tsx`, `app/error.tsx` — locale-aware home

### Hub UI copy

- `lib/i18n/scholarshipsHubUiCopy.ts` — `hubCanonicalIntro`, guest explore titles (ES/FR)

### Audits

- `scripts/i18n-locale-link-audit.ts` — nav hydration wait; remove invalid `no-essay` hub extra target
- `scripts/i18n-visible-text-audit.ts` — header nav + main scan; hydration waits; word boundaries; scholarships hub nav sanity filter

---

## What was not touched

- Git commit/push
- New languages; `/en` route creation
- OpenAI / translation APIs
- Supabase data/auth/payments/subscription/Lemon/RLS/onboarding
- Scholarship/provider DB long-tail translation
- English SEO URLs and sitemap scope (except existing `/es|fr/get-scholarships` funnel wrappers)

---

## Artifacts

| Report | Path |
|--------|------|
| Link audit (final) | `reports/seo/i18n-locale-link-audit-2026-05-19.md` |
| Link audit JSON | `reports/seo/i18n-locale-link-audit-2026-05-19.json` |
| Visible-text audit | `reports/seo/i18n-visible-text-audit-2026-05-19.md` |
| This summary | `reports/seo/i18n-stage2-full-link-crawl-final-2026-05-19.md` |

---

## Hotfix: 500 on /es/essays, /es/compare, /es/resources, /fr/* hubs (2026-05-19)

**Symptom:** ES/FR essays/compare/resources hubs rendered the global error page with digest `1252026341` in production builds. Server log:

```
Error: Functions cannot be passed directly to Client Components unless you
  explicitly expose it by marking it with "use server".
  {searchByKeyword: ..., showingRange: function showingRange, ...}
```

**Root cause:** Server components (`EssaysIndexPageContent`, `CompareIndexPageContent`, `ResourcesIndexPageContent`) were calling `getHubToolbarUiCopy(locale)` and passing the resulting object — which contains a non-serializable `showingRange(from, to, total, unit)` function — as a `toolbarCopy` prop into client toolbars. This is valid in dev but throws in `next start` (production).

**Fix:**

- Replaced `toolbarCopy?: HubToolbarUiCopy` with `locale?: LocalizedUiLocale` on:
  - `components/essays/EssaysIndexToolbar.tsx`
  - `components/content-hub/ResourcesIndexToolbar.tsx`
  - `components/compare/CompareIndexToolbar.tsx`
- The three client toolbars now call `getHubToolbarUiCopy(locale)` themselves (the function exists in the client bundle and is purely local).
- Updated the three server `*IndexPageContent` files to pass `locale={locale}` instead of `toolbarCopy={toolbarCopy}`, and dropped the now-unused `getHubToolbarUiCopy` import.
- Added a localized `tryEssayMentor` string to `EssaysHubUiCopy` (EN: `Try Essay Mentor`, ES: `Probar Essay Mentor`, FR: `Essayer Essay Mentor`) and threaded it into `EssaysIndexHeroMedia` → `AiMentorCtaLink` so the CTA pill under the essays hero video is no longer hard-coded English.

**Verification (production build, `next start -p 3000`):**

- `GET /es/essays /fr/essays /es/compare /fr/compare /es/resources /fr/resources /es/scholarships /fr/scholarships /es /fr` — all return **200**.
- `npm run build` — green.
- `npx tsc --noEmit` — green.
- `npx tsx --test lib/i18n/__tests__/localizedPilotHref.test.ts` — 8/8 pass.
- `npx tsx scripts/i18n-locale-link-audit.ts` — 118 pages crawled, **0 blocking**, 734 allowed Zone C, 18/18 click tests pass.
- `npx tsx scripts/i18n-visible-text-audit.ts` — 116 pages audited, **0 blocking English UI**, 0 blocking attributes, 0 errors.
