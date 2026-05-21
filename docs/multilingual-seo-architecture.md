# ScholarshipTop Multilingual SEO Architecture

Last updated: 2026-05-18

This document defines the Stage 1 i18n SEO foundation for ScholarshipTop. It is intentionally architecture-only: it does not launch translated pages, does not create translated sitemap entries, and does not make translated pages indexable without published content.

## Core Decisions

- English stays on root.
- Do not move English to `/en`.
- Current English URLs must remain unchanged:
  - `/scholarships`
  - `/essays`
  - `/providers`
  - `/compare`
  - `/resources`
- Non-English locales use prefixes:
  - `/es/...`
  - `/fr/...`
  - `/de/...`
- Do not launch `40k x 10` translated pages. Translation rollout must be phased and quality-gated.
- No translated page becomes indexable until it has published localized content and passes quality checks.

## Supported Locales

The canonical locale registry lives in `lib/i18n/locales.ts`.

```ts
SUPPORTED_LOCALES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'ar',
  'zh-Hans',
  'hi',
  'id',
  'vi',
  'ru'
]
```

Locale constants:

- `DEFAULT_LOCALE = 'en'`
- `ROOT_LOCALE = 'en'`
- `RTL_LOCALES = ['ar']`

Pilot languages:

- `es`
- `fr`

Arabic requires RTL visual QA before indexable release.

## URL Rules

English root special-case:

| Locale | Canonical path | Localized path |
|---|---|---|
| `en` | `/scholarships` | `/scholarships` |
| `es` | `/scholarships` | `/es/scholarships` |
| `fr` | `/essays/checklist` | `/fr/essays/checklist` |
| `ar` | `/` | `/ar` |

Helpers:

- `localizedPath(locale, canonicalPath)`
- `stripLocalePrefix(pathname)`
- `extractLocaleFromPath(pathname)`

The helper intentionally does not treat `/en/...` as a public English prefix. English is root.

## Canonical Rules

English:

```txt
/scholarships -> https://scholarshiptop.com/scholarships
```

Non-English:

```txt
es + /scholarships -> https://scholarshiptop.com/es/scholarships
fr + /compare/scholarship-vs-grant -> https://scholarshiptop.com/fr/compare/scholarship-vs-grant
```

Helpers:

- `getCanonical(path)` keeps current English behavior.
- `getLocalizedCanonical(canonicalPath, locale)` builds locale-aware absolute URLs.

## Hreflang Rules

Hreflang should be generated only for published/indexable localized pages.

Rules:

- include self;
- include English root if available;
- include only locales with published translations;
- include `x-default`;
- use fully qualified absolute URLs;
- never include missing, draft, stale, partial, private, noindex, or 404 pages.

Helper:

- `buildLocalizedAlternates({ canonicalPath, currentLocale, availableLocales, defaultUrl })`

Output shape is compatible with Next.js metadata:

```ts
{
  canonical: 'https://scholarshiptop.com/es/scholarships',
  languages: {
    en: 'https://scholarshiptop.com/scholarships',
    es: 'https://scholarshiptop.com/es/scholarships',
    fr: 'https://scholarshiptop.com/fr/scholarships',
    'x-default': 'https://scholarshiptop.com/scholarships'
  }
}
```

## Translation Status Model

Translation status type:

```ts
type TranslationStatus =
  | 'missing'
  | 'queued'
  | 'draft_machine'
  | 'draft_agent'
  | 'review_required'
  | 'reviewed'
  | 'published'
  | 'stale'
  | 'blocked';
```

Indexable translations require:

- source English page is indexable;
- status is `published`;
- quality score is at least `85`;
- localized title exists;
- localized H1 exists;
- localized body exists;
- no mixed-language risk.

If any condition fails:

- `robots = 'noindex, follow'`
- `includeInSitemap = false`
- `includeInHreflang = false`

## Sitemap Rules

Stage 1 does not add localized URLs to the production sitemap.

Foundation helpers live in `lib/i18n/localizedSitemaps.ts`.

Future localized sitemap documents should be bucketed by locale and content type:

- `/sitemaps/locale-es-core.xml`
- `/sitemaps/locale-es-essays.xml`
- `/sitemaps/locale-es-resources.xml`
- `/sitemaps/locale-es-compare.xml`
- `/sitemaps/locale-es-providers.xml`
- `/sitemaps/locale-es-scholarships-0.xml`

Inclusion rules:

- include only published translations;
- source English page must be indexable;
- translation quality must pass;
- exclude query, filter, search, pagination, private, auth, onboarding, subscription, and user-specific routes;
- exclude stale, draft, partial, blocked, or mixed-language pages.

## Noindex Rules

Keep noindex:

- query URLs;
- filter URLs;
- pagination beyond canonical views;
- missing translations;
- draft translations;
- partial translations;
- stale translations after material English source changes;
- private/user/auth/onboarding/subscription pages;
- weak provider pages;
- source English pages that are already noindex.

## Arabic RTL Requirements

Before Arabic pages become indexable:

- locale layout must render `lang="ar"` and `dir="rtl"`;
- navbar and mobile drawer must work RTL;
- cards, badges, breadcrumbs, filters, compare tables, and guide pages must not overflow;
- arrow icons and directional spacing must be checked;
- schema and metadata must use Arabic visible text.

## OpenAI-Free Translation Strategy

Stage 1 does not use OpenAI or any translation API.

Recommended rollout:

- P0: Codex/human-authored static translations for homepage, trust pages, hubs, and curated guides.
- P1: external translation API or reviewed machine drafts only after quality gates exist.
- Long-tail pages: machine drafts may exist, but remain noindex until reviewed/published.

Never invent:

- provider facts;
- scholarship facts;
- verification dates;
- official localized names;
- deadlines;
- award amounts;
- eligibility rules.

## Future Rollout Phases

### Stage 1: Foundation

Completed by helpers, tests, and documentation.

### Stage 2: Pilot `es` and `fr`

Translate only:

- homepage;
- `/scholarships`;
- `/essays`;
- `/providers`;
- `/compare`;
- `/resources`;
- trust pages;
- selected curated guides.

Expected launch size: roughly 50 new URLs for two languages.

### Stage 3: Expand To 5 Languages

Add:

- `de`
- `pt`
- `ar`

Arabic requires RTL QA before indexable release.

### Stage 4: Expand To 10 Languages

Add:

- `zh-Hans`
- `hi`
- `id`
- `vi`
- `ru`

### Stage 5: Controlled Long-Tail Translation

Translate by priority queue:

- top GSC pages;
- top country/category hubs;
- top resources;
- strong provider pages;
- strong scholarship details;
- only pages whose English source quality is already good.

Do not translate the full 40k-page surface until traffic, crawl, quality, and review systems prove stable.

