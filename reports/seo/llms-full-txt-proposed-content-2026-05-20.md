# Proposed `/llms-full.txt` content — ScholarshipTop (2026-05-20)

**Audit only.** Companion to compact `/llms.txt`. Target: &lt; 25 KB; **no inline enumeration of ~40k DB URLs**.

---

## Should ScholarshipTop ship `/llms-full.txt`?

**Yes, recommended** as an optional second file linked from `/llms.txt`. Rationale:

- Main site has large, heterogeneous route surface (scholarships, providers, CMS, compare, i18n pilot).
- Compact `llms.txt` stays readable for context-limited tools; `llms-full.txt` carries data-model and policy detail.
- Still avoids sitemap dumps by referencing bucket URLs and patterns.

---

## Section rationale

| Section | Why |
| --- | --- |
| Extended overview | Deeper entity definition for research agents |
| Route groups | Maps code architecture to URLs |
| Scholarship data model | Explains slug vs UUID, hubs, categories, long-tail |
| Provider model | State hubs + profile pages |
| Essay vs /essay | Prevents tool/guide confusion |
| Compare model | Static vs DB comparison pages |
| Resources model | Static guides vs CMS |
| ES/FR localization | Stage 2 scope and limits |
| Verification + editorial | GEO trust signals |
| Premium | Product boundary |
| Exclusions | Security |
| Sitemaps + drip | Explains changing URL counts |
| DB translation future | Sets expectations for ES/FR DB work |
| Maintenance | Owner playbook |

---

## Proposed `/llms-full.txt` full draft

```text
# ScholarshipTop — extended LLM context
# https://scholarshiptop.com/llms-full.txt
# Companion: https://scholarshiptop.com/llms.txt
# Last updated: 2026-05-20 (audit draft)

## 1. Extended site overview

ScholarshipTop (https://scholarshiptop.com) is a student-facing scholarship discovery platform. It aggregates and structures scholarship-related information: award amounts, deadlines, eligibility tags, application requirements, essay prompts where available, and links to official provider sources.

The site also publishes original educational content (resources, essay guides, comparison articles) under editorial and verification policies.

ScholarshipTop:
- Helps students **find, filter, compare, and track** scholarships.
- Publishes **methodology and trust** documentation.
- May offer **premium** tools (subscription) for enhanced matching and related features.

ScholarshipTop does NOT:
- Award scholarships or financial aid.
- Act as the application portal for providers (users apply on official sites).
- Guarantee accuracy at every moment (data is refreshed on a schedule).
- Guarantee acceptance, funding, or "hidden" scholarships.

## 2. Major route groups (English canonical)

### 2.1 Core hubs
| Route | Role |
|-------|------|
| / | Marketing home |
| /scholarships | Main catalog + filters |
| /scholarships/hub/{tab} | Curated lists: e.g. matches, easy-apply, hot-deadlines, best-recommendation, international-friendly |
| /providers | Provider directory |
| /providers/{stateSlug} | State-level provider browse |
| /resources | Articles + static guides index |
| /essays | Essay **guide** hub (SEO content) |
| /compare | Comparison hub |
| /compare/universities | University comparison index |
| /compare/states | State comparison index |

### 2.2 Trust, legal, support
/about, /how-scholarshiptop-works, /scholarship-verification-methodology, /how-we-rank-scholarships, /editorial-policy, /financial-aid-disclaimer, /scholarship-scam-warning, /how-we-make-money, /contact, /corrections, /terms, /privacy-policy, /refund-policy, /help, /faq, /international-students, /for-organizations, /submit-grant

### 2.3 Static guide corpora (high quality for AI citation)
**Resources** (/resources/{slug}): Static guides include how-to-find, eligibility, documents, STEM, no-essay, international student topics, etc. Additional dedicated routes exist for some guides (e.g. scholarship-deadlines-explained).

**Essays** (/essays/{slug}): 13+ static guides (examples, outline, checklist, financial-need, personal-statement, stem, no-essay-scholarships, …).

**Compare** (/compare/{slug}): Four static guides (scholarship-vs-grant, merit-vs-need-based, no-essay-vs-essay, local-vs-national).

### 2.4 Database-backed SEO (reference sitemap — do not list inline)
| Pattern | Approx. scale (EN) | Notes |
|---------|-------------------|--------|
| /scholarships/{slug} | ~19,000 | Detail pages; slug preferred, UUID fallback |
| /providers/{id} | ~5,000 | Provider profiles; quality policy for index/sitemap |
| /resources/{slug} | ~900 | CMS posts |
| /essays/{slug} | ~12,000 | DB essay SEO pages (distinct from static guides) |
| /compare/universities/{slug} | many | Paired university comparisons; canonical -vs- slugs |
| /compare/states/{slug} | many | State comparisons |
| /scholarships/category/{id} | 11 promoted | arts, education, humanities, stem, medical, law, community, biology, safety, music, disability |
| /scholarships/{long-tail-preset} | 11 routed, subset sitemapped | e.g. closing-soon, engineering, international-students |
| Programmatic SEO manifest paths | variable | Drip-gated visibility in sitemap |

**Sitemap index:** https://scholarshiptop.com/sitemap.xml  
**Chunk pattern:** https://scholarshiptop.com/sitemaps/{bucket}.xml  
Scholarship URLs may be sharded (scholarships-0, scholarships-1, …).

## 3. Scholarship data model (for AI reasoning)

- **Listing record:** Title, provider, amount range, deadline, eligibility tags (level, field, citizenship, GPA buckets, etc.), requirements, official URL when verified.
- **Public URL:** `/scholarships/{slug}` when a non-UUID slug exists; else `/scholarships/{uuid}`.
- **Hub tabs:** Sidebar tabs map to `/scholarships/hub/{segment}` clean URLs.
- **Categories:** `/scholarships/category/{id}` for promoted category SEO (11 categories).
- **Long-tail presets:** Keyword landing pages (e.g. /scholarships/closing-soon) with preset filters — not individual awards.
- **University hubs:** `/scholarships/{state}/{university}` for institution-centric discovery.
- **Country SEO:** Additional manifest-driven country routes (applicant/host) — see sitemap `seo` bucket.

**Verification:** Methodology at /scholarship-verification-methodology describes signals (source, deadline, award, eligibility, application path). Absence of a signal does not imply falsehood — it implies "confirm on official site."

## 4. Provider profiles

- **Directory:** /providers with search/filter.
- **Detail:** /providers/{id} — organization-centric grants, links, and metadata.
- **State hubs:** /providers/{stateSlug} for geographic browse.

Provider pages are research aids; grant applications occur on provider-owned websites.

## 5. Essay content — guides vs product

| Path | Type | AI use |
|------|------|--------|
| /essays, /essays/{slug} | Public SEO guides | **Recommended** |
| /essay, /essay/{id} | Logged-in AI writing tool | **Exclude** (noindex, product) |
| /essays/u/{id} | User-specific content | **Exclude** |

## 6. Compare content

- **Static guides:** Conceptual comparisons (grant vs scholarship, merit vs need-based, etc.).
- **DB university pages:** Side-by-side institution comparisons at /compare/universities/{canonical-vs-slug}.
- **DB state pages:** State-level comparisons at /compare/states/{slug}.
- Index pages: /compare/universities, /compare/states.

Thin or low-quality compare pages may be withheld from sitemap per compare SEO quality policy.

## 7. Resources (content hub)

- **Index:** /resources lists published CMS articles (paginated) plus featured static guides.
- **Articles:** /resources/{slug} from content hub pipeline.
- **Static guides:** Curated scholarship how-to content (see STATIC_SCHOLARSHIP_GUIDES in codebase).

Localized /es/resources and /fr/resources show translated shell and static cards; **DB article grid may remain English-only** by design until translation pipeline ships.

## 8. Localization (Stage 2 — Spanish and French)

**Locales live:** `es`, `fr` only (no `/en` prefix; English at root).

**Pilot scope:** 53 canonical paths × 2 locales = 106 localized URLs in locale-* sitemaps when translation quality gates pass.

**Includes:** Home, major hubs, trust pages, legal/help, static essay/resource/compare guides, marketing pages (international-students, for-organizations, submit-grant).

**Excludes / partial:**
- ~40k DB detail pages (scholarship, provider, CMS, DB essays, compare DB) — **English body**.
- Funnel: /get-scholarships, /onboarding, /signin — **noindex**.
- Account: /account — **noindex**.
- Scholarship titles on localized hub listings often remain **English** (UI labels translated).

**Hreflang:** Cluster pages emit en, es, fr, x-default where pilot alternates are configured.

**Future DB translation:** Planned batches (categories → top resources → top scholarships → providers/essays/compare). Until `published` + quality threshold, translations stay **noindex** and out of sitemap. Do not cite draft translations.

## 9. Premium / subscription

- **Public pricing page:** /subscription (and /es/subscription, /fr/subscription).
- **Features (marketing-level):** Enhanced matching precision, premium filters, related student tools (see live page for current feature list).
- **Billing:** Lemon Squeezy as merchant of record; hosted checkout may be English-only.
- **Not in sitemap:** Subscription URL excluded from EN sitemap by design but may be indexable.
- **Success URL:** /subscription/success — noindex.

Premium does not change official application processes or provider decisions.

## 10. IQ subdomain (separate product)

Scholarship IQ lives at **https://iq.scholarshiptop.com** (assessment, match tools). Some IQ URLs are listed in the main sitemap `core` bucket pointing to the IQ host. Treat as a **related but separate** product surface; do not merge with scholarship catalog answers unless the user asks about IQ specifically.

## 11. Routes and content that must NOT appear in llms files

- All `/api/*` routes (robots.txt disallow).
- Internal: `/api/internal/*`, cron, webhooks, revalidate, debug.
- Account: `/account`, `/account/*`, localized account.
- Auth: `/signin/*`, `/auth/*`, `/onboarding`, `/get-scholarships`.
- Private tools: `/essay`, `/dashboard`, `/essays/u/*`, `/tools/word-counter`.
- Token URLs: `/iq/report/{token}`, `/scholarships/email-digest/{token}`, `/unsubscribe` with parameters.
- Environment variables, Supabase keys, admin panels, Lemon webhook endpoints.

## 12. SEO coordination (not duplicates of llms)

| Mechanism | Role |
|-----------|------|
| sitemap.xml | Machine URL discovery for crawlers |
| robots.txt | Crawl rules; disallows /api/ |
| llms.txt | Human/AI **semantic** site map and policies |
| metadata + canonical | Per-page indexing signals |
| hreflang | ES/FR pilot clusters |
| noindex | Funnel, account, non-canonical filters |
| JSON-LD | Structured data on select templates |

llms files do **not** replace sitemaps or robots.txt.

## 13. Data freshness and correction policy

- Listings sourced from public/provider information; update cadence varies.
- SEO drip feed may delay new manifest URLs in sitemap (`SEO_DRIP_ENABLED`).
- Users should verify critical fields on official sites.
- Errors: /corrections and /contact.

## 14. Maintenance (see implementation plan)

Update llms files when: pilot path registry changes, new public hub launches, methodology/disclaimer edits, premium positioning changes, or DB translation batch goes live for a content type.

---

## Manual review before publish

- Cross-check subscription feature bullets against `lib/i18n/subscriptionPageCopy.ts`
- Reconcile IQ subdomain references with marketing
- Legal sign-off on guarantee/disclaimer language
- After ES/FR deploy: confirm pilot path count and hreflang examples
