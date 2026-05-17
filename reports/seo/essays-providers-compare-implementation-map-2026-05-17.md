# ScholarshipTop /essays, /providers, /compare Implementation Map

Date: 2026-05-17
Scope: read-only audit of `http://localhost:3002/essays`, `/providers`, `/compare`.
Constraints honored: no OpenAI calls, no Supabase writes, no production implementation, no commit, no push.

## Executive Notes

- `/essays`, `/providers`, and `/compare` are already real product/SEO surfaces, not placeholder routes.
- All three zones are dynamic App Router routes backed by Supabase data and indexed through dedicated sitemap buckets.
- The biggest architectural risk is not missing routes. It is over-indexing programmatic pages before each page has enough unique, trustworthy, user-visible value.
- The existing trust/E-E-A-T footer and sitewide schema foundation is visible across these pages; this audit should extend that foundation with section-specific quality gates.
- Local checks were run against `localhost:3002`. The running dev server needed a restart after `npm run build`; it is now responding again.

## /essays Map

| Area | Files / routes | Current role |
|---|---|---|
| Essay hub route | `app/essays/page.tsx` | Index page for published essay guides. Generates title/description/canonical, noindexes non-canonical query/page/category/sort views, renders BreadcrumbList and ItemList JSON-LD. |
| Essay detail route | `app/essays/[slug]/page.tsx` | Published essay guide page. Fetches essay by slug, renders article body, TOC, FAQ, sources, related content, related scholarships, CTA to essay tool. Uses notFound for missing guides. |
| Essay user result | `app/essays/u/[id]/page.tsx`, `app/essays/u/[id]/EssayResultClient.tsx`, `app/essay/[id]/page.tsx` | User-generated/private essay result flow. Should stay noindex/private and out of SEO templates. |
| Essay tool | `app/essay/page.tsx`, `app/essay/EssayPageClient.tsx` | AI essay mentor/product tool, not the public guide hub. |
| Data loader | `lib/essays/essaysServer.ts` | Public Supabase reads for essay index/detail, related scholarship rows, sitemap rows. |
| Filtering/pagination | `lib/essays/essaysIndexFilters.ts`, `components/essays/EssaysIndexToolbar.tsx` | Search, category, sort, page query handling. Query views are noindex via route metadata. |
| Hub constants | `lib/essays/essayHubSection.ts` | `/essays` route constants and article path builder. |
| Detail body helpers | `lib/essays/essayBodyToc.ts`, content-hub helpers | Inject H2 IDs, split article for CTAs, auto internal links. |
| Related scholarships | `lib/essays/relatedScholarshipsForEssayGuide.ts`, `ContentHubArticleMatchedScholarships` | Connects essay content back to scholarship listings. |
| Hero/media | `components/essays/EssaysIndexHeroMedia.tsx`, `lib/essays/essayHero*` | Hub video/hero and generated/reused hero images. |
| Generation worker | `lib/essays/runEssayGenerationJob.ts`, `app/api/cron/process-essay-queue/route.ts` | OpenAI + FAL queue worker for scholarship-specific essay guides. Writes to `essays`, queues indexing. Do not run during read-only audit. |
| Manual guide worker | `scripts/enqueue-manual-essay-guides.ts`, `scripts/run-manual-essay-guides.ts`, `scripts/audit-manual-essay-guides.ts` | Manual-topic essay generation queue. Enqueue/run scripts write to DB; audit is read-only unless `--enqueue-missed-indexing`. |
| Manual topics | `data/manual-essay-guides/international-students-topics.txt` | Seed list for international-student essay topics. |
| Sitemap | `lib/seo/sitemaps.ts` | `/essays` is in core sitemap. Published essay guide rows populate `/sitemaps/essays.xml`. |

## /providers Map

| Area | Files / routes | Current role |
|---|---|---|
| Provider hub route | `app/providers/page.tsx` | National provider directory. Metadata canonical `/providers`; query/pagination/country views are noindex unless canonical listing. |
| Provider/state dynamic route | `app/providers/[id]/page.tsx` | One route handles both provider profiles and state provider hubs such as `/providers/florida`. Missing provider profiles call notFound. |
| Hub component | `components/providers/ProvidersHubPageContent.tsx` | Provider listing UI, search/filter toolbar, breadcrumb schema, IQ CTA, pagination. |
| Provider cards | `components/providers/ProvidersHubCard.tsx`, `ProvidersHubCardsGrid.tsx` | Provider card title, location, scholarship count, AI/description snippet, profile link. |
| Provider profile components | `ProviderProfileTableOfContents.tsx`, `ProviderProfileScholarshipsScroll.tsx`, `ProviderProfileScholarshipsList.tsx`, `ProviderProfileFaqAccordion.tsx`, `ProviderProfileContextLinks.tsx`, `ProviderOfficialWebsiteGate.tsx` | Detail profile UI, scholarships, FAQ, official/source gate, context links. |
| Hub data loader | `lib/providers/providerHubServer.ts` | Reads `provider_hub_listing` view for directory. Counts providers and detects bulk-enrich UI availability. |
| Profile data loader | `lib/providers/providerProfileServer.ts` | Resolves slug/UUID, reads provider row + provider stats + scholarship list + similar providers; filters competitor aggregator URLs. |
| Provider URL/source helpers | `lib/providers/providerOfficialUrl.ts`, `providerIdentityCandidate.ts`, `providerScholarshipSupplements.ts` | Source URL discovery and supplementary scholarship context. |
| Enrichment core | `lib/providers/enrichProviderDataCore.ts` | OpenAI-based provider enrichment. Reads official/source pages, generates description/FAQ/sources/state under strict prompt. |
| Enrichment writes | `lib/providers/providerEnrichmentStorageUpdate.ts`, `app/providers/actions.ts`, `scripts/enrich-all-providers.ts` | Writes `description`, `sources`, `ai_description`, `ai_sources`, `ai_faq`, `is_enriched`, `enriched_at`. Do not run in this task. |
| Provider audits | `scripts/audit-providers.ts`, `scripts/diagnose-provider-enrichment.ts` | Read-only provider quality audit and provider enrichment diagnostics. |
| Sitemap | `lib/seo/sitemaps.ts` | `/providers` and all state provider hubs are in core sitemap. All provider slugs from `providers` table populate `/sitemaps/providers.xml`. |

## /compare Map

| Area | Files / routes | Current role |
|---|---|---|
| Compare hub route | `app/compare/page.tsx` | Combined comparison index for state and university comparison pages. Metadata canonical `/compare`; query/page/category/sort views noindex. BreadcrumbList and ItemList JSON-LD. |
| University compare hub | `app/compare/universities/page.tsx` | Index of university-vs-university pages. Query/page/sort views noindex. |
| University compare detail | `app/compare/universities/[slug]/page.tsx` | Detail comparison page. Uses DB content JSON, RPC comparison facts, related content, related scholarships, FAQ, sources, WebPage/Breadcrumb/FAQ schema. |
| State compare hub | `app/compare/states/page.tsx` | Index of state-vs-state comparison pages. Query/page/sort views noindex. |
| State compare detail | `app/compare/states/[slug]/page.tsx` | Detail comparison page. Uses DB content JSON, state comparison RPC, related content, related scholarships, FAQ, sources, WebPage/Breadcrumb/FAQ schema. |
| Compare index data/filtering | `lib/seo/compareIndexData.ts`, `lib/seo/compareIndexFilters.ts` | Builds and filters cards from published state/university rows. |
| Compare data loaders | `lib/seo/universityCompareServer.ts`, `lib/seo/stateCompareServer.ts` | Published page fetchers and RPC comparison data fetchers. |
| Compare AI generator | `lib/seo/comparePageAi.ts`, `scripts/seo-worker-generate.ts`, `scripts/refresh-university-compare-sources.ts`, `scripts/refresh-state-compare-pages.ts` | OpenAI generation/refresh of compare content. Writes `compare_pages` / `state_compare_pages`; do not run in this task. |
| Compare queue scripts | `scripts/enqueue-university-compare.ts`, `scripts/enqueue-state-compare.ts`, `scripts/compare-battle-stats.ts`, `scripts/compare-battle-sequential.ts` | Candidate pair creation and sequential generation runner. Enqueue/generate scripts can write DB. |
| Related content | `lib/seo/compareRelatedContent.ts`, `comparePeersServer.ts`, `CompareExploreRelatedScholarships.tsx` | Connects compare pages to resources, essays, scholarships, and detail pages. |
| Sitemap | `lib/seo/sitemaps.ts` | `/compare`, `/compare/universities`, `/compare/states` in core sitemap. Published comparison rows populate `/sitemaps/compare.xml`. |

## OpenAI Dependency Audit

| File / script | Purpose | OpenAI? | Writes? | Risk | Recommended action |
|---|---:|---:|---:|---|---|
| `lib/essays/runEssayGenerationJob.ts` | Scholarship-specific essay guide generation, hero image, publish, indexing | Yes | DB + storage + indexing queue | High cost/quota risk; can stop queue on 429 | Do not run for content backfill until fallback/static guide strategy exists. |
| `scripts/run-manual-essay-guides.ts` | Manual topic guide generation from `manual_essay_generation_queue` | Yes | DB + indexing queue | High; failed if model/env/quota unavailable | Replace P0 guides with static agent-authored content or draft reports first. |
| `scripts/fix-seo-essays.ts` | Essay SEO repair/backfill | Optional/yes when allowed | Files/reports and possible DB depending mode | Medium-high | Use only in dry-run/read mode until exact write behavior is approved. |
| `app/api/essay/generate/route.ts` | User essay draft generation | Yes or Anthropic | DB/user essay result | Product-critical, not SEO hub | Do not touch for SEO implementation without product approval. |
| `app/api/essay/message/route.ts`, `lib/essay/interviewerAi.ts` | Essay mentor/chat | Yes | DB chat state | Product/auth flow | Keep out of SEO content pipeline. |
| `app/api/essay/humanize/route.ts`, `lib/essay/humanizeOpenAi.ts` | Humanize essay content | Yes | Depends route | Product/paywall risk | Do not touch. |
| `lib/providers/enrichProviderDataCore.ts` | Provider profile description/FAQ/source enrichment | Yes | No in core, writes via callers | Can produce unsupported claims if source poor; quota risk | Add noindex quality gates and static/manual provider profiles for top providers first. |
| `scripts/enrich-all-providers.ts` | Sync providers and enrich missing descriptions | Yes | DB + indexing queue | High; can update thousands of providers | Keep read-only/dry-run unless approved. |
| `app/providers/actions.ts` | Bulk provider enrichment server action | Yes | DB + indexing | Dangerous if enabled in production | Keep gated; add quality policy before more enrichment. |
| `scripts/ai_extract_hostless_provider_identity.ts` | Provider identity classification for hostless scholarships | Yes | JSON output only | Cost risk, downstream apply script writes | Keep output-only; do not apply without review. |
| `scripts/ai_review_medium_hostless_provider_identity.ts` | AI review of provider identity candidates | Yes | JSON output only | Cost risk | Use only if budget approved. |
| `lib/seo/comparePageAi.ts` | Generates university/state compare copy | Yes | No in core, writes via callers | Creates large SEO surface | Add static evergreen compare guides and compare quality gates. |
| `scripts/seo-worker-generate.ts` | Generates SEO hubs and compare pages | Yes | DB + indexing queue | Very high; broad programmatic generator | Do not use for this audit; add explicit fallback/static content policy. |
| `scripts/refresh-university-compare-sources.ts`, `scripts/refresh-state-compare-pages.ts` | Refresh compare content/source blocks | Yes | DB | Medium-high | Run only after quality review. |
| `lib/seo/aiMetaDescriptionService.ts` | AI meta description service for SEO pages | Yes | likely cache/DB via service | Cost risk during page rendering if misused | Prefer stored meta; do not call in audit. |
| `lib/seo/seoHubContentAi.ts` | Generic SEO hub content generator | Yes | Caller writes | Broad programmatic SEO risk | Require quality policy and fallback. |

## Data And Indexing Observed

| Zone | Observed local status | Sitemap status | Notes |
|---|---:|---:|---|
| `/essays` | 200, canonical `https://scholarshiptop.com/essays`, ItemList/Breadcrumb schema | `/sitemaps/essays.xml`: 11,788 URLs | Large indexable essay surface; many pages are scholarship-specific rather than evergreen intent guides. |
| `/providers` | 200, canonical `https://scholarshiptop.com/providers`, Breadcrumb schema | `/sitemaps/providers.xml`: 5,920 URLs | Provider sitemap includes all provider slugs. At least one homepage card/sitemap URL (`/providers/loyola-university-chicago`) returns 404. |
| `/compare` | 200, canonical `https://scholarshiptop.com/compare`, ItemList/Breadcrumb schema | `/sitemaps/compare.xml`: 1,171 URLs | Compare is currently state/university matchups, not evergreen educational compare guides. |
| Query/pagination | `?page=2` and `?q=` views observed as `noindex, follow` with canonical to root hub | Not in sitemap | Good policy; preserve it. |

## Read-Only Data Diagnostics

| Check | Result |
|---|---|
| `scripts/audit-manual-essay-guides.ts` | 240 manual topics total: 140 completed, 100 failed. Recent failures are config/model gate (`OPENAI_SEO_MODEL must be gpt-5.4, received "unset"`). |
| `scripts/essay-queue-status.ts` | Recent `essay_generation_queue` has pending rows. One recent row contains `OPENAI_QUOTA_EXCEEDED` billing/quota error. No stuck processing row in the sampled output. |
| `scripts/audit-providers.ts` | 5,920 providers in DB; 5,085 providers have at least one DB flag. Major issue is missing official URL. |
| Sitemap spot check | `providers.xml` includes `/providers/loyola-university-chicago`, but that URL returns 404 locally. |

## Safe To Strengthen Later

- Static SEO copy and hub sections in `/essays`, `/providers`, `/compare` route components.
- Static content files for evergreen essay/compare pages, if added through curated allowlists.
- New quality policy helpers that only read available facts and decide index/noindex/sitemap inclusion.
- Schema additions that describe visible content only.
- Internal links between detail pages, essays, providers, resources, and compare.
- Reports and content drafts in `reports/content-drafts/`.

## Dangerous Zones

- `app/api/essay/*`, `lib/essay/*`: product AI essay flows, user data, subscription/paywall surfaces.
- `app/providers/actions.ts`, `scripts/enrich-all-providers.ts`: provider enrichment writes.
- `scripts/seo-worker-generate.ts`, compare refresh scripts: broad programmatic SEO writes.
- Supabase migrations, RLS, billing/subscription, Lemon routes, auth/onboarding.
- Any script requiring `OPENAI_API_KEY` unless explicitly approved.

## Checks Run

| Check | Result |
|---|---|
| `npx.cmd tsc --noEmit` | Pass |
| `npm.cmd run build` | Pass |
| `curl -I /essays` | 200 after local dev restart |
| `curl -I /providers` | 200 after local dev restart |
| `curl -I /compare` | 200 after local dev restart |
| `curl -I /sitemap.xml` | 200 |
| Visual screenshots | Saved under `reports/seo/screenshots/` |

