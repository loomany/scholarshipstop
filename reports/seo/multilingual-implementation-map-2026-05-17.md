# ScholarshipTop Multilingual SEO Implementation Map

Date: 2026-05-17  
Scope: audit-only architecture discovery for adding 10 languages to ScholarshipTop.  
Constraints honored: no product code changes, no DB writes, no migrations, no OpenAI-dependent scripts, no commit, no push.

## Executive Notes

- ScholarshipTop is currently an English-root Next.js App Router site with no locale routing layer.
- Production sitemap at audit time contains 40,114 URLs across 8 sitemap documents.
- The current SEO foundation is strong enough to support localization later: canonical helpers, dedicated sitemap buckets, trust pages, query noindex rules, and quality gates for scholarships, providers, categories, cross-country routes, and compare guides.
- The multilingual risk is scale. Translating all ~40k indexable URLs into 10 languages would create roughly 400k translated URLs before quality, review, hreflang, and crawl-budget systems exist.
- The safest architecture is to keep English on root, add locale-prefixed routes for non-English languages, and only index translated pages that pass translation quality gates.

## Production Sitemap Snapshot

Fetched read-only from `https://scholarshiptop.com/sitemap.xml` on 2026-05-17.

| Sitemap | URL count | Notes |
|---|---:|---|
| `/sitemaps/core.xml` | 85 | Home, trust pages, core hubs, IQ subdomain SEO paths, provider state hubs. |
| `/sitemaps/resources.xml` | 909 | DB-backed published resources plus curated static scholarship guides. |
| `/sitemaps/essays.xml` | 11,799 | DB-backed essay guide surface plus curated static essay guides. |
| `/sitemaps/providers.xml` | 5,061 | Quality-gated provider profiles. |
| `/sitemaps/categories.xml` | 11 | Promoted scholarship category hubs. |
| `/sitemaps/seo.xml` | 1,626 | Programmatic scholarship SEO hubs, country and cross-country routes. |
| `/sitemaps/scholarships-0.xml` | 19,448 | Scholarship detail pages. |
| `/sitemaps/compare.xml` | 1,175 | Static compare guides plus DB-backed state/university comparison pages. |
| **Total** | **40,114** | Current English SEO surface. |

## Current Route Groups

| Route area | Primary files | Backing model | Current SEO notes |
|---|---|---|---|
| Homepage | `app/page.tsx`, `components/seo/HomePageJsonLd.tsx`, `lib/seo/homePageJsonLd.ts`, `app/layout.tsx` | Static/server-rendered | Root English, sitewide Organization/WebSite schema, English-only metadata. |
| Scholarships catalog/details | `app/scholarships/[[...slugPath]]/page.tsx`, `app/scholarships/[[...slugPath]]/layout.tsx`, `app/scholarships/scholarshipsSlugPathPageBody.tsx`, `app/scholarships/ScholarshipDetailPageClient.tsx` | DB-backed plus static programmatic manifests | Query views noindex; detail schema and intelligence blocks exist; unknown routes call `notFound`. |
| Scholarship categories | `app/scholarships/category/[slug]/page.tsx`, `app/scholarships/category/categoryExpertContent.ts`, `lib/scholarships/categorySeoAllowlist.ts` | Curated category allowlist + DB listings | Promoted categories can index; weak/unpromoted categories noindex. |
| Country/cross-country hubs | `app/scholarships/scholarshipCountrySeo.ts`, `lib/seo/crossCountrySitemapEntries.ts`, `lib/scholarships/seoCrossCountryManifest.ts` | Static route builders + manifest | Country SEO routes are limited; cross-country manifest has index/noindex/sitemap status. |
| Essays | `app/essays/page.tsx`, `app/essays/[slug]/page.tsx`, `lib/essays/staticEssayGuides.ts`, `lib/essays/essaysServer.ts` | DB-backed essays plus 11 curated static guides | Hub query/page views noindex; static guides have Article/FAQ/Breadcrumb schema. |
| Providers | `app/providers/page.tsx`, `app/providers/[id]/page.tsx`, `lib/providers/*`, `lib/seo/providerSeoQualityPolicy.ts` | DB-backed provider hub/profile data | Provider sitemap uses provider quality policy; query/state filters noindex unless canonical. |
| Compare | `app/compare/page.tsx`, `app/compare/[slug]/page.tsx`, `app/compare/states/*`, `app/compare/universities/*`, `lib/compare/staticCompareGuides.ts`, `lib/seo/compareSeoQualityPolicy.ts` | 4 static evergreen compare guides plus DB-backed state/university pages | Query views noindex; static compare guides quality-gated for sitemap. |
| Resources | `app/resources/page.tsx`, `app/resources/[slug]/page.tsx`, `lib/resources/staticScholarshipGuides.ts`, `lib/content-hub/contentPostsServer.ts` | DB-backed resources plus 9 curated static guides | Hub query/filter views noindex; article pages emit Article/FAQ/Breadcrumb when visible. |
| Trust pages | `app/about/page.tsx`, `app/editorial-policy/page.tsx`, `app/scholarship-verification-methodology/page.tsx`, `app/how-we-rank-scholarships/page.tsx`, `app/how-scholarshiptop-works/page.tsx`, `app/contact/page.tsx`, `app/financial-aid-disclaimer/page.tsx`, `app/corrections/page.tsx`, `app/scholarship-scam-warning/page.tsx`, `app/how-we-make-money/page.tsx`, `lib/trust/trustPageContent.ts` | Static authored content | Strong first localization candidates because content is finite and trust-critical. |
| Auth/account/private | `app/account`, `app/signin`, `app/signup`, `app/onboarding`, `app/subscription`, `app/saved-scholarships`, `app/essays/u/[id]`, `app/essay/*` | Auth/user/paywall/product flows | Must remain noindex/private and should not be part of multilingual SEO pilot. |
| IQ subdomain | `app/iq/*`, `middleware.ts`, `lib/seo/sitemaps.ts` | Separate product surface under `iq.scholarshiptop.com` | Sitemapped in core; not a P0 target for ScholarshipTop multilingual SEO unless product owner approves. |

## SEO Infrastructure

| Concern | Current implementation | Multilingual implication |
|---|---|---|
| Canonical helper | `lib/seo/canonical.ts` hard-codes `https://scholarshiptop.com` and strips query/hash. | Needs locale-aware canonical builder that preserves root English and prefixes translated paths. |
| Metadata | Route-level `generateMetadata` uses `alternates.canonical`; no language alternates yet. | Add a centralized alternates helper rather than hand-writing hreflang per route. |
| Sitemap | `app/sitemap.xml/route.ts`, `app/sitemaps/[slug]/route.ts`, `lib/seo/sitemaps.ts` build bucketed XML. | Extend with locale sitemap documents after translation quality gates exist. |
| Robots | `app/robots.ts` allows all except `/api/`; sitemap points to root sitemap. | Do not block locale prefixes. Use per-page robots metadata for unpublished translations. |
| Query noindex | `/scholarships`, `/essays`, `/providers`, `/compare`, `/resources` query/page/filter views set `noindex, follow` with canonical root. | Preserve this for localized routes; query translated pages must stay noindex. |
| HTML language | `app/layout.tsx` renders `<html lang="en">`; `global-error.tsx` also hard-codes English. | Locale layout must set `lang` and `dir`, especially `dir="rtl"` for Arabic. |
| Sitewide schema | `app/layout.tsx` emits Organization/WebSite/SearchAction with `availableLanguage: ['English']`; `lib/seo/homePageJsonLd.ts` has `inLanguage: 'en-US'`. | Update schema per locale only after translated UI/content is real; availableLanguage can expand after pilot. |
| Middleware | `middleware.ts` manages canonical redirects, IQ subdomain rewrites, legacy scholarship slugs, Supabase sessions. | Locale routing must avoid breaking existing redirects and Supabase session refresh. |
| Next config | `next.config.mjs` only rewrites sitemap XML and legacy redirects; no Next i18n config. | Locale routing should be explicit App Router architecture, not a massive redirect move to `/en`. |

## Existing Quality Gates

| Gate | File | Current role |
|---|---|---|
| Scholarship detail quality/intelligence | `lib/seo/scholarshipSeoQualityPolicy.ts` | Source status, missing data, difficulty, deadline urgency, detail index policy. |
| Provider quality | `lib/seo/providerSeoQualityPolicy.ts` | Decides provider index/sitemap eligibility using source status, active scholarship count, clear name, route resolution. |
| Compare quality | `lib/seo/compareSeoQualityPolicy.ts` | Requires stable public route, real intent, comparison table, FAQ, internal links, and enough facts. |
| Category quality | `lib/scholarships/categorySeoAllowlist.ts`, `lib/scholarships/seoListingMetadataPolicy.ts` | Promoted category allowlist plus thin-listing fallback/noindex. |
| Cross-country quality | `lib/scholarships/seoCrossCountryManifest.ts`, `lib/seo/crossCountrySitemapEntries.ts` | Manifest status controls index/sitemap; many pairs remain noindex/manual review. |
| Programmatic hub drip | `lib/seo/seoDripFeed.ts`, `lib/seo/sitemaps.ts` | Restricts sitemap exposure for generated SEO paths when drip is active. |
| Static fallback policy | `docs/seo-static-content-fallback-policy.md` | Allows curated static content when OpenAI generators are unavailable; forbids fake facts. |
| General SEO policy | `docs/seo-quality-policy.md` | Index/noindex, schema, sitemap, and forbidden-practice rules for future publishing. |

## Content Source Types

| Source type | Examples | Translate first? | Notes |
|---|---|---:|---|
| Static trust pages | `lib/trust/trustPageContent.ts` | Yes, Phase 1 | Finite, brand/trust critical, low data-risk if reviewed. |
| Static guides | `lib/essays/staticEssayGuides.ts`, `lib/resources/staticScholarshipGuides.ts`, `lib/compare/staticCompareGuides.ts` | Yes, Phase 2 | Good pilot candidates because content is curated and not DB-dependent. |
| DB resources/essays | `content_posts`, `essays` via server loaders | Later | Many pages; only translate top pages by GSC/traffic and quality. |
| DB scholarships | `scholarships` via detail/list loaders | Later controlled long-tail | Highest scale and highest freshness risk; only index translations after source page and translation pass quality. |
| DB providers | `provider_hub_listing`, provider profile loaders | Later | Translate provider framework copy first; provider names/legal entities should not be translated. |
| DB compare pages | `compare_pages`, `state_compare_pages` | Later | Static compare guides first; DB programmatic matchups need fact and thin-content gates. |
| User/private content | Saved scholarships, essay results, onboarding, account, subscription | No | Keep private/noindex. |

## Analytics / Demand Signals Available

| Data source | Current status | Multilingual use |
|---|---|---|
| GSC API helper | `lib/seo/googleSearchConsole.ts` can count and inspect pages when credentials exist. | Use GSC impressions/clicks by page/query/country to prioritize languages and pages before translation. |
| First-touch attribution | `components/AnalyticsTracker.tsx`, `app/api/analytics/first-touch/route.ts`, `anonymous_visitor_first_touch` table. | Captures landing URL, UTM, referrer, channel, user agent; currently does not persist country/language in DB type. |
| Runtime country signal | `lib/analytics/visitorDiagnostics.ts` can read `cf-ipcountry`, `x-vercel-ip-country`, `x-country-code`. | Country is used for Telegram notification context, but not stored in the typed first-touch table. |
| Applicant profile country | `profiles.country_code`, `preferred_host_country_codes`, `citizenship_status`; scholarship rows include `applicant_country_codes` and `host_country_codes`. | Useful for language and country-page prioritization, but requires read-only aggregate reporting. |
| AI-search traffic | `components/analytics/GptTrafficTracker.tsx`, `app/api/track-gpt-visit/route.ts`, `resolveTrafficChannel.ts` with `ai_chatgpt`. | Useful for answer-engine visibility, not language prioritization by itself. |

## Current I18n Gaps

- No `lib/i18n/*` config, locale registry, localized path helper, or translation status model.
- No App Router locale segment such as `app/[locale]/...`.
- No hreflang output in metadata or sitemap.
- No locale-aware sitemap builder.
- Root layout hard-codes `lang="en"` and LTR direction.
- Sitewide schema lists English only.
- Nav, footer, filters, badges, buttons, paywall labels, and empty states are hard-coded English.
- Existing scripts include OpenAI-dependent content generation; no translation queue/fallback pipeline exists yet.

## Pages Not To Translate First

| Area | Reason |
|---|---|
| All 19,448 scholarship detail pages | Too much scale; high data freshness and translation quality risk. Translate only high-value indexable details later. |
| All 11,799 essay URLs | Many are scholarship-specific/generated; start with curated static essay guides only. |
| All 5,061 provider profiles | Provider names, official identity, and source confidence need careful handling; translate framework copy first. |
| All 1,175 compare URLs | Start with 4 evergreen compare guides; programmatic state/university matchups later. |
| Query/filter/pagination URLs | Already noindex; must stay noindex in every locale. |
| Auth/account/onboarding/subscription/essay product routes | Private/product flows; not SEO localization targets without separate product approval. |
| Manual-review cross-country routes | Existing manifest intentionally noindexes many pairs; translations should inherit that state. |

## Likely Future Change Files

| Future area | Likely files to add/change later |
|---|---|
| Locale config | `lib/i18n/locales.ts`, `lib/i18n/types.ts` |
| Localized paths | `lib/i18n/paths.ts`, `lib/i18n/slugs.ts` |
| Metadata/hreflang | `lib/i18n/alternates.ts`, `lib/seo/canonical.ts`, route `generateMetadata` calls |
| Translation quality | `lib/i18n/translationQuality.ts`, `lib/i18n/translationPolicy.ts` |
| Translation loading | `lib/i18n/loadLocalizedContent.ts`, static manifests under `data/i18n/` or `lib/i18n/static/` |
| Translation queue | Future DB table/model, worker scripts, admin review UI; no migration in audit phase |
| Locale routes | `app/[locale]/...` or route-group wrappers for public SEO pages |
| Layout/UI | `app/layout.tsx`, possible `app/[locale]/layout.tsx`, `components/ui/Navbar/*`, `components/ui/Footer/*`, common CTA/filter/card components |
| Sitemaps | `lib/seo/sitemaps.ts`, new `lib/i18n/localizedSitemaps.ts`, `app/sitemaps/[slug]/route.ts` renderer support for `xhtml:link` if sitemap hreflang is chosen |
| Schema | `app/layout.tsx`, `lib/seo/homePageJsonLd.ts`, article/detail/list schema builders |
| Tests | `lib/i18n/__tests__/*`, `lib/seo/__tests__/localizedSitemap.test.ts`, `lib/seo/__tests__/hreflangAlternates.test.ts` |

## Do Not Touch In Later Implementation Without Separate Approval

- Auth, Supabase session middleware behavior, onboarding, subscription, Lemon, payments, Supabase RLS, user essay product APIs, saved/ignored workflows, and DB migrations.
- Existing English canonical URLs.
- Existing query noindex/canonical policies.
- OpenAI content-generation scripts for translation unless explicitly approved.
- Provider/scholarship official facts unless they already exist in source data.

