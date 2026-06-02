# ScholarshipTop Full SEO + GEO Audit

Audit date: 2026-05-25  
Production site: https://scholarshiptop.com/  
Mode: AUDIT ONLY. No app code, routes, sitemap, robots, env, Supabase data, cache revalidation, worker, seed, commit, or push changes were made.

This audit combines limited production HTTP smoke checks with read-only inspection of the SEO, sitemap, metadata, localization, resource, provider, compare, and essay code paths.

## 1. Executive summary

ScholarshipTop has a strong SEO foundation: clean canonical origin handling, no `/en` sitemap pollution, explicit noisy-query noindex patterns on major hubs, rich JSON-LD on important detail pages, a clear `robots.txt`, and unusually good `llms.txt` / `llms-full.txt` assets for AI crawlers.

The biggest SEO risk is not that non-scholarship sections exist. The biggest risk is over-indexing scaled surfaces before they all meet a consistent quality bar. Production currently exposes about 62,883 sitemap URLs, including 19,602 English scholarship detail URLs, 22,802 ES/FR scholarship detail URLs, 11,799 essay URLs, 4,656 provider URLs, and 1,175 compare URLs. That can work if quality gates stay strict. It can hurt crawl budget and site quality signals if thin localized pilots, templated essay pages, or weak comparison pages stay indexable.

The biggest opportunity is to keep ScholarshipTop as a broad scholarship research authority rather than a single scholarships-only database. Providers, resources, essays, and selected compare pages all support topical authority and AI answer visibility when they are useful, linked, and index-controlled.

Direct answer: do not noindex everything except grants/scholarships. Use partial indexation. Keep strong scholarships, providers, resources, AI resource articles, essays, and selected compare pages indexable. Noindex query/filter/pagination pages, thin localized pilots, weak provider/compare/essay detail pages, and any localized page that does not have a real translated title/H1/body.

Critical issues found:

- Static localized resource pages such as `/es/resources/how-to-find-scholarships` and `/fr/resources/how-to-find-scholarships` returned `200` but had no canonical, no hreflang, and English fallback metadata. These should not remain indexable in that state.
- Localized ES/FR compare and essay pilot details are indexable while visibly thin in sampled production pages. Example: `/es/compare/states/california-vs-texas` had about 211 visible words; `/es/essays/how-to-write-richard-scholarship-essay` had about 286 words and an English H1.
- Localized sitemap builders for resources/providers/essays/compare appear less strict than the route gates because they rely on published/title/score and hardcode body availability in places. That can create sitemap URLs that later 404 or render weak content.
- The English essay sitemap is very large at 11,799 URLs. Sample DB essay pages were deep, but the surface needs an explicit indexation quality policy before further scaling.
- Some scholarship metadata title templates can be factually overbroad. A Canadian/RRC Winnipeg scholarship sample used a title pattern containing "USA 2026 Apply".

| Surface | Current verdict | Recommended index policy | Confidence | Why |
|---|---|---|---:|---|
| Home/core trust pages | Healthy | Keep index | 95 | Clear canonical/hreflang, strong positioning, useful entity/trust signals. |
| Scholarships hub | Mostly healthy, crawlable text could be stronger | Keep index | 90 | Core commercial/SEO surface; already canonical and localized. |
| Scholarship detail EN | Healthy but scaled | Keep index for quality-pass pages | 85 | Detail pages are useful and structured, but scale requires title/data freshness checks. |
| Scholarship SEO/category/hub pages | Healthy | Keep index | 85 | Useful topical hubs with stronger visible body than base listing. |
| Scholarship filters/query/noisy URLs | Controlled | Noindex/follow | 95 | Existing query handling is correct for crawl budget. |
| Providers hub | Healthy | Keep index | 85 | Provider entity hub supports scholarships and entity graph. |
| Provider detail pages | Useful when quality-pass | Partial index | 80 | Strong samples, but weak/generic provider profiles should noindex/follow. |
| Compare hub | Useful but secondary | Keep index with filters noindex | 75 | Can rank for discovery/comparison intent, but avoid doorway patterns. |
| Compare detail pages | Mixed | Partial index | 70 | Static/dynamic EN samples useful; ES/FR compare pilot samples are thin. |
| Resources hub | Healthy | Keep index | 90 | Supports topical authority and AI scholarship search cluster. |
| Resource filters such as `?cat=ai` | Correctly controlled | Noindex/follow | 95 | Production sample had `noindex, follow` and canonical to `/resources`. |
| AI resource articles | Strong opportunity | Keep index | 90 | Good depth, answer-ready topics, IQ CTA suppressed on AI pack. |
| Essays hub | Healthy | Keep index | 85 | High-value informational surface for scholarship essay searches. |
| Essay detail pages | Mixed by source | Partial index | 75 | DB samples were deep; static and localized samples need more depth and quality gates. |
| ES/FR home and core pages | Mostly healthy | Keep index after metadata cleanup | 75 | `/es` and `/fr` are good; some localized hubs have English meta fallback. |
| ES/FR scholarship detail | Generally safe but high scale | Keep index with strict gates | 80 | Published-only, quality-score gates and no fallback worked in sampled unseeded URL. |
| ES/FR resource/provider/essay/compare DB pilots | Risky | Partial index or noindex until gate parity | 65 | Route gates are good, but sitemap eligibility and sampled thin pages need tightening. |
| AI docs | Strong | Keep accessible, index optional | 90 | `llms.txt` and `llms-full.txt` are clear and useful for AI agents. |

## 2. Current indexation map

### Scholarships

Current status: `/scholarships` returns `200`, `robots: index, follow`, canonical self, hreflang for `en`, `es`, `fr`, and `x-default`. It is present in the core sitemap. Production smoke saw H1 "Scholarship matches" and a relatively low script-stripped word count, which suggests some listing value may be client/render-payload heavy.

Content quality: high intent and core product value, but the hub should expose more crawlable, stable explanatory content and internal links above or around dynamic results.

Traffic potential: very high. This should remain a primary indexable URL.

Risk: moderate only if listing pages, pagination, or filters leak into the index. Current query/noisy controls look good.

Recommendation: keep indexable. Strengthen static crawlable intro, category links, provider links, essay/resource links, and localized meta descriptions.

### Scholarship detail

Current status: English scholarship details in `/scholarships-0.xml` are indexable. Sample detail pages returned `200`, `robots: index, follow`, self canonical, `en/es/fr/x-default` hreflang when translations existed, and rich JSON-LD graph. Samples were around 645 to 662 visible words.

Sitemap presence: 19,602 URLs in `scholarships-0.xml`.

Traffic potential: very high. These are the site's core long-tail pages.

Risk: medium. At this scale, weak data freshness, generic descriptions, inaccurate title templates, or low-value expired scholarships can drag quality. One sample title pattern used "USA 2026 Apply" for a Canadian/Winnipeg scholarship.

Recommendation: keep indexable only when the page has a real provider, award/deadline where available, source link, useful eligibility/application text, and accurate metadata. Exclude or noindex pages with stale, missing, duplicate, or misleading data.

### Scholarship SEO pages

Current status: category/hub/long-tail SEO pages appear indexable when canonical. Samples such as `/scholarships/category/stem` and `/scholarships/hub/international-friendly` returned substantial visible content and JSON-LD.

Sitemap presence: `categories.xml`, `seo.xml`, and core hub URLs.

Traffic potential: high for thematic and qualifier intent.

Risk: medium if generated long-tail pages become too similar.

Recommendation: keep high-quality topical hubs indexable. Noindex generated variants that do not have unique intro, useful result set, internal links, and FAQ/source context.

### Providers

Current status: `/providers` is indexable by default with self canonical, hreflang, Organization/Breadcrumb/WebPage/FAQ JSON-LD, and about 606 visible words. Provider detail samples were strong, often 1,500 to 1,800 visible words, with scholarship lists and schema. ES/FR provider samples returned localized metadata/body and index/follow.

Sitemap presence: 4,656 URLs in `providers.xml`, plus 5 ES and 5 FR provider DB URLs in localized provider sitemaps.

Traffic potential: medium to high. Provider entity pages can rank for "[university] scholarships", support entity trust, and pass contextual links to scholarship detail pages.

Risk: medium. Some provider samples use generic fallback descriptions. Thin or duplicate provider pages can look like scaled entity stubs.

Recommendation: keep `/providers` and quality-pass provider details indexable. Noindex/follow provider details with no active public scholarships, duplicate provider names, no official URL/source context, or no unique body.

### Compare

Current status: `/compare` is indexable by default with self canonical, hreflang, schema, and useful visible content. Query/filter/pagination variants are noindex/follow in code. Static compare pages such as `/compare/scholarship-vs-grant` are indexable but only moderately deep. Dynamic university/state compare samples were deeper, about 891 to 1,626 visible words. ES/FR compare detail samples were indexable but thin.

Sitemap presence: 1,175 URLs in `compare.xml`, plus small localized compare sitemap buckets.

Traffic potential: medium. It can capture "scholarship vs grant", "merit vs need", "best scholarship websites", and provider/state comparison intent.

Risk: high if dynamic compare pages are templated or thin. Doorway/affiliate-like perception is possible if comparisons do not contain meaningful facts, methodology, and user-first guidance.

Recommendation: partial index. Keep strong static compare articles and dynamic pages with enough unique data, table, FAQ, source context, and related links. Noindex thin localized compare pages and dynamic pages below a content/uniqueness threshold.

### Resources

Current status: `/resources` is indexable with canonical, hreflang, schema, and about 566 visible words. `/resources?cat=ai` correctly returned `noindex, follow` and canonical `/resources`. AI resource article samples were strong: usually about 970 to 1,360 visible words, with canonical self and Article/FAQ/Breadcrumb schema. No `Type ???` was found in sampled AI resource HTML. AI resource pack logic suppresses the IQ CTA, which is appropriate.

Sitemap presence: 925 URLs in `resources.xml`, 15 static ES and 15 static FR resource URLs, and 25 ES plus 25 FR DB resource URLs.

Traffic potential: high. The AI scholarship search content cluster is the best GEO/content opportunity after core scholarships.

Risk: medium. Some static localized resource pages have metadata/canonical/hreflang defects and are thin. Category/filter pages should remain noindex/follow.

Recommendation: keep `/resources` and strong articles indexable, especially AI scholarship search resources. Keep filters noindex/follow. Fix localized static resource metadata before relying on those pages for indexation.

### Essays

Current status: `/essays` and `/essays/examples` are indexable and useful. Static guides such as `/essays/checklist`, `/essays/outline`, and `/essays/leadership` are indexable but thin in sampled production checks, roughly 365 to 397 visible words. DB essay detail samples were much deeper, about 2,440 to 2,917 visible words, and had Article/FAQ/Breadcrumb schema. ES/FR essay detail samples were indexable but thin and kept English H1 text.

Sitemap presence: 11,799 URLs in `essays.xml`, 12 static ES and 12 static FR essay URLs, and 3 ES plus 3 FR essay DB URLs.

Traffic potential: high. "Scholarship essay examples", "how to write scholarship essay", and template/checklist topics are valuable.

Risk: high because 11,799 URLs is a large indexable essay surface. If pages are programmatic and similar, they can dilute quality. Localized essay pilots should not be indexable until they have localized H1/body depth.

Recommendation: keep hub and strong guides indexed. Add explicit quality thresholds for DB essay indexation and sitemap inclusion. Noindex thin static or localized details until expanded.

### ES/FR localized pages

Current status: `/es` and `/fr` are healthy, with self canonical and hreflang. ES/FR scholarship detail unseeded URL samples returned `404` with noindex, proving no English fallback for missing localized detail. ES/FR scholarship detail samples had localized metadata/body and self canonical.

Weak spots: `/es/scholarships` and `/fr/scholarships` had English meta description fallback in sampled production checks. Static localized resource pages had worse metadata defects. ES/FR essay and compare detail pilot samples were indexable while thin.

Sitemap presence: localized sitemap buckets are extensive, especially 11,401 ES and 11,401 FR scholarship detail URLs.

Traffic potential: medium to high long term.

Risk: high at scale if localized pages are thin, partially translated, or not reciprocally hreflang-linked.

Recommendation: continue ES/FR only with strict published-only gates, quality score >=85 minimum, localized title/H1/body, no English fallback, self canonical, reciprocal hreflang, and sitemap parity with route gates. Consider stricter sitemap inclusion for scaled pages: quality >=90, localized body >=350 words for detail pages, and no English H1 except true proper nouns.

### AI docs

Current status: `/llms.txt` and `/llms-full.txt` return `200` as text. They clearly describe ScholarshipTop as an independent scholarship discovery platform, not an official grant issuer, state that `/en` does not exist, explain ES/FR rollout, and point agents to sitemaps and primary public sections.

Traffic potential: not traditional SEO traffic, but high GEO value.

Risk: low. The files do not appear spammy or overclaiming.

Recommendation: keep accessible. Improve `llms-full.txt` with a more explicit "do not hallucinate these fields" policy, preferred citation snippets, data freshness policy, and route priority table for agents.

## 3. Noindex decision framework

Index if:

- The URL is canonical, clean, and not a query/filter/search/sort/pagination duplicate.
- The page has unique user value, not just a thin listing or templated wrapper.
- Detail pages have enough visible body, source context, factual data, internal links, and schema.
- Localized pages have published translations with localized title/H1/body and quality score >=85, preferably >=90 for scaled sitemap inclusion.
- The page supports a meaningful search intent: scholarship discovery, provider entity, essay help, AI scholarship search, or comparison research.

Noindex/follow if:

- The page is a filter, search, category query variant, sort variant, or page-2+ variant that does not deserve standalone search landing status.
- The page is useful for users but too thin or duplicate for search.
- A localized page exists but has English metadata/body fallback, missing translated H1, or low localized word count.
- A provider/compare/essay page has useful links but not enough original content to rank safely.

404 if:

- A localized detail page has no published translation and would otherwise fall back to English.
- A provider, scholarship, essay, compare, or resource slug does not resolve to a public entity.
- The URL represents a stale programmatic slug that no longer maps to a public page and has no relevant replacement.

Exclude from sitemap if:

- The URL is noindex, redirected, 404, query/noisy, or not route-gate eligible.
- The localized sitemap builder cannot verify the same conditions the route uses to render the page.
- The page passes `200` but fails a quality policy for visible content depth, source trust, or uniqueness.

Keep in sitemap if:

- It returns `200`, is indexable, has self canonical, and passes the section-specific quality gate.
- Localized versions are published, self-canonical, reciprocal hreflang eligible, and do not use English fallback.

Applied to ScholarshipTop:

- Scholarships are the core and should remain indexable, but not every scaled scholarship URL should be guaranteed indexation forever.
- Providers/resources/essays are valuable supporting authority surfaces, not junk by default.
- Compare should be selective.
- ES/FR should be indexed only where fully localized and strong.
- Query/filter URLs should stay noindex/follow.

## 4. Section-by-section recommendations

### Scholarships / grants

Pros of indexation:

- Highest business relevance and clearest search intent.
- Detail pages have structured data, provider context, eligibility/deadline/award signals, and internal links.
- Localized scholarship details can open Spanish/French long-tail demand if translation quality stays high.

Cons of indexation:

- Massive scale can expose stale or generic pages.
- Title templates can become misleading if country/provider facts are not reflected accurately.
- Detail pages around 600 visible words are useful but should not be allowed to degrade below a threshold.

Crawl budget risk: medium to high because scholarship details plus localized details are now over 42,000 sitemap URLs.

SEO potential: very high.

GEO potential: high. Scholarship detail pages are answer-ready if AI agents can trust official-source caveats and freshness.

Recommendation: keep index with quality gates. Minimum gate should include `is_indexable`, public route resolves, no stale/dead source, real provider/award/deadline where available, self canonical, source verification copy, and no misleading title templates. Localized detail should require published translation, quality score >=85, localized body/summary, and reciprocal hreflang. For future scale, consider quality >=90 and localized body >=350 words for sitemap inclusion.

### Providers

Pros of indexation:

- Provider pages strengthen entity signals for universities, foundations, and scholarship issuers.
- They can rank for "[provider] scholarships" and similar searches.
- They provide natural internal links to scholarship detail pages.
- They help AI engines connect scholarships to institutions and official sources.

Cons of indexation:

- Weak provider pages with generic descriptions can look like entity stubs.
- Duplicated provider names or merged organizations can create duplicate content.
- Localized provider pages can be unsafe if sitemap includes them before body verification.

Crawl budget risk: medium at 4,656 provider URLs.

SEO potential: medium to high.

GEO potential: high for entity graph clarity.

Recommendation: keep `/providers` indexable. Keep provider detail pages indexable only if they have at least one active public scholarship, stable display name, visible scholarship list, official URL/source/trust context, and non-duplicate identity. Noindex/follow weak provider pages rather than deleting them if they still help users navigate.

### Compare

Pros of indexation:

- Can capture comparison-intent queries such as "scholarship vs grant", "merit vs need", "California vs Texas scholarships", and "ScholarshipTop vs Fastweb".
- Supports decision-stage content and internal linking.
- Helps AI engines answer "which scholarship path is better" questions with site-owned context.

Cons of indexation:

- Easy to look doorway-like if pages are highly templated.
- Dynamic compare pages need enough unique facts and methodology.
- Localized compare pilots sampled were thin but indexable.

Crawl budget risk: medium. 1,175 compare URLs are not huge, but weak templated pages can damage perceived quality.

SEO potential: medium.

GEO potential: medium to high if comparisons are factual, nuanced, and cite limitations.

Recommendation: partial index. Keep `/compare`, high-quality static guides, and dynamic compare pages that have a unique table, enough data points, FAQ, methodology, related scholarships/resources, and at least about 700 to 900 useful visible words. Noindex/follow dynamic or localized compare details below threshold.

### Resources

Pros of indexation:

- Resources build topical authority around scholarship search, deadlines, verification, AI use, and student workflows.
- AI scholarship search articles are directly aligned with GEO/answer-engine discovery.
- Production samples were deep enough and had good schema.

Cons of indexation:

- Filter/category variants should not compete with the hub.
- Localized static resource metadata issues can create bad index signals.
- Generic articles without source policy can look AI-generated.

Crawl budget risk: low to medium at 925 English resource URLs plus small localized buckets.

SEO potential: high.

GEO potential: very high, especially for AI scholarship search resources.

Recommendation: keep `/resources` and strong articles indexable. Keep `/resources?cat=ai` and other filter/search variants noindex/follow. Improve static localized resource metadata/canonical/hreflang before indexing. Add more visible editorial/source/freshness signals on articles, especially AI articles.

### Essays

Pros of indexation:

- Scholarship essay queries are large and close to the user's scholarship workflow.
- Essay examples/templates/checklists can attract informational traffic and link naturally into scholarship searches.
- Strong DB essay samples were long and structured.

Cons of indexation:

- 11,799 essay sitemap URLs is a large programmatic surface.
- Static guide samples are thin.
- ES/FR detail samples had English H1 and low visible word count while indexable.
- UGC or programmatic essay examples can become duplicate/thin if not carefully curated.

Crawl budget risk: high.

SEO potential: high if curated, medium if programmatic.

GEO potential: medium to high for how-to answers and templates.

Recommendation: keep `/essays`, `/essays/examples`, and strong essay guides indexable. Add a dedicated essay quality gate before sitemap/indexation: minimum visible depth, unique scholarship-specific advice, localized H1/body for translations, FAQ, source/context, and no raw placeholders. Noindex/follow weak essay detail pages until improved.

### ES/FR localized pages

Pros of indexation:

- Opens Spanish and French scholarship discovery markets.
- Localized scholarship detail pages can rank for long-tail queries with less competition.
- Hreflang/no `/en` policy is generally sound.

Cons of indexation:

- Partial translations create quality risk quickly at scale.
- Static localized resources and hubs showed metadata fallback defects.
- Thin ES/FR essay/compare pilot details are currently indexable.

Crawl budget risk: high because ES/FR scholarship details alone add 22,802 URLs.

SEO potential: medium to high long term.

GEO potential: high if AI engines can trust language-specific content and not see mixed English fallback.

Recommendation: continue but gate harder. Keep ES/FR home/core and quality-pass scholarship details indexable. Temporarily noindex or remove from sitemap thin localized compare/essay/resource pages until localized H1/body depth and metadata parity are fixed. Do not add localized URLs to sitemap unless the route can render the same page as indexable.

## 5. Sitemap audit

Production `/sitemap.xml` returned 28 child sitemaps. Limited read-only checks counted approximately 62,883 URLs.

| Sitemap | Approx URLs | Verdict |
|---|---:|---|
| `core.xml` | 85 | Good, contains core public surfaces. |
| `resources.xml` | 925 | Good if all published articles meet quality policy. |
| `essays.xml` | 11,799 | Needs explicit quality threshold due scale. |
| `providers.xml` | 4,656 | Useful, but weak provider stubs should be excluded/noindexed. |
| `categories.xml` | 11 | Good. |
| `seo.xml` | 1,626 | Useful, but generated long-tail pages need duplicate/thin checks. |
| `scholarships-0.xml` | 19,602 | Core sitemap, high scale. Needs ongoing freshness and title accuracy checks. |
| `compare.xml` | 1,175 | Mixed. Add quality gate to dynamic compare details. |
| `locale-es-core.xml` | 21 | Good baseline. |
| `locale-fr-core.xml` | 21 | Good baseline. |
| `locale-es-essays.xml` | 12 | Static localized essay pages should be checked for depth. |
| `locale-fr-essays.xml` | 12 | Static localized essay pages should be checked for depth. |
| `locale-es-compare.xml` | 5 | Small, acceptable if pages are strong. |
| `locale-fr-compare.xml` | 5 | Small, acceptable if pages are strong. |
| `locale-es-resources.xml` | 15 | Problematic if static localized metadata/canonical defects persist. |
| `locale-fr-resources.xml` | 15 | Problematic if static localized metadata/canonical defects persist. |
| `locale-es-categories.xml` | 11 | Good if category pages have localized metadata/body. |
| `locale-fr-categories.xml` | 11 | Good if category pages have localized metadata/body. |
| `locale-es-resources-db.xml` | 25 | Needs sitemap gate parity with route body checks. |
| `locale-fr-resources-db.xml` | 25 | Needs sitemap gate parity with route body checks. |
| `locale-es-providers-db.xml` | 5 | Needs sitemap gate parity with route body checks. |
| `locale-fr-providers-db.xml` | 5 | Needs sitemap gate parity with route body checks. |
| `locale-es-scholarships-detail-db.xml` | 11,401 | Stronger gating found; still high scale. |
| `locale-fr-scholarships-detail-db.xml` | 11,401 | Stronger gating found; still high scale. |
| `locale-es-essays-guide-db.xml` | 3 | Sample suggests thin/indexable risk. |
| `locale-fr-essays-guide-db.xml` | 3 | Sample suggests thin/indexable risk. |
| `locale-es-compare-detail-db.xml` | 4 | Sample suggests thin/indexable risk. |
| `locale-fr-compare-detail-db.xml` | 4 | Sample suggests thin/indexable risk. |

Helpful sitemap behavior:

- No `/en` URLs were found in the checked sitemap set.
- No query/hash URLs were found in checked sitemap sets.
- Sitemap index is clean and discoverable from `robots.txt`.
- Scholarship localized detail sitemap gating is comparatively strong and checks English indexability plus localized title/body/summary signals.

Sitemap risks:

- `essays.xml` is very large and should not include every published programmatic page unless there is a documented quality policy.
- `compare.xml` includes many dynamic pages; dynamic compare metadata/indexation should use the same quality policy concept as static compare guides.
- Localized resource/provider/essay/compare sitemap builders should not hardcode body availability. They should verify translated body/summary the same way route gates do.
- Static localized resource pages with missing canonical/hreflang should not be promoted in localized sitemaps until fixed.

Answer: the sitemap is mostly helping discovery, but it can start hurting crawl budget and quality if low-quality scaled pages remain included. The immediate goal should be "sitemap only equals indexable quality-pass pages."

## 6. Robots/canonical/hreflang audit

### Robots.txt

Production `/robots.txt`:

- `User-Agent: *`
- `Allow: /`
- `Disallow: /api/`
- `Sitemap: https://scholarshiptop.com/sitemap.xml`

Verdict: clean and permissive. It does not block AI crawlers. That is fine for GEO visibility. There are no visible AI-bot-specific blocks or allow lists.

Risk: low. If the site later wants bot-specific policies, treat that as a separate approval because it can affect production crawling.

### Meta robots

Good patterns observed:

- Clean core pages are indexable by default or `index, follow`.
- `/resources?cat=ai` returns `noindex, follow` and canonical `/resources`.
- Unseeded localized scholarship details return `404` and noindex behavior.
- Private/user essay route is noindex/nofollow in code.

Weak patterns observed:

- ES/FR compare detail pilots and ES/FR essay detail pilots are index/follow despite thin visible content in samples.
- Localized static resources can be indexable despite missing canonical/hreflang and English fallback metadata.

Recommendation: noindex/follow localized pilots until they meet translated depth and metadata parity. Add explicit quality-based robots logic to dynamic compare and essay detail surfaces.

### Canonical

Good:

- Canonical origin is centralized as `https://scholarshiptop.com`.
- Canonical helper strips query/hash/trailing slash.
- Most core/detail production samples had self canonicals.
- Query variants canonicalize to the clean hub.

Weak:

- Static localized resource samples `/es/resources/how-to-find-scholarships` and `/fr/resources/how-to-find-scholarships` had no canonical in production smoke checks.

Recommendation: every public localized static page should have self canonical and localized metadata. Do not rely on default English metadata for localized static routes.

### Hreflang

Good:

- Home/core pages commonly expose `en`, `es`, `fr`, and `x-default`.
- Scholarship detail pages with translations expose reciprocal alternates and no `/en`.
- The no-`/en` rule is documented in `llms.txt` and `llms-full.txt`.

Weak:

- Some English dynamic detail pages do not expose hreflang even when localized versions exist or localized versions expose alternates back.
- Static localized resource samples had no hreflang.
- Scholarship topical hub samples such as `/scholarships/for-women` and `/scholarships/hub/international-friendly` did not show hreflang, which may be acceptable if no localized equivalent exists, but should be intentional.

Recommendation: enforce reciprocal hreflang only when both pages are route-gate eligible. Avoid listing localized alternates for non-renderable translations. Keep `/en` absent.

### Query params, filters, and pagination

Good:

- `/providers`, `/resources`, `/compare`, and `/essays` have code patterns for noindex/follow when query/search/sort/page noise is present.
- `/resources?cat=ai` production behavior matched the policy.

Recommendations:

- Continue noindex/follow for filters, categories-as-query, sorts, search, and page-2+ listing variants.
- Keep clean category/hub URLs indexable only when they are curated landing pages, not arbitrary faceted URLs.
- Check localized provider pagination metadata; localized provider pages parse `page`, but production/code should verify page-2+ is noindex/follow consistently.

## 7. AI/GEO audit

GEO / AI visibility score: 84/100.

What is strong:

- `llms.txt` and `llms-full.txt` exist, are accessible, and are unusually explicit.
- They define ScholarshipTop as an independent scholarship discovery platform, not an official grant issuer.
- They tell agents that scholarship information can change and users should verify official provider pages.
- They document that `/en` does not exist.
- They explain ES/FR rollout and localized content rules.
- They link to sitemap discovery and identify public vs private route groups.
- They do not make excessive claims about guaranteed funding or official status.

What is weak:

- `llms-full.txt` can be more precise about fields AI should never infer: award amount, deadline, eligibility, citizenship, renewal, official status, and application URL.
- It should include preferred citation patterns/snippets for scholarship detail, provider, resource, essay, and compare pages.
- It should include a concise public indexation priority map for agents.
- It should define data freshness policy more concretely: how to interpret `lastmod`, deadline changes, and official source verification.
- It should warn agents not to treat localized pages as complete translations unless the page itself is published and available.
- It can include a "known limitations" section: ScholarshipTop aggregates and structures data; official providers remain source of truth.

Recommended additions to `llms-full.txt`:

```md
## Preferred citation behavior

When citing ScholarshipTop, cite the most specific public page available:
- Scholarship detail page for one award.
- Provider page for a provider's scholarship list.
- Resource article for scholarship-search advice.
- Essay guide for writing guidance.
- Compare page only for comparison/methodology claims.

Use the page title and canonical URL. Do not cite private `/iq`, account, checkout, or API routes.
```

```md
## Fields agents must verify before answering

Scholarship amount, deadline, eligibility, citizenship or residency requirements, required documents, renewal rules, and application URL can change. Treat ScholarshipTop as a discovery and organization source. For final application decisions, tell users to verify the official provider page linked from the scholarship detail.
```

```md
## Public page priority for agents

1. `/scholarships` and scholarship detail pages: primary discovery and award facts.
2. `/providers` and provider detail pages: issuer/entity context.
3. `/resources` and resource articles: search strategy, verification, AI scholarship search guidance.
4. `/essays` and essay guides: essay writing help and examples.
5. `/compare` and selected compare pages: decision support, not official eligibility advice.
6. `/es` and `/fr` localized pages: use only when the localized URL exists and returns a published page.
```

```md
## Localized page policy

English pages live at root paths, not `/en`. Spanish and French pages use `/es` and `/fr`. If a localized detail URL returns 404 or noindex, agents should use the English canonical page instead and should not invent a translated summary.
```

```md
## Data freshness and official-source policy

ScholarshipTop pages may include last-updated signals and official provider links. A current official provider page outranks any stale ScholarshipTop detail. Agents should mention verification when summarizing deadlines, amounts, application links, or eligibility requirements.
```

What to remove:

- Nothing urgent. Avoid adding keyword-stuffed lists or repeated "AI scholarship" language. The current tone is useful and not spammy.

Should ScholarshipTop add `/ai.txt`?

- Not necessary now. `llms.txt` and `llms-full.txt` are already the recognizable agent-facing pattern. Adding `/ai.txt` could be a harmless alias only if maintained from the same source, but do not create divergent guidance.

Risks of over-optimizing for AI:

- Repeating target keywords in `llms-full.txt` can look manipulative.
- Telling agents which pages to rank rather than how to interpret content can reduce trust.
- Overclaiming officialness, completeness, or freshness would be harmful.
- Adding too many bot-specific robots rules without clear intent can accidentally block useful crawlers.

## 8. Content quality audit

### Scholarships

Helpfulness: high.  
Originality: medium to high, depending on source richness.  
Depth: adequate in samples, but detail pages should not drop much below current depth.  
Freshness: critical due deadlines and award changes.  
Trust: good when official links and disclaimers are present.  
Scaled-content risk: medium to high due large sitemap.

Keep indexed:

- Active, complete scholarship details.
- Strong category/hub/SEO pages with real result sets and FAQs.
- ES/FR details that meet published quality gates.

Improve before index:

- Pages with generic descriptions, missing amount/deadline/source, or inaccurate country/title metadata.

Noindex/follow:

- Stale but still navigable scholarship pages.
- Thin details without enough application/eligibility/source context.

404/remove/redirect:

- Missing slugs, deleted scholarship records, or localized details without published translation.

### Providers

Helpfulness: high when the provider has active scholarships.  
Originality: medium. Some provider descriptions are generic.  
Depth: good in sampled production pages due scholarship lists and schema.  
Trust: strong if official URL and provider context exist.

Keep indexed:

- Provider pages with active scholarships, useful description, official/source link, and visible related scholarships.

Improve before index:

- Generic provider profiles with weak descriptions.

Noindex/follow:

- Provider pages with no active scholarships or duplicate/ambiguous identity.

### Compare

Helpfulness: mixed. Static and dynamic EN samples were useful, but thin localized samples are not ready.  
Originality: medium. It depends on unique facts and methodology.  
Scaled-content risk: medium.

Keep indexed:

- Static comparison guides with clear search intent.
- Dynamic compare pages with enough unique data and narrative.

Improve before index:

- Dynamic compare pages that only repackage table data.
- Localized compare pages under 700 useful visible words.

Noindex/follow:

- Thin compare detail pages.
- Query/filter compare pages.

### Resources

Helpfulness: high for AI scholarship search and verification articles.  
Originality: high enough in sampled AI articles.  
Depth: generally good for AI resources.  
Trust: good but can improve with explicit editorial/source policy.

Keep indexed:

- AI scholarship search articles.
- Verification/deadline/source-checking articles.
- ScholarshipTop-vs-directory resource articles if balanced and not purely promotional.

Improve before index:

- Localized static resources with English metadata fallback or no canonical/hreflang.

Noindex/follow:

- Resource filters and category query pages.

### Essays

Helpfulness: high when pages provide actual essay structure, examples, and scholarship-specific advice.  
Originality: mixed; programmatic essay pages need scrutiny.  
Depth: DB samples were strong; static and localized samples were thin.  
Trust: should include author/editorial/reviewed guidance where possible.

Keep indexed:

- Hub pages.
- Strong DB essay guides with unique body and FAQ.
- Curated examples/templates with enough depth.

Improve before index:

- Static guides around 365 to 397 words.
- Localized pages with English H1 or low translated body.

Noindex/follow:

- UGC/private essay pages.
- Thin generated essay pages.
- Localized essay pilots until localized H1/body are complete.

## 9. Internal linking audit

Current strengths:

- Home links to core public surfaces.
- Scholarship details link to related scholarships, providers, resources, essays, and comparison contexts.
- Provider detail pages link back into scholarships and similar providers.
- Resource articles link to scholarship discovery flows and related guides.
- Essay pages link to related guides and scholarship workflows.
- AI resource articles suppress IQ CTA, reducing product-intrusion risk for informational/GEO pages.
- Localized pages generally keep localized navigation where implemented.

Missing or weak links:

- `/scholarships` should expose more stable crawlable links to high-value categories, providers, essay help, and AI search resources.
- Provider detail pages should consistently link to official source context and top scholarships.
- Compare detail pages should link to methodology, related resource articles, and scholarship categories.
- Essay detail pages should link to relevant essay examples, templates, and scholarship categories.
- ES/FR localized hubs should keep users inside the locale where a published localized page exists, but fall back deliberately to English where no localized page exists.

Broken/bare path risk:

- No obvious broken/localhost links were found in sampled production pages, but this audit was not a full crawl.
- Raw Next/RSC payload in some essay pages included `$undefined` strings. This does not appear visible to users, but AI agents that ingest raw HTML may see it. Treat as a low-to-medium cleanup item.

Recommendations:

- Build `/resources` as the AI scholarship search authority hub and link it from scholarship search flows.
- Use `/providers` as an entity hub linking into provider scholarships and scholarship detail pages.
- Make `/essays` a supporting content hub for essay-based scholarship intent.
- Keep compare pages as supporting decision content, not a large uncontrolled landing-page factory.
- Add localized internal links only for route-gate eligible localized URLs.

## 10. Structured data audit

What exists:

- Global Organization/EducationalOrganization and WebSite/SearchAction JSON-LD in the app layout.
- Home WebPage schema.
- Scholarship detail JSON-LD graph with organization/provider context, EducationalOccupationalProgram-like scholarship modeling, Offer/UnitPriceSpecification for award, BreadcrumbList, and FAQPage when enough FAQs exist.
- Provider pages include Organization, BreadcrumbList, WebPage, FAQ.
- Resource articles include BreadcrumbList, BlogPosting/Article, and FAQ.
- Essay pages include BreadcrumbList, Article, and FAQ.
- Compare pages include BreadcrumbList, WebPage/Article, and FAQ.
- Listing pages use ItemList/WebPage patterns in several areas.

What is missing or could improve:

- No official Schema.org `Scholarship` type exists, so current modeling is acceptable, but keep it conservative.
- Article/resource/essay pages could benefit from clearer author/editor/reviewed-by/editorial policy signals if the site can support them honestly.
- Provider pages should ensure `sameAs`/official URL are included only when reliable.
- Localized static pages should avoid duplicate/conflicting JSON-LD and should have localized metadata/canonical/hreflang parity.
- Compare structured data should avoid overusing FAQ if questions are templated and thin.

Spam risk:

- Low to medium. FAQ schema across many templated pages can become risky if FAQ content is repeated. Keep FAQ unique and visible.
- Avoid marking every scholarship field as exact when data may be stale. Use official-source caveats.

Recommendation: keep current schema direction, but pair schema eligibility with content quality. Do not add schema to compensate for thin pages.

## 11. Priority action plan

### P0 - must fix before changing indexation

| Item | Expected impact | Implementation risk | Files likely involved | Validation commands | Rollback idea |
|---|---|---|---|---|---|
| Fix static ES/FR resource metadata, canonical, hreflang, and duplicate/conflicting schema for `/es/resources/how-to-find-scholarships` and `/fr/resources/how-to-find-scholarships`. | High. Prevents low-quality localized index signals. | Medium. Touches localized static resource metadata. | `app/[locale]/resources/...`, localized resource metadata helpers, static pilot page wrappers. | `curl -sL https://scholarshiptop.com/es/resources/how-to-find-scholarships | Select-String -Pattern 'canonical|hreflang|description'` | Revert localized metadata wrapper change only. |
| Noindex or remove from sitemap thin ES/FR compare and essay DB pilot details until localized H1/body depth is fixed. | High. Prevents thin localized indexation. | Medium. Must align routes and sitemap. | `app/[locale]/compare/...`, `app/[locale]/essays/...`, `lib/i18n/*`, `lib/seo/sitemaps.ts`. | `curl -sL https://scholarshiptop.com/es/compare/states/california-vs-texas | Select-String -Pattern 'robots|canonical|hreflang'` | Restore previous robots/sitemap inclusion after content reaches threshold. |
| Align localized sitemap builders with route gates for resources/providers/essays/compare. Do not hardcode body availability. | High. Prevents sitemap 200/404/noindex mismatch. | Medium. Read queries need fields used by route gate. | `lib/seo/sitemaps.ts`, `lib/i18n/*Pilot/listPublished*Translations.ts`, `lib/i18n/contentTranslationsServer.ts`. | `curl -sL https://scholarshiptop.com/sitemaps/locale-es-resources-db.xml` plus sampled URL `curl -I`. | Revert list query/gate change if sitemap drops unexpected valid URLs. |
| Add explicit essay indexation quality policy before further essay scale. | High. Protects crawl budget and quality. | Medium to high depending DB fields. | `app/essays/[slug]/page.tsx`, `lib/essays/*`, `lib/seo/sitemaps.ts`. | Count `essays.xml`; sample low-depth pages with `curl`; inspect meta robots. | Start with sitemap exclusion only, then route noindex after validation. |
| Fix scholarship title template accuracy for non-USA scholarships. | Medium to high. Prevents misleading SERP snippets. | Low to medium. | Scholarship metadata helpers, title builders. | `curl -sL https://scholarshiptop.com/scholarships/allan-and-louise-anderson-and-elaine-andrew-bursary-6579 | Select-String -Pattern '<title>'` | Revert title template only. |

### P1 - safe SEO/GEO improvements

| Item | Expected impact | Implementation risk | Files likely involved | Validation commands | Rollback idea |
|---|---|---|---|---|---|
| Add dynamic compare quality policy to metadata and sitemap inclusion. | Medium. Reduces doorway/thin risk. | Medium. | `lib/seo/compareSeoQualityPolicy.ts`, compare route metadata, sitemap builders. | Sample compare pages for robots and sitemap presence. | Relax threshold or switch noindex to sitemap exclusion only. |
| Improve `/scholarships`, `/es/scholarships`, and `/fr/scholarships` metadata/body depth. | Medium. Strengthens hub pages. | Low to medium. | scholarship hub page and localized metadata helpers. | `curl -sL https://scholarshiptop.com/es/scholarships | Select-String -Pattern 'description|canonical|hreflang|<h1'` | Revert content copy/metadata only. |
| Add reciprocal hreflang for English dynamic detail pages when localized versions exist. | Medium. Improves international clustering. | Medium. | scholarship/provider/resource/essay/compare alternate helpers. | Compare English and localized source HTML for identical alternate set. | Disable alternates for that surface if mismatch appears. |
| Expand thin static essay guides. | Medium. Improves essay topical authority. | Low. | static essay guide content/data. | `curl -sL https://scholarshiptop.com/essays/checklist` and visible word check. | Revert content additions. |
| Add `llms-full.txt` sections for citation behavior, non-inferable fields, data freshness, and route priority. | Medium for GEO. | Low. | `public/llms-full.txt`. | `curl -sL https://scholarshiptop.com/llms-full.txt` | Revert text-only change. |
| Clean raw `$undefined` values from essay HTML/RSC payload if feasible. | Low to medium. Helps raw AI agents. | Medium. | essay related scholarship serialization/render data. | `curl -sL <essay-url> | Select-String -Pattern '\\$undefined'` | Revert serialization default handling. |

### P2 - content expansion / topical authority

| Item | Expected impact | Implementation risk | Files likely involved | Validation commands | Rollback idea |
|---|---|---|---|---|---|
| Build a stronger AI scholarship search hub under `/resources` with links to all AI articles. | High. Supports SEO and GEO cluster. | Low to medium. | resource hub/category components/content. | `curl -sL https://scholarshiptop.com/resources` and internal link extraction. | Revert hub copy/link additions. |
| Add provider editorial blurbs for high-value universities/foundations. | Medium. Improves entity pages. | Medium. | provider data/content pipeline. | Sample provider word/source checks. | Roll back to generic descriptions. |
| Create curated essay templates/examples pages with strong original guidance. | Medium to high. | Medium. | essay content system. | Sample article depth/schema checks. | Noindex new pages first, then index after QA. |
| Add data freshness visible labels and official source verification reminders to scholarship details. | High trust impact. | Medium. | scholarship detail components/metadata. | `curl` detail pages and schema/source check. | Revert UI copy only. |

### P3 - optional experiments

| Item | Expected impact | Implementation risk | Files likely involved | Validation commands | Rollback idea |
|---|---|---|---|---|---|
| Test `/ai.txt` as an alias to `llms-full.txt` after clear approval. | Low to medium. | Low, but route change required. | public/static route handling. | `curl -I https://scholarshiptop.com/ai.txt` | Delete alias. |
| Add bot-specific robots comments or policy notes only after approval. | Uncertain. | Medium due crawl implications. | `app/robots.ts`. | `curl https://scholarshiptop.com/robots.txt` | Revert robots change immediately. |
| A/B test indexation thresholds by sitemap bucket, not broad noindex. | Medium. | Medium to high. | sitemap builders, search console monitoring. | Sitemap count comparison and GSC coverage. | Restore previous threshold. |

## 12. Final recommendation

1. Should ScholarshipTop noindex everything except grants/scholarships?  
   No. That would likely harm topical authority and AI visibility. Scholarships are the core, but providers, resources, essays, and selected compare pages help users and search engines understand the scholarship ecosystem.

2. Should `/providers` remain indexable?  
   Yes. Keep the hub indexable. Keep provider detail pages indexable only when they have active scholarships, official/source context, and useful body content.

3. Should `/compare` remain indexable?  
   Yes, but selectively. Keep the hub and strong comparison articles. Add quality gates/noindex for thin dynamic or localized compare details.

4. Should `/resources` remain indexable?  
   Yes. It is one of the strongest supporting SEO/GEO surfaces. Keep filters such as `/resources?cat=ai` noindex/follow.

5. Should AI resource articles remain indexable?  
   Yes. They are high-value GEO content and sampled pages were deep, topical, and not polluted by irrelevant IQ CTAs.

6. Should `/essays` remain indexable?  
   Yes for the hub and strong guides. Do not blindly index all essay detail pages at scale. Add quality thresholds and noindex thin/localized/duplicate pages.

7. What should happen with ES/FR?  
   Continue ES/FR, but slow indexation to quality-pass pages only. Keep `/es` and `/fr` indexed. Keep ES/FR scholarship detail pages indexed only with strict published/quality/body/no-fallback gates. Noindex thin ES/FR compare/essay/resource pilots until metadata and body quality are fixed.

8. What should happen with `llms.txt` / `llms-full.txt`?  
   Keep both. Improve `llms-full.txt` with preferred citation behavior, non-inferable scholarship fields, data freshness policy, public page priority, and localized page fallback rules.

9. What is the safest next step?  
   Fix indexation safety before growth: resolve localized static resource metadata/canonical/hreflang defects, noindex thin ES/FR pilot compare/essay pages, and align localized sitemap builders with route gates. Then add essay/dynamic-compare quality thresholds.

## 13. Scoring

| Area | Score | Notes |
|---|---:|---|
| Technical SEO | 78 | Strong canonical/robots/query handling, but localized metadata defects remain. |
| Indexation control | 72 | Good noisy-query noindex, but scaled essay/localized/compare quality gates need tightening. |
| Sitemap quality | 70 | Clean structure and no `/en`, but large scaled surfaces and localized gate parity risks. |
| Hreflang/localization | 68 | Good no-`/en` policy and scholarship detail alternates, but static localized resource and some dynamic reciprocity issues. |
| Content quality | 73 | Strong AI resources and many detail pages; thin static/localized pilots and scaled essays need QA. |
| Internal linking | 82 | Good cross-surface links; hubs can become stronger and more localized. |
| Structured data | 78 | Rich schema coverage; avoid FAQ/schema overuse on templated pages. |
| GEO / AI visibility | 84 | Excellent `llms` foundation and AI resource cluster; add citation/freshness/non-inference rules. |
| Crawl budget efficiency | 64 | The main weakness: about 62.9k sitemap URLs with several scaled/quality-mixed surfaces. |
| Overall SEO growth readiness | 74 | Strong foundation, but safer growth requires quality-gated indexation before more scale. |

## 14. Validation commands

All commands below are read-only.

Production robots, sitemap, llms:

```powershell
curl.exe -sL https://scholarshiptop.com/robots.txt
curl.exe -sL https://scholarshiptop.com/sitemap.xml
curl.exe -sL https://scholarshiptop.com/llms.txt
curl.exe -sL https://scholarshiptop.com/llms-full.txt
```

Sitemap child URL counts:

```powershell
$children = (curl.exe -sL https://scholarshiptop.com/sitemap.xml) -split "`n" | Select-String -Pattern '<loc>' | ForEach-Object { ($_ -replace '.*<loc>','' -replace '</loc>.*','').Trim() }
$children | ForEach-Object {
  $xml = curl.exe -sL $_
  [pscustomobject]@{ Sitemap = $_; Urls = ([regex]::Matches($xml, '<url>')).Count }
}
```

Check for `/en` and query URLs in sitemap samples:

```powershell
curl.exe -sL https://scholarshiptop.com/sitemaps/core.xml | Select-String -Pattern 'https://scholarshiptop.com/en/|[?]'
curl.exe -sL https://scholarshiptop.com/sitemaps/scholarships-0.xml | Select-String -Pattern 'https://scholarshiptop.com/en/|[?]' -CaseSensitive
curl.exe -sL https://scholarshiptop.com/sitemaps/locale-es-scholarships-detail-db.xml | Select-String -Pattern 'https://scholarshiptop.com/en/|[?]' -CaseSensitive
```

Check canonical, robots, hreflang on sample pages:

```powershell
curl.exe -sL https://scholarshiptop.com/resources?cat=ai | Select-String -Pattern 'robots|canonical|hreflang|<title'
curl.exe -sL https://scholarshiptop.com/es/resources/how-to-find-scholarships | Select-String -Pattern 'robots|canonical|hreflang|description|og:url|<title'
curl.exe -sL https://scholarshiptop.com/es/compare/states/california-vs-texas | Select-String -Pattern 'robots|canonical|hreflang|<h1|<title'
curl.exe -sL https://scholarshiptop.com/es/essays/how-to-write-richard-scholarship-essay | Select-String -Pattern 'robots|canonical|hreflang|<h1|<title'
```

Check missing localized detail fallback:

```powershell
curl.exe -I https://scholarshiptop.com/es/scholarships/this-localized-page-should-not-exist-999999
curl.exe -I https://scholarshiptop.com/fr/scholarships/this-localized-page-should-not-exist-999999
```

Code inspection commands:

```powershell
rg -n "noindex|canonical|hreflang|alternates|robots" app lib
rg -n "buildSitemap|sitemap|renderSitemap|locale-es|locale-fr" app lib
rg -n "quality_score|TRANSLATION_INDEXABLE_QUALITY_SCORE|shouldIndexTranslatedContent" lib
rg -n "llms|llms-full" public app lib
rg -n "shouldShowResourceArticleIqCta|isAiResourcePackSlug|categoryId !== 'ai'" lib
rg -n "compareSeoQualityPolicy|providerSeoQualityPolicy|essay" lib app
```

Suggested safe URL sample checks:

```powershell
$urls = @(
  'https://scholarshiptop.com/',
  'https://scholarshiptop.com/scholarships',
  'https://scholarshiptop.com/providers',
  'https://scholarshiptop.com/compare',
  'https://scholarshiptop.com/resources',
  'https://scholarshiptop.com/essays',
  'https://scholarshiptop.com/es',
  'https://scholarshiptop.com/fr',
  'https://scholarshiptop.com/es/scholarships',
  'https://scholarshiptop.com/fr/scholarships'
)
$urls | ForEach-Object {
  $html = curl.exe -sL $_
  [pscustomobject]@{
    Url = $_
    Title = ([regex]::Match($html, '<title>(.*?)</title>')).Groups[1].Value
    Robots = ([regex]::Match($html, '<meta[^>]+name=["'']robots["''][^>]+content=["'']([^"'']+)')).Groups[1].Value
    Canonical = ([regex]::Match($html, '<link[^>]+rel=["'']canonical["''][^>]+href=["'']([^"'']+)')).Groups[1].Value
    HreflangCount = ([regex]::Matches($html, 'hreflang=')).Count
  }
}
```

