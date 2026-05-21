# Stage 2 Multilingual SEO Pilot: Spanish and French

Date: 2026-05-18

## Executive Summary

Implemented a controlled multilingual SEO pilot for Spanish and French without moving English URLs, launching `/en`, using OpenAI or translation APIs, writing to Supabase, or creating long-tail translated scholarship/provider pages.

English remains on root routes such as `/scholarships`, `/essays`, `/providers`, and `/compare`. The pilot adds only locale-prefixed public pages under `/es/...` and `/fr/...` for the approved foundation, essay, resource, trust, and evergreen compare pages.

## Routes Added

New localized public route wrappers:

- `app/[locale]/layout.tsx`
- `app/[locale]/[[...slugPath]]/page.tsx`

The localized route layer accepts only:

- `es`
- `fr`

Unsupported locale prefixes such as `/en`, `/de`, `/pt`, `/ar`, `/zh-Hans`, `/hi`, `/id`, `/vi`, and `/ru` are not launched in Stage 2.

## Published Localized Pages

Each page has a static curated Spanish and French translation with `status: published` and `qualityScore >= 85`.

Foundation and trust pages:

- `/`
- `/scholarships`
- `/essays`
- `/providers`
- `/compare`
- `/resources`
- `/about`
- `/editorial-policy`
- `/scholarship-verification-methodology`
- `/how-we-rank-scholarships`
- `/how-scholarshiptop-works`
- `/financial-aid-disclaimer`
- `/contact`
- `/corrections`
- `/scholarship-scam-warning`
- `/how-we-make-money`

Essay guides:

- `/essays/examples`
- `/essays/checklist`
- `/essays/financial-need`
- `/essays/career-goals`
- `/essays/mistakes`

Compare guides:

- `/compare/scholarship-vs-grant`
- `/compare/merit-vs-need-based-scholarships`
- `/compare/no-essay-vs-essay-scholarships`
- `/compare/local-vs-national-scholarships`

Stage 2 publishes 25 canonical English page equivalents for each pilot locale, for 50 localized URLs total.

## Static Translation Source

Added the Stage 2 static translation layer:

- `lib/i18n/staticTranslations/index.ts`
- `lib/i18n/pilotRoutes.ts`
- `lib/i18n/localizedMetadata.ts`

The content is manually authored static content. No OpenAI scripts, translation APIs, DB writes, migrations, or mass generators were used.

## Metadata, Canonical, and Hreflang

Localized pages emit self-canonical URLs and locale alternates only for the published Stage 2 set.

Example: `/es/scholarships`

- Canonical: `https://scholarshiptop.com/es/scholarships`
- `hreflang="en"`: `https://scholarshiptop.com/scholarships`
- `hreflang="es"`: `https://scholarshiptop.com/es/scholarships`
- `hreflang="fr"`: `https://scholarshiptop.com/fr/scholarships`
- `hreflang="x-default"`: `https://scholarshiptop.com/scholarships`

Example: `/fr/essays/checklist`

- Canonical: `https://scholarshiptop.com/fr/essays/checklist`
- `hreflang="en"`: `https://scholarshiptop.com/essays/checklist`
- `hreflang="es"`: `https://scholarshiptop.com/es/essays/checklist`
- `hreflang="fr"`: `https://scholarshiptop.com/fr/essays/checklist`
- `hreflang="x-default"`: `https://scholarshiptop.com/essays/checklist`

Stage 2 alternates intentionally exclude non-launched locales.

## Query Noindex Rules

Localized query and pagination variants are preserved as non-indexable:

- `/es/essays?page=2`: `noindex, follow`, canonical `/es/essays`
- `/es/essays?q=test`: `noindex, follow`, canonical `/es/essays`
- `/es/providers?page=2`: `noindex, follow`, canonical `/es/providers`
- `/es/compare?page=2`: `noindex, follow`, canonical `/es/compare`
- `/fr/essays?page=2`: `noindex, follow`, canonical `/fr/essays`
- `/fr/providers?page=2`: `noindex, follow`, canonical `/fr/providers`
- `/fr/compare?page=2`: `noindex, follow`, canonical `/fr/compare`

## Localized Sitemaps

Added only Stage 2 locale sitemap documents:

- `/sitemaps/locale-es-core.xml`
- `/sitemaps/locale-es-essays.xml`
- `/sitemaps/locale-es-compare.xml`
- `/sitemaps/locale-es-resources.xml`
- `/sitemaps/locale-fr-core.xml`
- `/sitemaps/locale-fr-essays.xml`
- `/sitemaps/locale-fr-compare.xml`
- `/sitemaps/locale-fr-resources.xml`

The sitemap index includes these documents only when they contain published localized pages. No translated scholarship long-tail sitemap, provider detail sitemap, or non-pilot locale sitemap was added.

Bucket counts:

- Core: 13 URLs per locale
- Essays: 6 URLs per locale
- Compare: 5 URLs per locale
- Resources: 1 URL per locale

## UI, Internal Links, and Schema

Added a localized page renderer and language switcher:

- `components/i18n/LocalizedPilotPage.tsx`
- `components/i18n/LanguageSwitcher.tsx`

Updated global layout/navigation/footer to support the pilot locales while keeping English routes unchanged:

- `app/layout.tsx`
- `middleware.ts`
- `components/ui/Navbar/Navbar.tsx`
- `components/ui/Navbar/Navlinks.tsx`
- `components/ui/Navbar/NavbarUserSlot.tsx`
- `components/ui/Footer/SiteFooter.tsx`
- `components/ui/Footer/SiteFooterNav.tsx`

Visible pilot page UI is localized for Spanish and French, including headings, buttons, labels, trust/disclaimer copy, FAQ labels, compare table labels, and internal pilot links. Brand names, provider names, scholarship names, official URLs, amounts, and factual terms are preserved where appropriate.

Localized pages emit visible-content-matching schema:

- `WebPage`
- `Article` for essay and compare guides
- `CollectionPage` and `ItemList` for localized hubs where appropriate
- `FAQPage` only when visible localized FAQ exists
- `BreadcrumbList` with localized labels

## Visual QA

Screenshots saved to:

`reports/seo/screenshots/i18n-stage2/`

Captured desktop and mobile screenshots for:

- `/es`
- `/fr`
- `/es/scholarships`
- `/fr/scholarships`
- `/es/essays`
- `/fr/essays`
- `/es/essays/examples`
- `/fr/essays/examples`
- `/es/providers`
- `/fr/providers`
- `/es/compare`
- `/fr/compare`
- `/es/compare/scholarship-vs-grant`
- `/fr/compare/scholarship-vs-grant`

Spot visual checks confirmed localized visible content, `lang="es"` or `lang="fr"`, `dir="ltr"`, readable cards, mobile layout without horizontal overflow, and stable localized navigation/footer.

## Checks

| Check | Result |
|---|---|
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | Pass, 29 tests |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `/` | 200 |
| `/scholarships` | 200 |
| `/es` | 200 |
| `/fr` | 200 |
| `/es/scholarships` | 200 |
| `/fr/scholarships` | 200 |
| `/es/essays/examples` | 200 |
| `/fr/essays/examples` | 200 |
| `/es/compare/scholarship-vs-grant` | 200 |
| `/fr/compare/scholarship-vs-grant` | 200 |
| `/en` | 404 |
| `/de` | 404 |
| `/sitemap.xml` | 200 |
| Localized query pages | `noindex, follow` with localized canonical |
| Localized sitemap index entries | Present for Stage 2 docs only |
| Long-tail localized scholarship/provider detail sitemaps | Not added |

## Not Touched

No changes were made to:

- English URL structure
- `/en` routes
- Auth
- Payments
- Subscription/paywall
- Lemon
- Supabase RLS
- Onboarding
- User/private routes
- `app/api/essay/*`
- `lib/essay/*`
- Supabase data
- Migrations
- OpenAI scripts
- Translation APIs

## Stage 3 Recommendations

Next safe stage:

1. Add English-side alternate metadata for the same pilot pages so hreflang is fully bidirectional from English pages as well.
2. Submit the 8 locale sitemap documents in Google Search Console after deployment.
3. Monitor index coverage, canonical selection, and localized query exclusion.
4. Expand only to additional curated pages after ES/FR validation.
5. Keep long-tail scholarship/provider translations blocked until quality gates and review status are ready.

## Suggested Commit Plan

Single commit:

- `feat(seo): add Spanish and French multilingual pilot`

Or split:

- `feat(i18n): add localized route wrappers and metadata`
- `feat(i18n): add Spanish and French static translations`
- `feat(seo): add localized sitemaps and hreflang pilot`
- `test(i18n): cover localized routing metadata and sitemap rules`
