# Multilingual SEO Architecture Audit: ScholarshipTop

Date: 2026-05-17  
Scope: audit-only plan for adding 10 non-English languages to ScholarshipTop.  
Primary site: `https://scholarshiptop.com/`  
Current production sitemap size: 40,114 English SEO URLs.

## 1. Executive Summary

ScholarshipTop should not launch 10 languages across the full current SEO surface at once. The current site has roughly 40k indexable URLs; multiplying that by 10 target languages would create about 401k new translated URLs, or about 441k total URLs including English. That is too much crawl, QA, translation, hreflang, sitemap, and stale-content risk for a first release.

Recommended direction:

- Keep English on root. Do not move current URLs to `/en`.
- Add locale-prefixed routes for new languages: `/es/...`, `/fr/...`, `/de/...`.
- Start with a 2-language pilot: Spanish and French.
- Translate only high-value foundation pages and curated evergreen pages first.
- Keep partial, machine-only, missing, stale, or mixed-language translations noindex and out of sitemap.
- Build a translation status model and quality gates before translating long-tail scholarship, essay, provider, or compare pages.
- Use hreflang only for pages with real available translations; each locale page should self-canonicalize.
- Avoid browser/IP auto-redirects. Let Googlebot and users access every language URL directly.
- Treat Arabic as a later expansion after the design system supports `dir="rtl"`.

This approach preserves the existing English SEO footprint while creating a professional international SEO system that can scale safely.

## 2. Current Route And Sitemap Map

Production sitemap snapshot from 2026-05-17:

| Sitemap bucket | URLs | Translation readiness |
|---|---:|---|
| `core` | 85 | Best first candidate after route helpers exist. |
| `resources` | 909 | Translate static P0 resources first; DB articles later by GSC priority. |
| `essays` | 11,799 | Translate 11 curated static guides first; do not translate the entire generated essay surface. |
| `providers` | 5,061 | Translate provider directory framework first; detail pages later only if quality passes. |
| `categories` | 11 | Good Phase 3 candidates because they are curated and limited. |
| `seo` | 1,626 | Mixed programmatic hubs; translate only approved top country/category/cross-country routes. |
| `scholarships-0` | 19,448 | Biggest long-tail risk; translate only high-value indexable detail pages in controlled batches. |
| `compare` | 1,175 | Translate 4 static evergreen compare guides first; state/university matchups later. |

Route implementation map:

| Area | Current files | Current status |
|---|---|---|
| Root layout/schema | `app/layout.tsx`, `lib/seo/homePageJsonLd.ts` | English `lang`, English schema, no locale awareness. |
| Canonical | `lib/seo/canonical.ts` | Hard-coded `https://scholarshiptop.com`, no locale helper. |
| Sitemaps | `lib/seo/sitemaps.ts`, `app/sitemap.xml/route.ts`, `app/sitemaps/[slug]/route.ts` | Good bucket architecture; no localized sitemap support yet. |
| Robots | `app/robots.ts` | Allows public crawl except `/api/`; locale prefixes can be added without robots changes. |
| Middleware | `middleware.ts` | Handles canonical redirects, IQ subdomain, legacy slugs, Supabase session refresh. No locale routing yet. |
| Scholarships | `app/scholarships/[[...slugPath]]/*`, `lib/seo/scholarshipSeoQualityPolicy.ts` | Strong quality/intelligence layer; long-tail translation should be gated. |
| Essays | `app/essays/*`, `lib/essays/staticEssayGuides.ts` | 11 curated static guides plus large DB-backed generated surface. |
| Providers | `app/providers/*`, `lib/seo/providerSeoQualityPolicy.ts` | Provider quality policy exists; translate carefully due official names/source facts. |
| Compare | `app/compare/*`, `lib/compare/staticCompareGuides.ts`, `lib/seo/compareSeoQualityPolicy.ts` | 4 evergreen static guides are good pilot pages. |
| Resources | `app/resources/*`, `lib/resources/staticScholarshipGuides.ts` | Static guides plus DB content hub. |
| Trust pages | `lib/trust/trustPageContent.ts`, `components/trust/TrustPageTemplate.tsx` | High-value finite translation candidates. |

## 3. Language Selection Analysis

Current repo-visible data is not enough to choose languages purely from analytics:

- `lib/seo/googleSearchConsole.ts` can query GSC if credentials are present, but no GSC export is committed.
- first-touch analytics records landing URL, UTM, referrer, traffic channel, user agent, but the typed DB row does not persist country or browser language.
- runtime can read country headers (`cf-ipcountry`, `x-vercel-ip-country`) for notifications, but this is not yet a durable language-prioritization dataset.
- scholarship/profile data has applicant country, host country, citizenship, and preferred host-country fields, which can support later demand analysis.

Because first-party language/country analytics are not available in the repo, this audit recommends a default shortlist based on international-student demand, current country SEO surface, translation reach, and implementation complexity.

## 4. Recommended 10 Languages

| Language | Locale code | Why useful for ScholarshipTop | SEO opportunity | Translation difficulty | UI complexity | RTL? | Priority | Rollout phase | Indexable from start? |
|---|---|---|---|---|---|---:|---|---|---|
| Spanish | `es` | Large US, Latin America, Spain audience; strong scholarship-search demand. | Very high | Medium | Medium text expansion | No | P0 | Pilot | Yes, only reviewed P0 pages |
| French | `fr` | Canada, France, Francophone Africa; aligns with international student demand. | High | Medium | Medium text expansion | No | P0 | Pilot | Yes, only reviewed P0 pages |
| German | `de` | Germany is already a scholarship destination cluster; high education search value. | Medium-high | Medium-high | Long compounds and buttons | No | P1 | 5-language expansion | Yes after pilot validation |
| Portuguese | `pt` | Brazil and Portugal; large outbound student and scholarship-search audience. | High | Medium | Medium text expansion | No | P1 | 5-language expansion | Yes after pilot validation |
| Arabic | `ar` | MENA audience; high scholarship and study-abroad intent. | High | High | High due RTL | Yes | P1 | 5-language expansion after RTL QA | Not until RTL QA passes |
| Simplified Chinese | `zh-Hans` | Large international student market; high scholarship demand. | High | High | Medium; typography/search nuances | No | P2 | 10-language expansion | No until reviewed |
| Hindi | `hi` | India is already a priority applicant country; huge market. | Medium-high | High | Medium; mixed English/Hindi terms | No | P2 | 10-language expansion | No until reviewed |
| Indonesian | `id` | Large outbound student audience; scholarship terms search demand. | Medium-high | Medium | Low-medium | No | P2 | 10-language expansion | No until reviewed |
| Vietnamese | `vi` | Strong study abroad and scholarship search demand. | Medium-high | Medium | Medium diacritics | No | P2 | 10-language expansion | No until reviewed |
| Russian | `ru` | CIS/Central Asia/Eastern Europe; useful for study-abroad scholarship guidance. | Medium | Medium-high | Medium text expansion | No | P2 | 10-language expansion | No until reviewed |

Alternatives to keep in backlog:

| Language | Code | Why consider | Why not P0 |
|---|---|---|---|
| Bengali | `bn` | Large student population in Bangladesh/India. | Higher QA burden; prioritize after GSC/profile evidence. |
| Japanese | `ja` | Strong education market. | Search behavior and scholarship terms need careful localization. |
| Korean | `ko` | Strong outbound study market. | Smaller immediate fit than es/fr/pt/de/ar. |
| Turkish | `tr` | Useful for Turkey and scholarship demand. | Better after top 10 proof. |
| Urdu | `ur` | Pakistan/Urdu audience; right-to-left. | Adds second RTL complexity; do after Arabic. |

## 5. URL Architecture Decision

### Option A: English stays root, new languages use prefixes

Examples:

- `/scholarships`
- `/essays`
- `/providers`
- `/compare`
- `/es/scholarships`
- `/fr/scholarships`
- `/de/scholarships`

Pros:

- Preserves current English URLs and accumulated signals.
- Avoids a massive redirect project.
- Lower launch risk.
- Works cleanly with current canonical and sitemap buckets after helper upgrades.

Cons:

- English is a special case in helpers.
- Some i18n libraries prefer a default `/en` route, but this is manageable.

### Option B: Move English to `/en`

Examples:

- `/en/scholarships`
- `/es/scholarships`

Pros:

- Cleaner theoretical route symmetry.

Cons:

- High SEO risk for 40k existing URLs.
- Requires large redirect/canonical/hreflang migration.
- Creates unnecessary volatility for pages that are already indexable.

### Recommendation

Keep English on root and add locale prefixes for non-English languages. Do not move English to `/en`.

## 6. Locale Routing Plan

Recommended config:

```ts
export const SUPPORTED_LOCALES = [
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
] as const;

export const DEFAULT_LOCALE = 'en';
export const ROOT_LOCALE = 'en';
export const RTL_LOCALES = ['ar'] as const;
```

Architecture recommendation:

- Keep current root English routes as the source of truth.
- Add locale-prefixed public routes for non-English pages, not for private/auth/paywall routes in the SEO pilot.
- Add `lib/i18n/locales.ts`, `lib/i18n/paths.ts`, `lib/i18n/alternates.ts`, and `lib/i18n/translationQuality.ts`.
- Use middleware only to validate locale prefixes and protect existing canonical redirects; do not auto-redirect by browser language or IP.
- Add a locale layout that sets `lang` and `dir`.
- Add a language switcher that links only to published translations.
- If a translation is missing, do not show the English page inside the localized route as indexable content.

Missing translation behavior:

| Situation | User-facing behavior | SEO behavior |
|---|---|---|
| No locale route exists | 404 | No sitemap, no hreflang |
| Translation exists but draft/partial | Render only if needed for review or internal QA | `noindex, follow`, no sitemap, no hreflang |
| Translation stale after English update | Keep page visible if useful, but mark review needed internally | `noindex, follow` until revalidated if source changed materially |
| Translation published | Full localized content and UI | self-canonical, indexable, in locale sitemap, hreflang cluster |

## 7. Canonical And Hreflang Plan

Primary method: HTML metadata via Next.js `alternates.languages`.

Reason: Google treats HTML, HTTP header, and sitemap hreflang methods as equivalent; choosing one primary method is easier to maintain. For ScholarshipTop, route metadata is closest to canonical/noindex decisions and can use the same translation quality gates.

Use sitemap inclusion for discovery, but do not add sitemap-based hreflang in Phase 1 unless the same helper generates both HTML and XML alternates. Avoid parallel inconsistent hreflang systems.

Official Google requirements used for this plan:

- Google recommends distinct URLs for language versions and hreflang annotations for language alternates: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Each language version should list itself and other available variants, and alternate URLs must be fully qualified: https://developers.google.com/search/docs/specialty/international/localized-versions
- Canonical for hreflang pages should point to the same language version where possible: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls

Canonical rules:

| Page | Canonical |
|---|---|
| English root page | `https://scholarshiptop.com/{path}` |
| Spanish page | `https://scholarshiptop.com/es/{path}` |
| French page | `https://scholarshiptop.com/fr/{path}` |
| Missing translation | no localized page; no alternate |
| Partial translation | localized canonical if rendered, but robots noindex and not in hreflang |
| Query/filter page | canonical to localized root path, robots noindex |

Helper proposal:

```ts
type BuildLocalizedAlternatesInput = {
  canonicalPath: string; // no locale prefix, e.g. /scholarships
  currentLocale: SupportedLocale;
  availableLocales: SupportedLocale[];
  defaultUrl?: string; // x-default target
};

export function buildLocalizedAlternates(input: BuildLocalizedAlternatesInput) {
  return {
    canonical: localizedAbsoluteUrl(input.currentLocale, input.canonicalPath),
    languages: {
      en: localizedAbsoluteUrl('en', input.canonicalPath),
      es: localizedAbsoluteUrl('es', input.canonicalPath),
      fr: localizedAbsoluteUrl('fr', input.canonicalPath),
      'x-default': input.defaultUrl ?? localizedAbsoluteUrl('en', input.canonicalPath)
    }
  };
}
```

Rules:

- Include self in `languages`.
- Include only published/indexable translations.
- Use fully-qualified absolute URLs.
- Use `x-default` pointing to English root or a future language selector.
- Ensure bidirectional alternates: if `/es/foo` lists `/fr/foo`, then `/fr/foo` must list `/es/foo`.
- Never list a translation that is missing, draft, noindex, or 404.

## 8. Sitemap Plan

Do not add all translated URLs into one sitemap. Extend the current sitemap index with locale-aware documents.

Recommended URL shape for sitemap documents:

| Document | Purpose |
|---|---|
| `/sitemap.xml` | Root sitemap index, lists English buckets plus locale buckets. |
| `/sitemaps/core.xml` | Existing English core. |
| `/sitemaps/scholarships-0.xml` | Existing English scholarship details. |
| `/sitemaps/locale-es-core.xml` | Spanish foundation pages. |
| `/sitemaps/locale-es-essays.xml` | Spanish essay guides that pass quality. |
| `/sitemaps/locale-es-resources.xml` | Spanish resources that pass quality. |
| `/sitemaps/locale-es-compare.xml` | Spanish compare pages that pass quality. |
| `/sitemaps/locale-es-providers.xml` | Spanish provider pages, only after provider translation policy exists. |
| `/sitemaps/locale-es-scholarships-0.xml` | Spanish scholarship details, only controlled batches. |

Why this shape:

- It fits the existing `/sitemaps/[slug]` route and `.xml` rewrite pattern.
- It keeps each locale and content type observable in GSC.
- It avoids a single huge locale sitemap.
- It can chunk `locale-{locale}-{bucket}-{index}.xml` under the 50k URL limit.

Translated URL inclusion rules:

Include only if:

- source English page is indexable;
- translation exists;
- translation status is `published`;
- title, meta description, H1, visible content, FAQ, and schema text are translated;
- canonical is locale-specific;
- hreflang cluster is valid and bidirectional;
- page has no mixed-language issue;
- internal links resolve or intentionally point to English with a clear fallback policy;
- schema mirrors visible content;
- underlying page-type quality policy passes.

Exclude if:

- missing translation;
- partial translation;
- raw machine translation;
- `review_required`, `draft_machine`, `draft_agent`, `queued`, `blocked`, or `stale`;
- query/filter/pagination page;
- user/private/auth/paywall page;
- translated title/schema but English body;
- 404 or soft-404;
- English source page is noindex or not in English sitemap.

## 9. Translation Data Model

Recommendation: hybrid.

- Phase 1: static JSON/TypeScript manifests for finite curated pages.
- Phase 2+: DB-backed `localized_content` and `translation_jobs` tables after explicit migration approval.
- Use source hashes so English edits can mark translations stale.

Proposed type:

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

type LocalizedContent = {
  entityType:
    | 'route'
    | 'scholarship'
    | 'essay'
    | 'provider'
    | 'compare'
    | 'resource'
    | 'trust_page'
    | 'category'
    | 'country_page';
  entityId: string;
  sourceLocale: 'en';
  targetLocale: 'es' | 'fr' | 'de' | 'pt' | 'ar' | 'zh-Hans' | 'hi' | 'id' | 'vi' | 'ru';
  sourcePath: string;
  localizedPath?: string;
  slug?: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro?: string;
  bodyBlocks: unknown;
  faq?: unknown;
  ctaLabels?: Record<string, string>;
  schemaText?: Record<string, unknown>;
  status: TranslationStatus;
  qualityScore?: number;
  sourceContentHash: string;
  reviewedBy?: string;
  reviewedAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

Translation job model:

```ts
type TranslationJob = {
  id: string;
  sourceEntityType: LocalizedContent['entityType'];
  sourceEntityId: string;
  sourcePath: string;
  sourceLocale: 'en';
  targetLocale: SupportedLocale;
  priority: 'p0' | 'p1' | 'p2' | 'low';
  status: 'queued' | 'processing' | 'drafted' | 'needs_review' | 'published' | 'failed' | 'blocked';
  engine: 'codex_static' | 'deepl' | 'google_translate' | 'microsoft_translator' | 'self_hosted' | 'manual';
  sourceContentHash: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};
```

## 10. Translation Pipeline

New English content flow:

1. English page is created or updated.
2. Source extractor reads translatable fields.
3. Source hash is computed.
4. Page-type SEO policy checks whether the English source is eligible for translation.
5. Translation jobs are created for approved target locales.
6. Translation draft is produced by the selected engine or agent-authored static content.
7. Automated validators run.
8. Status becomes `review_required`.
9. Human/agent review approves or blocks.
10. Status becomes `published`.
11. Localized route can render.
12. Localized URL joins hreflang and sitemap.

Translate:

- title;
- meta description;
- H1;
- intro;
- body sections;
- FAQ;
- CTA labels;
- breadcrumbs;
- schema visible text;
- alt text;
- image captions;
- trust/disclaimer snippets;
- filters and empty states for public hubs.

Do not translate or alter:

- external URLs;
- provider legal names unless a known official localized name exists;
- scholarship names unless a known official localized name exists;
- university/legal organization names;
- brand names;
- source URLs/domains;
- codes;
- award amounts;
- eligibility facts;
- deadlines, except display format;
- official-source claims or verification status.

## 11. OpenAI-Free Translation Options

| Option | Fit | Pros | Cons | Recommendation |
|---|---|---|---|---|
| Codex-authored static translations | Trust pages, homepage, hubs, top guides | No API spend; high control; good for P0 | Does not scale to 40k pages quickly | Use for pilot P0 pages. |
| DeepL later | European languages, high-quality prose | Strong quality for es/fr/de/pt/ru; glossary support | Paid API; less coverage for hi/id/vi/ar/zh than generic providers | Good future production option. |
| Google Cloud Translation later | Broad language coverage | Strong coverage across all 10 locales | Paid API; quality varies by domain | Good for draft_machine pipeline. |
| Microsoft Translator later | Broad coverage, enterprise controls | Good API/terminology options | Paid API; QA still required | Secondary provider. |
| Self-hosted NLLB | Broad multilingual coverage | No per-character API fees after setup | Requires infra, batching, QA; quality can vary | Consider for draft/noindex long-tail only. |
| MarianMT | Many language pairs | Lightweight for some pairs | Pair-specific models; uneven quality | Not ideal as primary 10-language engine. |
| LibreTranslate | Simple self-hosted API | Easy to prototype | Quality and throughput concerns | Not for indexable SEO without review. |
| Bergamot | Browser/local translation niche | Privacy-friendly | Not a scalable web content pipeline | Not primary. |

Recommended translation strategy: hybrid.

- P0 and P1 curated pages: Codex/human-authored reviewed translations.
- Long-tail pages: machine draft only, noindex until review/quality threshold passes.
- No OpenAI dependency required for the architecture.

## 12. Quality Gates For Translated Pages

Automatic checks:

- title present and target-language detected;
- meta description present and translated;
- H1 present and translated;
- no English-heavy body for non-English locale;
- no untranslated UI labels in nav, filters, cards, buttons, FAQ, or CTA;
- no broken internal links;
- no 404 alternates;
- no invalid hreflang;
- no conflicting canonical;
- no query URL;
- content length above page-type minimum;
- visible FAQ exists if FAQ schema is emitted;
- schema text language matches page language;
- dates and amounts preserved;
- provider/scholarship names preserved unless official localized name is known.

Language-quality checks:

- language detection target equals expected locale;
- source-language percentage below threshold;
- glossary terms preserved;
- legal names preserved;
- no added facts, deadlines, amounts, eligibility, or provider claims;
- no translated content that contradicts financial-aid disclaimers.

SEO decision:

```ts
if (translation.status !== 'published' || translation.qualityScore < 85) {
  robots = 'noindex, follow';
  includeInSitemap = false;
  includeInHreflang = false;
} else {
  robots = 'index, follow';
  includeInSitemap = true;
  includeInHreflang = true;
}
```

Page-type inheritance:

- A translated scholarship page can only index if the English scholarship page is indexable.
- A translated provider page can only index if provider quality policy passes.
- A translated compare page can only index if compare quality policy passes.
- A translated category/country page can only index if the English page is curated, promoted, and not thin.
- Query/filter/private pages remain noindex in every locale.

## 13. Localized UI And RTL Design Risks

UI zones that need localization:

- navbar and mobile drawer;
- footer;
- scholarship filters;
- cards and badges;
- trust blocks;
- compare tables;
- essay/resource guide UI;
- provider source-status labels;
- pagination;
- breadcrumbs;
- empty states;
- CTA buttons;
- paywall labels if a localized public route can expose them;
- metadata and schema text.

Arabic RTL requirements:

- set `<html lang="ar" dir="rtl">`;
- verify card grid, badges, icons, arrows, breadcrumbs, compare tables, filter drawers, and mobile nav;
- avoid hard-coded left/right layout assumptions where possible;
- use logical CSS properties where feasible;
- verify no horizontal overflow at mobile width;
- do not launch Arabic indexable URLs until RTL QA passes.

Text expansion risks:

- German, French, Portuguese, Russian, and Arabic labels may be 20-40% longer than English.
- Badges and buttons need flexible width or shorter localized labels.
- Compare tables need responsive stacking on mobile.
- Card snippets should clamp safely and not hide critical source/status text.

## 14. Localized Slug Strategy

### Option 1: English slugs with locale prefix

Examples:

- `/es/scholarships/no-essay`
- `/fr/essays/checklist`
- `/de/compare/scholarship-vs-grant`

Pros:

- Lowest routing risk.
- Easy to map to source page.
- Avoids large slug-mapping tables for long-tail scholarship/provider pages.
- Good for first pilot.

Cons:

- Less natural for users and search snippets.

### Option 2: localized slugs

Examples:

- `/es/becas/sin-ensayo`
- `/fr/bourses/sans-essai`

Pros:

- Better UX and keyword alignment for curated pages.

Cons:

- Requires slug mapping, redirects, collision handling, and localized internal-link helpers.
- More risk for 404/hreflang mismatches.

### Recommendation

Pilot with locale prefix plus English route slugs for all pages. Add localized slugs later only for curated evergreen pages and core hubs after slug mapping is built.

Final staged slug policy:

| Page type | Phase 1 slug | Later slug option |
|---|---|---|
| Homepage | `/es` | no change |
| Core hubs | `/es/scholarships` | `/es/becas` later if worth it |
| Static essays/resources/compare | `/es/essays/checklist` | localized slugs after pilot |
| Scholarship details | `/es/scholarships/{english-slug}` | keep English slug long-term for stability |
| Providers | `/es/providers/{provider-slug}` | keep provider slug; do not translate legal names |
| Query/filter pages | no indexable localized SEO route | no localized query SEO |

## 15. What Pages To Translate First

Phase 1 foundation pages:

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

Phase 2 high-value evergreen pages:

- `/essays/examples`
- `/essays/checklist`
- `/essays/financial-need`
- `/essays/career-goals`
- `/essays/mistakes`
- `/compare/scholarship-vs-grant`
- `/compare/merit-vs-need-based-scholarships`
- `/compare/no-essay-vs-essay-scholarships`
- `/compare/local-vs-national-scholarships`

Phase 3 top SEO hubs:

- top 20 country/cross-country pages;
- top 20 category pages or all promoted category pages if fewer;
- top provider directory/state pages;
- top resources by GSC impressions;
- provider hub and selected provider profiles only if quality passes.

Phase 4 controlled scholarship detail translation:

Translate only if:

- English source page is indexable;
- page has traffic/impressions or strong strategic value;
- source/trust status is good;
- detail page has enough original explanatory content;
- not expired/thin/raw;
- translation quality passes;
- no stale source update pending.

## 16. URL Count By Phase

Assuming 10 new non-English locales.

| Phase | English source pages | New URLs with 2-locale pilot | New URLs with all 10 locales | Indexing stance |
|---|---:|---:|---:|---|
| Phase 1 foundation | 16 | 32 | 160 | Index only after review. |
| Phase 2 evergreen | 9 | 18 | 90 | Index only after review. |
| Phase 3 top hubs | about 60-80 | 120-160 | 600-800 | Index selected pages after quality and GSC validation. |
| Phase 4 first long-tail batch | 500 | 1,000 | 5,000 | Controlled batch, not automatic full release. |
| Full current surface | 40,114 | 80,228 | 401,140 | Not recommended. |

## 17. Automatic New-Content Translation Flow

When a new source page is created:

```ts
onSourceContentPublished(source) {
  if (!isTranslatableRoute(source.path)) return;
  if (!englishSeoQualityPasses(source)) return;
  for (const locale of enabledTargetLocales) {
    enqueueTranslationJob({
      sourceEntityType: source.entityType,
      sourceEntityId: source.id,
      sourcePath: source.path,
      sourceLocale: 'en',
      targetLocale: locale,
      priority: computeTranslationPriority(source),
      status: 'queued'
    });
  }
}
```

Priority rules:

| Priority | Page types |
|---|---|
| High | Homepage, trust pages, core hubs, curated evergreen guides, high-GSC resources. |
| Medium | Promoted categories, approved country/cross-country pages, strong provider pages. |
| Low | Scholarship details with moderate impressions and strong data completeness. |
| No translation | private/user routes, auth, checkout, onboarding, query pages, weak/noindex pages. |

When English source changes:

- recompute `sourceContentHash`;
- mark translations `stale` if hash changed materially;
- keep old translated page indexable only for minor formatting edits;
- noindex if core facts changed: deadline, eligibility, award, provider/source, disclaimer, or trust policy.

## 18. International SEO Risk Analysis

| Risk | Severity | Why it matters | Mitigation |
|---|---|---|---|
| 400k translated URL explosion | Critical | Crawl budget and scaled-content risk. | Pilot 2 languages, limited pages, batch long-tail later. |
| Machine-translated thin pages | Critical | Can look like scaled low-value content. | Draft/noindex until reviewed and quality score passes. |
| Hreflang mismatch | High | Alternates may be ignored. | Central helper, bidirectional tests, available locales only. |
| Wrong canonical | High | Google may fold translations into English. | Self-canonical per locale; no English canonical on translated pages. |
| Mixed-language pages | High | Google detects language by visible content; poor UX. | Translate UI and body together; no English fallback index. |
| Untranslated schema/title | High | Inconsistent page signals. | Schema generated from localized visible fields only. |
| Arabic RTL breakage | High | Usability and quality issue. | Phase Arabic after RTL layout QA. |
| Sitemap bloat | High | Discovery and crawl waste. | Locale+bucket sitemaps and quality inclusion gates. |
| Stale translations | High | Scholarship facts change; stale eligibility/deadline info harms trust. | Source hash, stale status, noindex on material changes. |
| Translated provider names | Medium-high | Can invent or distort legal identity. | Preserve official names unless known localized names exist. |
| Translated scholarship names | Medium-high | Can distort official award names. | Preserve names; translate explanatory copy only. |
| Wrong country/language targeting | Medium | Users may get wrong version. | Use language-only locales at first, not country-specific locales. |
| Auto-redirects hide versions | Medium | Googlebot may not crawl all locales. | No IP/browser auto-redirects. |
| Duplicate localized slugs | Medium | 404/canonical/hreflang errors. | Start with English slugs; add slug mapping later. |
| Legal/trust translation inaccuracies | Medium | Trust and compliance risk. | Human/Codex-authored reviewed translations for trust pages. |
| Internal links to missing translations | Medium | Poor UX, broken hreflang clusters. | Link helper falls back intentionally; language switcher only for available pages. |
| UI text expansion | Medium | Broken cards/buttons/mobile nav. | Responsive QA per locale. |

## 19. Recommended Rollout Plan

### Stage 0: Audit Only

Current task. No code changes beyond reports.

### Stage 1: I18n Architecture Foundation

Build:

- locale config;
- localized URL helper;
- locale-aware canonical helper;
- hreflang builder;
- translation status model;
- translation quality policy;
- sitemap design;
- localized metadata helper;
- noindex policy for missing/partial/stale translations.

Acceptance:

- English URLs unchanged.
- No locale page indexable without `published` translation.
- No query localized pages in sitemap.

### Stage 2: Pilot 2 Languages

Recommended pilot: `es` and `fr`.

Translate:

- Phase 1 foundation pages;
- 9 Phase 2 evergreen pages;
- shared UI labels required to render those routes.

Expected new URLs: about 50 total for 2 locales.

Acceptance:

- `hreflang` self + English + other pilot locale + `x-default`.
- self-canonical per locale.
- locale sitemap documents present.
- GSC validation for submitted locale sitemaps.
- Visual QA desktop/mobile for both languages.

### Stage 3: Expand To 5 Languages

Add `de`, `pt`, `ar`.

Special requirement:

- Arabic does not become indexable until RTL QA passes for header, footer, cards, filters, compare tables, guide pages, and mobile nav.

### Stage 4: Expand To 10 Languages

Add `zh-Hans`, `hi`, `id`, `vi`, `ru`.

Acceptance:

- language-specific quality checks pass;
- glossary and legal-name preservation passes;
- no mixed-language UI labels.

### Stage 5: Controlled Long-Tail Translation

Do not translate all 40k at once.

Priority order:

1. top GSC pages by impressions/clicks;
2. top promoted country/category pages;
3. top resources;
4. top provider profiles with source status;
5. top scholarship detail pages with strong source/data completeness;
6. compare matchups only when content is non-thin and evergreen.

## 20. Exact Files Likely To Change Later

Add:

- `lib/i18n/locales.ts`
- `lib/i18n/paths.ts`
- `lib/i18n/alternates.ts`
- `lib/i18n/translationQuality.ts`
- `lib/i18n/translationPolicy.ts`
- `lib/i18n/loadLocalizedContent.ts`
- `lib/i18n/staticTrustPages.ts`
- `lib/i18n/staticEssayGuides.ts`
- `lib/i18n/staticCompareGuides.ts`
- `lib/i18n/localizedSitemaps.ts`
- `lib/i18n/__tests__/alternates.test.ts`
- `lib/i18n/__tests__/translationQuality.test.ts`

Modify:

- `app/layout.tsx`
- `app/global-error.tsx`
- `middleware.ts`
- `lib/seo/canonical.ts`
- `lib/seo/sitemaps.ts`
- `lib/seo/homePageJsonLd.ts`
- route `generateMetadata` for homepage, scholarships, essays, providers, compare, resources, trust pages
- `components/ui/Navbar/*`
- `components/ui/Footer/*`
- public card/filter/badge components used on localized pages
- static content loaders for trust/essay/resource/compare pages

Possible App Router structure:

```txt
app/
  page.tsx                         # English root unchanged
  scholarships/...                 # English unchanged
  [locale]/
    layout.tsx                     # non-English lang/dir wrapper
    page.tsx
    scholarships/...
    essays/...
    providers/...
    compare/...
    resources/...
    about/page.tsx
```

Alternative for lower duplication:

- route handlers can share server components with `locale` prop;
- existing English pages keep current imports;
- localized routes call the same loaders plus translation resolver.

## 21. What Not To Touch

- Current English URL structure.
- Auth and Supabase session behavior.
- Payments, Lemon, subscriptions, paywall.
- Supabase RLS.
- User essay product routes under `app/api/essay/*` and `lib/essay/*`.
- Saved/ignored/onboarding/private user routes.
- Existing query noindex rules.
- Existing sitemap exclusions for noindex/query routes.
- OpenAI-dependent translation/generation scripts unless separately approved.

## 22. Acceptance Criteria For Future Implementation

Architecture foundation is ready when:

- English root pages remain unchanged and indexable as before.
- `SUPPORTED_LOCALES` and `ROOT_LOCALE` are centralized.
- localized canonical helper returns root URL for English and prefix URL for non-English.
- `buildLocalizedAlternates` includes only available published locales.
- missing translations are not in hreflang or sitemap.
- partial translations are noindex and excluded from sitemap.
- locale sitemap documents exist only for published translations.
- Arabic pages set `dir="rtl"`.
- query/filter/pagination localized URLs are noindex.
- schema text is localized or omitted; no English schema on non-English pages.
- no translated page is indexable unless source English page is indexable.
- all localized internal links are generated through helper functions.
- tests cover canonical, hreflang, sitemap inclusion, missing translations, partial translations, and RTL dir.

## 23. Direct Answers To Required Questions

Should English stay root or move to `/en`?

- Keep English on root. Moving to `/en` is unnecessary and risky for the current 40k English SEO surface.

Which 10 languages should be targeted?

- `es`, `fr`, `de`, `pt`, `ar`, `zh-Hans`, `hi`, `id`, `vi`, `ru`.

How many translated URLs would be created per phase?

- Pilot foundation + evergreen: about 50 new URLs for `es` and `fr`.
- Foundation across all 10 target locales: about 160 URLs.
- Foundation + evergreen across all 10: about 250 URLs.
- Top hubs across all 10: roughly 600-800 additional URLs.
- Full current surface across 10 target locales: about 401,140 new URLs, not recommended.

Which page types should be translated first?

- Trust pages, homepage, core hubs, curated essay guides, curated compare guides, top static resources.

Which pages must remain noindex?

- Query/filter/pagination views, private/user/auth/onboarding/subscription pages, missing/partial/stale translations, English source noindex pages, weak provider pages, manual-review country/cross-country routes, raw machine translations.

How will hreflang be generated?

- Via centralized metadata helper using only published translations, self-reference, English root, available locales, and `x-default`.

How will sitemap avoid bloat?

- Locale+bucket sitemap documents with quality gates, chunking under 50k URLs, and no inclusion for draft/noindex/missing translations.

How will new content auto-enter translation queue?

- Source publish/update event computes source hash, checks English SEO quality, creates translation jobs for enabled locales by priority, and keeps output noindex until published.

How do translated pages become indexable?

- Translation status must be `published`, quality score must pass threshold, source English page must be indexable, canonical/hreflang/schema checks must pass, and page must be included in locale sitemap.

How do missing/partial translations behave?

- Missing translations are not generated, linked, hreflanged, or sitemapped. Partial translations may render only for review, with `noindex, follow`, no sitemap, no hreflang.

How will Arabic RTL be handled?

- `ar` pages use `lang="ar"` and `dir="rtl"` in the locale layout; no Arabic indexable release until RTL visual QA passes.

How to avoid OpenAI dependency?

- Use Codex/human-authored static translations for P0 pages; later use external or self-hosted translation engines for draft/noindex long-tail with review gates.

What is the safest pilot?

- Spanish and French, foundation pages plus curated evergreen pages only, about 50 new URLs total.

Which files/routes/helpers need to change later?

- Add `lib/i18n/*`, localized route wrappers, locale-aware canonical/metadata/sitemap helpers, schema updates, nav/footer localization, and tests. Preserve existing English routes.

## 24. Final Recommendation

Do not launch 10 languages across all current pages. Build the multilingual architecture first, then launch a small reviewed pilot. ScholarshipTop's SEO strength comes from trust, verification, source clarity, application guidance, and quality gates; translated SEO must preserve that same value layer. The correct goal is not "more pages in more languages." It is "only useful, reviewed, localized pages that deserve to be indexed."

