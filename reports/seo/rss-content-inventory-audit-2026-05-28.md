# RSS Content Inventory Audit - ScholarshipTop

Date: 2026-05-28  
Mode: Audit only. No code, DB, env, auth, payments, Lemon, Supabase RLS, sitemap, robots, Cloudflare, commit, or push changes were made.

## Verdict

| Question | Verdict |
|---|---|
| RSS implementation status | Missing. No local RSS/Atom implementation was found, and production feed endpoints return `404`. |
| Is large curated RSS recommended? | Yes, phased and curated. RSS should be a high-signal discovery layer, not a duplicate of the full 65,025 URL sitemap. |
| Best architecture | Master curated feed plus type feeds: `/rss.xml`, `/rss/resources.xml`, `/rss/essays.xml`, `/rss/providers.xml`, `/rss/categories.xml`, `/rss/compare.xml`, `/rss/scholarships.xml`, and later `/rss/geo.xml`. |
| Safe URL types now | English resources, English essays, static comparison guides, category pages, provider pages with quality gates, and a curated slice of scholarship detail pages. |
| Needs cleanup first | Localized essay sitemap URLs, thin long-tail SEO pages, some thin single-segment SEO pages, localized scholarship detail scale policy, provider pubDate source, and any stale/expired scholarship rules. |

## Current RSS Status

Local search commands:

```powershell
rg -n -i "generateRss|buildRss|application/rss\+xml|application/atom\+xml|rss\.xml|feed\.xml|atom\.xml|rel=.*application/rss\+xml|type=.*application/rss\+xml|\bRSS\b|\bAtom\b" app lib components public scripts data --glob "!node_modules/**" --glob "!data/seo-scholarship-content/*.json"
Get-ChildItem -Recurse -Directory -Path app,public | Where-Object { $_.FullName -match '(rss|feed|atom)\.xml$' }
```

Findings:

- No `app/rss.xml/route.ts`, `app/feed.xml/route.ts`, `app/atom.xml/route.ts`, public feed file, RSS generator, Atom generator, or RSS content-type handler was found.
- No HTML `rel="alternate" type="application/rss+xml"` implementation was found.

Production checks:

```powershell
curl.exe -sS -I -L https://scholarshiptop.com/rss.xml
curl.exe -sS -I -L https://scholarshiptop.com/feed.xml
curl.exe -sS -I -L https://scholarshiptop.com/resources/rss.xml
```

Results:

| URL | Status | Content-Type | Cache |
|---|---:|---|---|
| `https://scholarshiptop.com/rss.xml` | 404 | `text/html; charset=utf-8` | `private, no-cache, no-store` |
| `https://scholarshiptop.com/feed.xml` | 404 | `text/html; charset=utf-8` | `private, no-cache, no-store` |
| `https://scholarshiptop.com/resources/rss.xml` | 404 | `text/html; charset=utf-8` | `private, no-cache, no-store` |

## URL Discovery Sources

Primary discovery was production sitemap plus local sitemap builders:

```powershell
curl.exe -sS https://scholarshiptop.com/sitemap.xml
```

Local source files inspected:

- `app/sitemap.xml/route.ts`
- `app/sitemaps/[slug]/route.ts`
- `lib/seo/sitemaps.ts`
- `lib/content-hub/contentPostsServer.ts`
- `lib/resources/staticScholarshipGuides.ts`
- `lib/essays/essaysServer.ts`
- `lib/essays/staticEssayGuides.ts`
- `lib/providers/providerProfileServer.ts`
- `lib/seo/providerSeoQualityPolicy.ts`
- `lib/seo/essaySeoQualityPolicy.ts`
- `lib/scholarships/seoCrossCountryManifest.ts`
- `data/seo-scholarship-routes.json`
- `data/seo-cross-country-routes.json`
- `data/seo-scholarship-content/*.json`
- `lib/compare/staticCompareGuides.ts`

Sitemap summary:

| Metric | Value |
|---|---:|
| Sitemap documents fetched | 71 |
| Total sitemap URLs parsed | 65,025 |
| `resources.xml` | 925 URLs |
| `essays-*` | 2,268 English essay URLs plus several empty shards |
| `providers.xml` | 5,135 URLs |
| `categories.xml` | 11 URLs |
| `seo.xml` | 1,626 URLs |
| `scholarships-0.xml` | 19,881 English scholarship detail URLs |
| localized scholarship detail DB sitemaps | 34,902 URLs |

## URL Inventory by Type

| URL type | Pattern | Count | Sitemap source | Data source | Indexable? | Content quality | Date source | RSS suitability | Recommended feed |
|---|---|---:|---|---|---|---|---|---|---|
| Resources hub | `/resources` | 1 EN, 2 localized | `core`, locale resources | Static route | Yes | Strong sample: 3,902 text chars, title, meta, H1, canonical, schema | Sitemap `lastmod`, route metadata | Yes, P0 | `/rss/resources.xml`, master |
| Resource articles | `/resources/{slug}` | 925 EN, 78 localized | `resources`, locale resources DB/static | `content_posts`, `STATIC_SCHOLARSHIP_GUIDES` | Yes for sampled pages | Strong samples: 2,219 to 12,162 text chars | `published_at`; static guide fallback currently fixed date | Yes, P0 | `/rss/resources.xml` |
| Essays hub | `/essays` | 1 EN, 2 localized hubs | `core`, locale essays | Static route | Yes for EN and localized hubs sampled indirectly | Strong EN sample: 4,749 text chars | Sitemap `lastmod`; static metadata | Yes, P1 | `/rss/essays.xml`, master |
| English essay pages | `/essays/{slug}` | 2,268 | `essays-*` | `essays` table plus `STATIC_ESSAY_GUIDES` | Yes via essay quality policy | Strong samples: static 2,496 to 2,858 text chars; generated 15,600 to 17,429 | `updated_at`; static guide `updatedAt` | Yes, P1 | `/rss/essays.xml` |
| Localized static essay pages | `/es/essays/{slug}`, `/fr/essays/{slug}` | 22 detail pages plus 2 hubs | `locale-es-essays`, `locale-fr-essays` | localized pilot sitemap | No for most sampled URLs | Problem: 22 detail URLs return `404`, `noindex`, no canonical | Sitemap `lastmod` only | No until fixed | Exclude |
| Scholarship detail pages | `/scholarships/{scholarship-slug}` | 19,881 EN, 34,902 localized | `scholarships-0`, locale scholarship detail DB | `scholarships` table | Yes for EN sampled pages | Strong EN samples: 5,406 to 6,230 text chars | `updated_at`, `created_at`, sitemap `lastmod` | Maybe/Yes with strict curation | `/rss/scholarships.xml` |
| Providers hub | `/providers` | 1 EN, 2 localized hubs | `core` | Static/provider hub route | Yes | Strong sample: 4,430 text chars | Sitemap `lastmod`; better DB/provider aggregate date needed | Yes, P1 | `/rss/providers.xml`, master |
| Provider detail pages | `/providers/{slug}` | 5,135 EN, 10 localized | `providers`, localized provider DB | `provider_hub_listing`, `providers` | Yes after provider quality policy | Strong samples: 6,286 to 13,240 text chars | Current sitemap uses generation date; better use `provider.updated_at` or `lastScholarshipUpdatedAt` | Yes, capped or sharded | `/rss/providers.xml` |
| Provider state hubs | `/providers/{state}` | 51 | `core` | provider hub state pages | Yes in sample | Strong sample: 4,319 text chars | Sitemap `lastmod` only | Maybe, P2 | `/rss/providers.xml` |
| Category pages | `/scholarships/category/{slug}` | 11 EN, 22 localized | `categories`, localized categories | category allowlist/static copy | Yes | Strong samples: 11,793 to 12,420 text chars | Sitemap `lastmod`; source date not explicit | Yes, P1 | `/rss/categories.xml` |
| Single-segment SEO landings | `/scholarships/{topic-or-state}` | 145 | `seo` | `data/seo-scholarship-content`, `data/seo-scholarship-routes.json`, route resolver | Mixed | Strong for `engineering`, `closing-soon`, `for-women`; weak for `no-essay` and `california` samples | JSON/source updated date or sitemap `lastmod` | Maybe, quality-gated | `/rss/categories.xml` or `/rss/seo.xml` |
| Cross-country GEO pages | `/scholarships/for-students-from/{applicant}/study-in/{host}` | 28 in sitemap, 308 manifest entries total | `seo` | `data/seo-cross-country-routes.json` | Yes for approved/indexable entries | Good samples: about 3,005 text chars | Manifest/generated date or sitemap `lastmod` | Yes later, P2 | `/rss/geo.xml` |
| University/provider GEO combo pages | `/scholarships/{state}/{provider-or-university}` | 1,015 | `seo` | `provider_hub_listing`, `seo_generation_queue`, university hub RPC | Yes in sampled pages | Good samples: 1,956 to 2,094 text chars | DB `updated_at` where available | Maybe, P2 | `/rss/geo.xml` |
| Long-tail state/degree/topic pages | `/scholarships/{state}/{level}/{topic}` | 438 | `seo` | long-tail SEO generation | Mixed | Weak samples: 285 to 294 text chars | DB/generated `updated_at` | No until content improves | Exclude for now |
| Comparison hub and guides | `/compare`, `/compare/{slug}` | 5 EN sitemap/core pages plus localized pilot pages | `core`, `compare`, locale compare | static compare guides | Yes | Strong samples: 2,241 to 4,882 text chars | static `updatedAt` | Yes, P1 | `/rss/compare.xml`, master |
| Dynamic university/state comparison pages | `/compare/universities/{slug}`, `/compare/states/{slug}` | 0 observed in current sitemap sample, hubs present | `compare` when published | `compare_pages`, `state_compare_pages` | Quality-gated when present | Not sampled as detail pages because none appeared in sitemap output | DB `updated_at` | Maybe later | `/rss/compare.xml` |
| Core trust pages | `/about`, `/how-scholarshiptop-works`, etc. | 10 EN, 36 localized/core/legal | `core`, locale core | static routes | Yes, but mixed intent | Useful for master feed only if curated; legal pages should be excluded | Sitemap `lastmod` | Maybe for a few product/trust pages | `/rss.xml` only |
| IQ subdomain | `https://iq.scholarshiptop.com/...` | 12 | `core` | separate subdomain | Not part of main ScholarshipTop RSS | Out of scope | Sitemap `lastmod` | No | Exclude |

## Production Sampling Evidence

Sampling method:

- 47 production URLs were fetched with a crawler-style user agent.
- Each sample was checked for status, content-type, title, meta description, canonical, robots/noindex, H1, script-stripped text length, JSON-LD count, hreflang count, and RSS suitability.
- Sample quality gate used for audit: `200`, no `noindex`, production canonical, title, meta description, H1, and more than 1,200 script-stripped text characters.

Sample summary:

| Family | Samples | 200 OK | Passed audit RSS gate | Notes |
|---|---:|---:|---:|---|
| Resources | 8 | 8 | 8 | Strongest RSS candidate family. |
| Essays | 7 | 6 | 6 | EN essay pages strong; one localized sample failed. |
| Scholarship detail / single-segment SEO | 10 | 10 | 8 | EN scholarship details strong; some SEO landings thin. |
| Providers | 7 | 7 | 7 | Provider detail and state hub samples are contentful. |
| Categories | 4 | 4 | 4 | Very strong evergreen category pages. |
| GEO / university / long-tail | 6 | 6 | 4 | Cross-country and provider combo pages passed; long-tail state/level/topic pages were thin. |
| Comparison | 5 | 5 | 5 | Strong evergreen comparison content. |

Representative good candidates:

| URL | Type | Status | Text chars | Title/meta/H1/canonical | RSS suitability |
|---|---|---:|---:|---|---|
| `/resources` | resources hub | 200 | 3,902 | Present | Yes |
| `/resources/scholarships-for-international-students-guide` | resource article | 200 | 12,162 | Present | Yes |
| `/resources/medical-scholarships-guide` | resource article | 200 | 12,117 | Present | Yes |
| `/essays` | essay hub | 200 | 4,749 | Present | Yes |
| `/essays/how-to-write-richard-r-tufenkian-scholarship-details-scholarship-essay` | generated essay guide | 200 | 15,600 | Present | Yes |
| `/scholarships/first-year-merit-scholarship-maize-blue-merit-scholarship-at-university--university-of-michigan-flint-fre` | scholarship detail | 200 | 6,230 | Present | Yes |
| `/providers/loyola-university-chicago` | provider detail | 200 | >6,000 | Present | Yes |
| `/providers/california` | provider state hub | 200 | 4,319 | Present | Maybe/Yes |
| `/scholarships/category/stem` | category | 200 | 12,420 | Present | Yes |
| `/scholarships/engineering` | SEO landing | 200 | 5,312 | Present | Yes |
| `/scholarships/for-students-from/canada/study-in/united-states` | cross-country GEO | 200 | 3,009 | Present | Yes |
| `/compare/scholarship-vs-grant` | compare guide | 200 | 2,650 | Present | Yes |

Representative exclusions or cleanup candidates:

| URL | Issue | Recommendation |
|---|---|---|
| `/es/essays/examples` and most localized essay detail URLs | Sitemap lists them, but production returns `404`, `noindex`, no canonical. | Exclude from RSS. Fix sitemap/runtime mismatch before any localized essay feed. |
| `/fr/essays/examples` | Same failure: `404`, `noindex`, no canonical. | Exclude. |
| `/scholarships/no-essay` | 200 and indexable, but sampled text was only 609 chars and meta copy still has old weak wording. | Exclude until content/copy quality is improved. |
| `/scholarships/california` | 200 and indexable, but sampled text was only 268 chars. | Exclude until page has meaningful SSR body. |
| `/scholarships/connecticut/high-school/nursing` | 200 and indexable, but only 294 text chars. | Exclude long-tail state/degree/topic pages until quality policy is strengthened. |
| `/scholarships/texas/high-school/arts` | 200 and indexable, but only 285 text chars. | Exclude long-tail thin pages. |
| `https://iq.scholarshiptop.com/...` | Separate subdomain and product surface. | Exclude from main ScholarshipTop RSS. |
| Legal pages such as `/financial-aid-disclaimer`, `/terms`, `/privacy-policy` | Public but not content-discovery material for RSS. | Exclude from RSS except normal sitemap. |

Localized essay sitemap spot check:

| Sitemap | URLs | 200/canonical | 404/noindex/no canonical |
|---|---:|---:|---:|
| `locale-es-essays.xml` | 12 | 1 | 11 |
| `locale-fr-essays.xml` | 12 | 1 | 11 |
| `locale-es-resources.xml` | 15 | 15 | 0 |
| `locale-fr-resources.xml` | 15 | 15 | 0 |

## Required Field Audit

| URL type | title | link | description | pubDate candidate | guid | category/type | image/enclosure |
|---|---|---|---|---|---|---|---|
| Resources DB articles | `content_posts.title` / `meta_title` | `resourcesArticlePath(slug)` | `meta_description` | `published_at`, fallback `updated_at` if queried | canonical URL | `resource` | cover image exists in list fields; use only if stable public URL |
| Static resource guides | static `title` | static slug | static `description` | fixed source date currently `2026-05-16` in sitemap; better explicit `updatedAt` if added later | canonical URL | `resource_guide` | no enclosure needed |
| Essay DB pages | `essays.title` | `essayHubArticlePath(slug)` | `meta_description` | `updated_at`, fallback `created_at` if queried | canonical URL | `essay` | optional hero image only if stable |
| Static essay guides | static `title` | static slug | static description | `updatedAt` | canonical URL | `essay_guide` | no enclosure needed |
| Scholarship detail pages | scholarship `title` | `scholarshipPublicPath(row)` | metadata/detail summary | `updated_at`, fallback `created_at` | canonical URL or stable scholarship ID | `scholarship` | avoid enclosure initially |
| Provider pages | `display_name` | `/providers/{slug}` | `ai_description` / fallback | `provider.updated_at` or `lastScholarshipUpdatedAt`; do not use sitemap generation date | canonical URL | `provider` | no enclosure needed |
| Category pages | category title | `/scholarships/category/{slug}` | category meta description | no durable content date; use fixed source version or omit from feed until source date exists | canonical URL | `category` | no enclosure needed |
| SEO landings | manifest/JSON title | `/scholarships/{path}` | manifest/JSON meta description | JSON/generated updated date or sitemap `lastmod` if reliable | canonical URL | `seo_landing` | no enclosure needed |
| Cross-country GEO | manifest `metaTitle` | manifest `href` | manifest `metaDescription` | manifest generated date or sitemap `lastmod` | canonical URL | `geo` | no enclosure needed |
| Compare guides | static `title` or DB `meta_title` | `/compare/...` | static/DB description | static `updatedAt` or DB `updated_at` | canonical URL | `compare` | no enclosure needed |

Important implementation note:

- Do not invent publication dates for evergreen pages. If a real `published_at`, `updated_at`, static `updatedAt`, generated date, or reliable sitemap `lastmod` is unavailable, either omit the page from RSS or include it only after adding a durable source date in a future implementation stage.

## Recommended RSS Feed Architecture

| Feed URL | Content included | Estimated item count | Sorting | Cache/revalidate | Risk | Priority |
|---|---|---:|---|---|---|---|
| `/rss.xml` | Curated master: newest/best resources, essay guides, compare guides, category pages, selected providers, selected scholarship details, selected GEO pages | 500 initially, expandable to 1,000 | recent `pubDate` first, then priority score | `public, max-age=300, s-maxage=3600` or similar to sitemap | Over-broad feed if rules are loose | P0 |
| `/rss/resources.xml` | All public indexable EN resources and static guides; later localized resources if language strategy is clear | 925 EN now; 1,000 to 1,100 including localized resources | `published_at` desc, static guides by source date | 1 hour revalidate | Low | P0 |
| `/rss/essays.xml` | EN essay hub, static essay guides, generated EN essay guides passing quality policy | About 2,269 EN including hub | `updated_at` desc; static guides by `updatedAt` | 1 hour revalidate | Medium due many DB/generated pages | P1 |
| `/rss/providers.xml` | Provider hub, provider state hubs, provider detail pages passing provider SEO quality policy | Start 500 to 1,000; all 5,135 only if sharded and real updated dates are used | `lastScholarshipUpdatedAt` or `provider.updated_at` desc, then scholarship_count | 1 to 6 hours | Medium: current sitemap `lastmod` is generation date, not durable content date | P1 |
| `/rss/categories.xml` | 11 category pages plus high-quality single-segment SEO landings that pass text/copy gates | 11 safe now; maybe 50 to 120 after filtering | source priority, then updated date | 6 to 24 hours | Medium: some landings are thin | P1 |
| `/rss/compare.xml` | Compare hub, static compare guides; later dynamic university/state comparison pages when present | 5 to 7 now; expandable if DB compare pages publish | `updatedAt` desc | 6 to 24 hours | Low | P1 |
| `/rss/scholarships.xml` | Curated active/indexable scholarship detail pages only | Start 1,000; consider 5,000 per shard later | `updated_at` desc, active/fresh/featured/high-value first | 30 to 60 minutes if data changes often | High: stale/expired scholarships, scale, DB load | P2 |
| `/rss/scholarships-0.xml`, `/rss/scholarships-1.xml` | Optional sharded scholarship feed when scale is proven | 1,000 to 5,000 per shard | same as scholarship feed | 30 to 60 minutes | High | P2 |
| `/rss/geo.xml` | Cross-country pages and vetted provider/university/state combo pages; exclude thin long-tail pages | 28 safe cross-country now; maybe 250 to 1,000 after quality gate | source priority, content quality, lastmod | 6 to 24 hours | Medium/high: thin pages and duplicate intent | P2/P3 |

Recommended master feed composition:

- 200 latest/high-quality resources.
- 150 latest/high-quality essay guides.
- 50 category and comparison evergreen pages.
- 50 provider pages with strong completeness.
- 50 selected scholarship detail pages with current/fresh dates and strong metadata.
- Optional 50 GEO pages only after long-tail exclusions are wired.

This gives `/rss.xml` about 500 high-signal items without becoming a sitemap clone.

## Include Rules

Include only URLs that meet all of these:

- Returns `200`.
- Public and indexable.
- No `noindex`.
- Not auth, account, dashboard, checkout, payment, API, admin, onboarding, internal, or user-specific.
- No query-string-only pages.
- No draft/unpublished content.
- Canonical production URL starts with `https://scholarshiptop.com`.
- Has title.
- Has meta description or a usable summary.
- Has H1.
- Has meaningful SSR HTML text.
- Has stable URL.
- Belongs to sitemap or a known public SEO route source.
- Has a real date source for RSS `pubDate`, or is intentionally excluded until one exists.
- Has unique `guid` and `link`.

## Exclude Rules

Exclude:

- `/api/*`
- auth pages
- account/dashboard/profile pages
- saved-scholarships/account pages
- checkout/payment/Lemon pages
- onboarding pages
- admin/internal pages
- private/user-specific essay result pages such as `/essays/u/{id}` or `/essay/{id}`
- noindex pages
- noisy query URLs
- duplicate filter URLs
- empty JS shell pages
- pages missing canonical
- pages returning 404/redirect loops
- localhost/staging/preview URLs
- weak/thin pages under the text/content threshold
- legal pages and disclaimers from feed content
- IQ subdomain URLs
- localized essay detail URLs until sitemap/runtime mismatch is fixed
- localized scholarship detail pages until language/feed shard strategy is defined

## Feed-Specific Recommendations

### Resources

Recommendation: implement first.

Why it helps AI/GEO visibility:

- Resources are article-like, contentful, and have clean title/meta/H1/canonical signals.
- A resources feed is the easiest way to expose new scholarship guidance to crawlers and monitoring systems without exposing noisy product URLs.

Suggested rules:

- Include all EN public resources from `content_posts.status = published`.
- Include static scholarship guides.
- Include localized resources only in a later `/rss/es/resources.xml` and `/rss/fr/resources.xml` stage, or after language feed architecture is chosen.
- Use `published_at` as `pubDate`; static guides need explicit stable `updatedAt` or the existing fixed source date.

### Essays

Recommendation: implement after resources.

Why it helps:

- Essay pages are deep, high-intent application-planning pages.
- Generated essay guides have strong SSR body length and clear metadata in samples.

Suggested rules:

- Include EN static and generated essay pages that pass `getEssaySeoQualityPolicy`.
- Exclude localized essay detail pages until they return 200 with canonical.
- Exclude private/user essay outputs.
- Use `updated_at` as `pubDate`.

### Scholarships

Recommendation: do not include all 19,881 EN details blindly in the first release.

Why it helps:

- Scholarship detail pages are core product pages and can feed AI systems with award/provider/deadline/application-path context.

Risks:

- Expired scholarships can pollute the feed.
- Scholarship rows update frequently, which can make RSS noisy.
- A full 20k feed may create unnecessary DB/load pressure and large XML files.
- Localized scholarship details add 34,902 URLs and should not be included without a separate locale/shard plan.

Suggested rules:

- Start with latest/active/indexable 1,000 EN scholarship details.
- Require title, provider, canonical, indexable flag, useful meta description, and provider application path when available.
- Prefer active, future-deadline, high-value, high-ranking, featured, recently updated, and international-friendly items.
- Exclude expired, low-confidence, low-text, missing-canonical, or non-indexable rows.
- Consider sharding only after feed performance is proven.

### Providers

Recommendation: include a curated provider feed, but fix date source in implementation.

Why it helps:

- Provider pages are context hubs with linked scholarships and strong SSR content.
- They help AI crawlers understand provider relationships and ScholarshipTop's organized scholarship graph.

Suggested rules:

- Start with 500 to 1,000 provider pages ordered by `lastScholarshipUpdatedAt` or `provider.updated_at`, then `scholarship_count`.
- Do not use sitemap generation time as RSS `pubDate`.
- Include only pages passing provider quality policy.
- Exclude thin/weak providers, missing display names, zero active scholarships, and unresolved duplicates.

### Categories and SEO Landings

Recommendation: include categories now; add SEO landings only with content threshold.

Why it helps:

- Category pages are evergreen, contentful, and semantically clear.
- They provide clean topical RSS grouping for STEM, medical, education, arts, business, etc.

Risks:

- Some single-segment SEO pages are strong, but others are thin.
- `data/seo-scholarship-routes.json` still contains old fallback copy in places; do not use weak fallback pages blindly.

Suggested rules:

- Include all 11 EN category pages.
- Add single-segment SEO landing pages only if sampled SSR text is above threshold, metadata is Stage 2/3-clean, and canonical/indexing is clean.
- Exclude thin pages such as sampled `/scholarships/california` and `/scholarships/no-essay` until improved.

### GEO / Location / University

Recommendation: defer to later stage except approved cross-country pages and strong provider/university combos.

Why it helps:

- GEO pages can give AI crawlers clean country/state/provider relationship signals.

Risks:

- Some long-tail location/degree/topic pages are thin.
- GEO feeds can become duplicate/noisy quickly.

Suggested rules:

- Include the 28 approved/indexable cross-country pages from the 308-entry manifest only after `/rss/geo.xml` is implemented.
- Include provider/university combo pages only if SSR body, metadata, canonical, and count thresholds pass.
- Exclude long-tail state/degree/topic pages that render under 1,200 text chars.

### Comparison

Recommendation: include in a small evergreen compare feed.

Why it helps:

- Comparison pages explain product/user decision context clearly and are useful to AI answer engines.

Suggested rules:

- Include `/compare`, `/compare/scholarship-vs-grant`, `/compare/merit-vs-need-based-scholarships`, `/compare/no-essay-vs-essay-scholarships`, and `/compare/local-vs-national-scholarships`.
- Add dynamic university/state compare detail pages only when they appear in sitemap and pass compare quality policy.

## Size Recommendations

Do not default to 20 to 50 items. ScholarshipTop has enough public content for larger RSS feeds, but the first release should still be curated.

| Feed | Initial safe size | Later size | Reason |
|---|---:|---:|---|
| `/rss.xml` | 500 | 1,000 | High-signal mixed feed for external discovery. |
| `/rss/resources.xml` | 925 EN | all EN resources, localized shards later | Resources are strongest and article-like. |
| `/rss/essays.xml` | 2,000 to 2,300 EN | sharded if more growth | Essay pages are contentful but numerous. |
| `/rss/providers.xml` | 500 to 1,000 | 5,000+ only if sharded and date source is fixed | Provider pages are strong, but sitemap dates are not durable. |
| `/rss/categories.xml` | 11 to 100 | 150+ only after SEO landing gates | Categories strong; some SEO landings thin. |
| `/rss/compare.xml` | 5 to 25 | more if dynamic comparison pages publish | Low-risk evergreen feed. |
| `/rss/scholarships.xml` | 1,000 | 5,000 per shard if proven | High value, high risk due freshness/scale. |
| `/rss/geo.xml` | 28 to 250 | 1,000+ only after quality gate | Useful for GEO, but easy to overinclude thin pages. |

## SEO, AI/GEO, and Performance Risks

SEO risks:

- Duplicating the whole sitemap as RSS can dilute feed quality.
- Thin long-tail pages in RSS can send weak quality signals.
- Including localized pages that return 404/noindex would be harmful.
- Including old fallback copy can reintroduce weak trust positioning.

AI/GEO risks:

- Missing RSS today limits structured discovery by external monitoring and AI systems.
- Large uncurated feeds can teach AI crawlers noisy or stale page groups.
- GEO feeds need careful approved/indexable filtering to avoid duplicate or thin route combinations.

Performance risks:

- Scholarship and provider feeds could cause heavy DB reads if generated uncached.
- Full 20k scholarship feeds may be too large for a first release.
- HTML pages currently use dynamic/no-store headers; feed XML should use deliberate cache/revalidate behavior.

Data quality risks:

- Scholarship deadlines can expire.
- Provider pages need durable `pubDate`, not sitemap generation time.
- Some sitemap entries currently do not resolve correctly, especially localized essay detail pages.
- Some SEO JSON/source files still contain old fallback wording outside this audit's edit scope.

## Implementation Stages for Later

Stage 1 - Implement RSS route foundation and `/rss.xml` master curated feed.

- Include about 500 mixed high-signal items.
- Use only URLs that pass the include rules.
- Add XML validation and duplicate GUID checks.

Stage 2 - Add resources and essays feeds.

- `/rss/resources.xml`: all EN public resources/guides.
- `/rss/essays.xml`: EN static and generated essay pages passing quality policy.
- Keep localized essay pages excluded until 404/noindex mismatch is fixed.

Stage 3 - Add providers/categories/compare feeds.

- `/rss/providers.xml`: capped provider pages with durable update dates.
- `/rss/categories.xml`: 11 categories plus high-quality SEO landings.
- `/rss/compare.xml`: compare hub and static comparison guides.

Stage 4 - Add scholarships/grants feed with strict active/indexable rules and optional sharding.

- Start with 1,000 active/indexable EN scholarship detail pages.
- Consider `/rss/scholarships-0.xml`, `/rss/scholarships-1.xml` only after performance validation.

Stage 5 - Add GEO/location/university/state feeds only after verifying noindex/canonical policy.

- Start with approved cross-country pages and vetted provider/university combos.
- Exclude thin long-tail state/degree/topic pages.

Stage 6 - Add discovery links.

- Add `rel="alternate" type="application/rss+xml"` to HTML.
- Optionally add feed links in `robots.txt`.
- Validate `CCBot`, `GPTBot`, and `Googlebot` receive `200` on feeds.

## Future Acceptance Criteria

Every future feed should satisfy:

- Returns `200`.
- `Content-Type: application/rss+xml; charset=utf-8`.
- Valid XML.
- No localhost, staging, preview, or non-production URLs.
- Only public indexable URLs.
- No noindex, private, auth, checkout, API, account, admin, dashboard, onboarding, user-specific, or legal-only pages.
- Stable canonical production URLs.
- Unique `guid` and `link`.
- Every item has `title`, `link`, `description`, `guid`, and a real `pubDate` when included.
- RSS generation does not trigger heavy DB load.
- Feed is cached/revalidated safely.
- `CCBot`, `GPTBot`, `Googlebot`, and normal browsers receive `200`.
- Report confirms item counts and sample validation after implementation.

## Non-Changes Confirmed

- No RSS route was implemented.
- No code files were changed.
- No database or migration changes were made.
- No env files were changed.
- No sitemap, robots, or Cloudflare settings were changed.
- No auth, payments, Lemon Squeezy, or Supabase RLS changes were made.
- No commit or push was performed.

