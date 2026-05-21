# Stage 2 locale link + pricing fix (ES/FR)

Date: 2026-05-19  
Priority: P0  
**No commit / no push.**

---

## Problem (root cause)

On `/es` and `/fr`, users could lose locale when clicking internal links:

1. **`localizedPilotHref` fell back to English** — For `es`/`fr`, non-pilot paths (and some pilot paths without a published page) returned unprefixed English URLs instead of `null`, so nav/CTAs silently sent users to `/scholarships`, `/subscription`, etc.
2. **Home primary CTA ignored locale** — `HomePrimaryCtaClient` / `useScholarshipEntryHref` always targeted `/get-scholarships` or English hub URLs.
3. **Hardcoded English-only targets** — Subscription/pricing on localized home, Essay Mentor (`/essay`), scholarship hub subpaths (`/scholarships/hub/...`) in footer grids, IQ assessment links routed through `hrefForPath`.
4. **Client-only chrome** — Navbar (`Navlinks` `ssr: false`) and footer nav (`SiteFooterNav` dynamic) require hydration before localized `href`s exist; Playwright click tests must wait on `href`, not role text alone.

English root (`/`, `/scholarships`, …) unchanged. No `/en` routes added.

---

## Pricing decision

| Option | Outcome |
|--------|---------|
| Public `/pricing` static page | **Does not exist** — billing UI is `/subscription` (Lemon Squeezy; **out of scope** per task constraints). |
| `/es/pricing`, `/fr/pricing` | **Not added** — would duplicate subscription flow / touch payments. |
| ES/FR nav | **Pricing / Tarifs hidden** (`locale === 'en'` only in `Navlinks.tsx`). |
| Localized home premium block | **Hidden** when `hrefForLocalizedUi(locale, '/subscription')` is `null`. |

Documented: ES/FR users are not silently linked to English `/subscription`.

---

## Solution

### Canonical helper: `localizedPilotHref` (`lib/i18n/localizedHref.ts`)

| Locale | Pilot path with published page | No page / non-pilot |
|--------|-------------------------------|---------------------|
| `en` | `/scholarships` | `/scholarships` (canonical) |
| `es` | `/es/scholarships` | `null` → hide link |
| `fr` | `/fr/essays/checklist` | `null` → hide link |

- Never emits `/en/...`
- Uses `getLocalizedPilotPage(locale, path)` so links only appear when static translation exists
- `hrefForLocalizedUi`, `hrefForLocalizedUiRequired`, `sectionPathForLocale`, `getStage2LanguageSwitcherItems` live in the same module
- `isExplicitEnglishOnlyInternalLink()` for audit allowlist (IQ, hub slugs, long-tail `/scholarships/...`, auth)

### Navigation

- **`Navlinks.tsx`**: `pilotNavHref()` → `localizedPilotHref`; pricing/for-organizations English-only; essay mentor sublink filtered on ES/FR when no localized target
- **`SiteFooter` / `localizedFooterLinks.ts`**: localized footer links; unavailable pages omitted

### Hubs & home

- **`HomePrimaryCtaClient`**: `locale` prop → ES/FR guests/auth go to `/es/scholarships` or `/fr/scholarships`
- **Hubs** (compare, providers, resources, essays, scholarships body): `hrefForLocalizedUiRequired` for pilot links; IQ CTAs use explicit English `/iq/assessment?...`
- **`ContinueScholarshipSearchCardGrid`**: pilot hubs localized; `/scholarships/hub/*` cards **English-only** (hidden on ES/FR)
- **`EssaysIndexPageContent`**: Essay Mentor button English-only

---

## Before / after (examples)

| Context | Before (on `/es`) | After |
|---------|-------------------|--------|
| Nav “Buscar becas” | `/scholarships` | `/es/scholarships` |
| Home hero CTA | `/get-scholarships` | `/es/scholarships` |
| Premium CTA | `/subscription` | Hidden |
| Footer “Acerca de” | `/about` | `/es/about` |
| Compare IQ card | `hrefForPath('/iq/...')` → broken/null | `/iq/assessment?intent=college_fit` (explicit EN) |
| `localizedPilotHref('es', '/essay')` | `/essay` (fallback) | `null` |

---

## Files changed (main)

| Area | Files |
|------|--------|
| Core i18n | `lib/i18n/localizedHref.ts`, `lib/i18n/localizedFooterLinks.ts`, `lib/i18n/__tests__/localizedPilotHref.test.ts`, `lib/i18n/__tests__/languageSwitcher.test.ts` |
| Nav / footer | `components/ui/Navbar/Navlinks.tsx`, `components/ui/Footer/SiteFooter.tsx`, `components/i18n/LanguageSwitcher.tsx` |
| Home | `components/home/HomePageContent.tsx`, `HomePrimaryCtaClient.tsx`, `HomeFinalCta.tsx`, `HomeGuidedEssaySupport.tsx`, `HomeTrustStrip.tsx`, `components/navigation/useScholarshipEntryHref.ts` |
| Hubs | `CompareIndexPageContent.tsx`, `ProvidersHubPageContent.tsx`, `ResourcesIndexPageContent.tsx`, `EssaysIndexPageContent.tsx`, `ContinueScholarshipSearchCardGrid.tsx`, `app/scholarships/scholarshipsSlugPathPageBody.tsx` |
| i18n pages | `LocalizedPilotPage.tsx`, `LocalizedMarketingPage.tsx`, `LocalizedResourceShellPage.tsx` |
| Audits | `scripts/i18n-locale-link-audit.ts` (new), `scripts/i18n-visible-text-audit.ts` (import path) |

---

## Verification results

### Visible-text audit

`SCREENSHOT_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-visible-text-audit.ts`

- **106** ES/FR pilot pages
- **0** blocking English UI
- **0** locale link issues (inline check in same script)

Report: `reports/seo/i18n-visible-text-audit-2026-05-19.md`

### Locale link audit

`SCREENSHOT_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-locale-link-audit.ts`

- **106** pages crawled (href crawl)
- **0** blocking locale-reset links
- **18/18** Playwright click tests passed (nav + footer, ES + FR)
- Pricing on `/es` nav: **not visible** (expected)

Reports: `reports/seo/i18n-locale-link-audit-2026-05-19.json`, `.md`

Click test note: selectors target `nav` before `#skip` and `footer a[href="/es/..."]` after client hydration (90s wait).

Fast re-run clicks only: `LINK_AUDIT_CLICKS_ONLY=1` reuses prior crawl JSON.

### Unit tests

`npx tsx --test lib/i18n/__tests__/*.test.ts` → **45/45 pass**

### Typecheck & build

- `npx tsc --noEmit` → pass  
- `npm run build` → pass (clean `.next` rebuild)

---

## What was not touched

- Auth, payments, subscription, Lemon, RLS, onboarding
- Supabase / translation APIs
- Scholarship/provider **long-tail** detail pages (English catalog slugs remain English; explicit allowlist in audit)
- New languages, `/en` routes
- Git commit / push

---

## Ops note

If `next dev` returns **500** after deleting `.next` while dev is running, restart dev (`npm run dev`) before Playwright audits — otherwise click tests time out.

Dev server after fix: **http://localhost:3000**
