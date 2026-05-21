# Multilingual Stage 1 i18n Foundation Implementation Report

Date: 2026-05-18  
Scope: Stage 1 architecture foundation only. No translated pages were launched.

## Summary

Implemented the base i18n SEO helper layer for ScholarshipTop while keeping English on root and preserving existing English URLs.

This stage adds locale/path/canonical/hreflang/translation-quality/sitemap helper primitives, documentation, and tests. It does not add `/es`, `/fr`, `/de`, or other translated routes, and it does not include translated URLs in the production sitemap.

## Helpers Added

| File | Purpose |
|---|---|
| `lib/i18n/locales.ts` | Central locale registry, root locale, RTL locale list, locale validation, direction helpers. |
| `lib/i18n/types.ts` | Shared i18n and translation SEO types. |
| `lib/i18n/paths.ts` | `localizedPath`, `stripLocalePrefix`, `extractLocaleFromPath`, canonical path normalization. |
| `lib/i18n/alternates.ts` | Next.js-compatible localized canonical and hreflang alternates builder. |
| `lib/i18n/translationQuality.ts` | Translation status and quality-score helpers. |
| `lib/i18n/translationPolicy.ts` | `getTranslatedPageSeoDecision` for index/noindex, sitemap, and hreflang eligibility. |
| `lib/i18n/localizedSitemaps.ts` | Foundation helpers for future localized sitemap entries and locale sitemap slugs. |
| `lib/seo/canonical.ts` | Added `getLocalizedCanonical` while preserving existing `getCanonical` behavior. |

## English Routes Preserved

English remains root:

| English page | Status | Canonical after change |
|---|---:|---|
| `/` | 200 | `https://scholarshiptop.com` |
| `/scholarships` | 200 | `https://scholarshiptop.com/scholarships` |
| `/essays` | 200 | `https://scholarshiptop.com/essays` |
| `/providers` | 200 | `https://scholarshiptop.com/providers` |
| `/compare` | 200 | `https://scholarshiptop.com/compare` |
| `/sitemap.xml` | 200 | unchanged sitemap endpoint |

No English URL was moved to `/en`.

## Locale Path Rules

Examples:

| Locale | Canonical path | Localized path |
|---|---|---|
| `en` | `/scholarships` | `/scholarships` |
| `es` | `/scholarships` | `/es/scholarships` |
| `fr` | `/essays/checklist` | `/fr/essays/checklist` |
| `ar` | `/` | `/ar` |

`/en/...` is intentionally not treated as the public English prefix. English is root.

## Hreflang Behavior

`buildLocalizedAlternates` returns:

- locale-specific canonical URL;
- `languages` object compatible with Next.js metadata;
- self alternate when the locale is available;
- English root alternate when available;
- `x-default`;
- only locales passed as available/published by the caller.

Missing/draft/noindex locales should not be passed into `availableLocales`, so they are excluded from hreflang.

## Translation Quality Decision

`getTranslatedPageSeoDecision` returns:

```ts
{
  indexable: boolean;
  robots: 'index, follow' | 'noindex, follow';
  includeInSitemap: boolean;
  includeInHreflang: boolean;
  reasons: string[];
}
```

Indexable only when:

- English source page is indexable;
- translation status is `published`;
- quality score is at least `85`;
- localized title exists;
- localized H1 exists;
- localized body exists;
- no mixed-language risk is present.

Draft, stale, partial, low-quality, mixed-language, or source-noindex translations are noindex and excluded from sitemap/hreflang.

## Localized Sitemap Foundation

Added helpers:

- `shouldIncludeLocalizedUrl`
- `buildLocalizedSitemapEntry`
- `buildLocaleSitemapSlug`

Rules enforced:

- no query URLs;
- no filter/search/private pages;
- no source-noindex pages;
- no draft/partial/stale translations;
- published translations only;
- quality score must pass.

This stage does not wire localized sitemap entries into `/sitemap.xml`.

## Documentation

Created:

- `docs/multilingual-seo-architecture.md`

It documents:

- English root policy;
- supported locales;
- pilot languages `es` and `fr`;
- no `40k x 10` launch;
- translation status model;
- hreflang/canonical/sitemap/noindex rules;
- Arabic RTL requirements;
- OpenAI-free translation strategy;
- future rollout phases.

## Tests Added

| Test file | Coverage |
|---|---|
| `lib/i18n/__tests__/paths.test.ts` | English root paths, locale prefixes, locale extraction, stripping, Arabic RTL, localized canonical URL. |
| `lib/i18n/__tests__/alternates.test.ts` | hreflang languages, self/English/x-default behavior, missing locale exclusion. |
| `lib/i18n/__tests__/translationQuality.test.ts` | published quality pass, draft noindex, low score noindex, mixed/partial noindex, source noindex inheritance. |
| `lib/i18n/__tests__/localizedSitemaps.test.ts` | sitemap inclusion/exclusion, query/private/filter exclusion, stale/partial exclusion, locale sitemap slug naming. |

## Checks

| Check | Result |
|---|---|
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | Pass, 17 tests |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| Local smoke `/` | 200, English canonical unchanged |
| Local smoke `/scholarships` | 200, English canonical unchanged |
| Local smoke `/essays` | 200, English canonical unchanged |
| Local smoke `/providers` | 200, English canonical unchanged |
| Local smoke `/compare` | 200, English canonical unchanged |
| Local smoke `/sitemap.xml` | 200 |

## Not Done In Stage 1

- No `/es`, `/fr`, `/de`, or other localized routes were added.
- No locale middleware was activated.
- No translated content was created.
- No translated URLs were added to sitemap.
- No DB writes or migrations were performed.
- No OpenAI scripts or translation APIs were run.
- No auth, payment, subscription, Lemon, Supabase RLS, onboarding, user/private routes, or essay product flows were touched.

## Next Stage

Stage 2 should be a controlled `es`/`fr` pilot:

1. Add route wrappers for a very small public surface.
2. Translate only homepage, core hubs, trust pages, and selected curated guides.
3. Keep every translation noindex until status is `published` and quality checks pass.
4. Add localized sitemap documents only for published translations.
5. Validate hreflang in GSC before expanding.

