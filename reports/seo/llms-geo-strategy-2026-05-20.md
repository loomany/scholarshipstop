# GEO / AI visibility strategy — `/llms.txt` for ScholarshipTop (2026-05-20)

**Audit only.**

---

## What AI systems might use this file?

| Consumer type | Likelihood | Notes |
| --- | --- | --- |
| LLM crawlers / "llms.txt" adopters | Medium | Emerging convention (similar early-stage uptake as robots.txt extensions) |
| RAG / search-augmented products that prefetch site context | Medium–High | Explicit site brief reduces hallucinated roles |
| Perplexity / Bing / Google AI Overviews | Low–Uncertain | No public guarantee they read `llms.txt`; rely on crawl + schema + brand |
| ChatGPT browsing / training policies | Low for training | May help **live browsing** sessions if fetched |
| Internal ScholarshipTop agents | High (if adopted) | Useful for consistent support copy |

**Realistic improvement:** Better **entity understanding** (what the site is), **safer answers** (disclaimers), and **URL selection** (trust pages vs account API). Not a ranking lever.

---

## What `/llms.txt` can realistically improve

1. **Correct categorization** — "aggregator/research" vs "scholarship provider."
2. **Citation quality** — Points models to methodology, editorial policy, static guides.
3. **Harm reduction** — Official-source verification, no guaranteed acceptance.
4. **Locale clarity** — English root, ES/FR pilot scope, no fake full-site translation claims.
5. **Privacy** — Explicit exclusion of `/api/`, account, billing flows.

---

## What it cannot guarantee

- Higher Google rankings or AI Overview inclusion
- Inclusion in model training corpora
- Freshness of DB fields (must pair with on-page content + sitemaps)
- Control over third-party citations
- Replacement for Schema.org, E-E-A-T pages, and brand mentions

---

## How it differs from sitemap.xml and robots.txt

| File | Primary audience | Content | ScholarshipTop today |
| --- | --- | --- | --- |
| **robots.txt** | Crawlers | Allow/disallow rules | Allows `/`, disallows `/api/`, points to sitemap |
| **sitemap.xml** | Crawlers | URL list with lastmod | ~40k+ URLs, bucketed, drip-gated |
| **llms.txt** | LLMs / researchers | Semantic map, policies, recommended URLs | **Not deployed** |

Sitemap answers "what URLs exist?"  
llms.txt answers "what is this site, what should you trust, what should you avoid?"

---

## Coordination with existing SEO stack

| Layer | Coordination |
| --- | --- |
| **sitemap.xml** | llms.txt links to index; does not duplicate URL lists |
| **robots.txt** | Optional `Allow: /llms.txt` (default allow); no need to Disallow |
| **metadata** | llms complements title/description; no conflict |
| **schema / JSON-LD** | Keep FAQ/Organization on pages; llms is not structured data |
| **canonical / hreflang** | llms states EN at root, ES/FR prefixes; aligns with `getLocalizedCanonical` |
| **noindex rules** | llms documents funnel/account; prevents model treating noindex as "secret truth" |
| **ES/FR pilot** | llms describes 53-path pilot; matches `STAGE2_PILOT_CANONICAL_PATHS` |
| **Future DB translation** | Update llms when batches publish; reference `translationPolicy` gates |

---

## Recommendations

### A. Immediate GEO wins (ship with v1 llms.txt)

| Action | Impact |
| --- | --- |
| Clear site definition + what site is **not** | Reduces provider/award hallucinations |
| Link verification methodology + financial disclaimer | Trust + compliance |
| List core hubs + trust pages | Better citations |
| State ES/FR pilot scope + English DB bodies | Prevents overclaiming translation |
| Explicit private/API exclusions | Privacy + security |
| Link `sitemap.xml` | Discovery without 40k inline URLs |
| Ship `llms-full.txt` linked from compact file | Depth for context-rich agents |

### B. Medium-term GEO wins (content + product, not just llms)

| Action | Impact |
| --- | --- |
| **AI summary** trust page ("About ScholarshipTop for AI assistants") | Human + machine readable |
| Expand methodology with data refresh SLAs | Freshness trust |
| Provider/source trust explainer | Entity authority |
| FAQ consistency across home, FAQ, schema | Entity graphs |
| Translated ES/FR summaries for pilot pages (already largely done) | Locale answers |
| Fix hub tab hreflang (optional SEO pass) | Locale cluster completeness |
| `/resources` DB grid localization (when ready) | FR/ES resource answers |

### C. Long-term GEO wins

| Action | Impact |
| --- | --- |
| DB translation pipeline with quality gates | Localized scholarship answers |
| Public glossary (award types, eligibility terms) | Structured definitions |
| Consistent Provider schema on profiles | Knowledge graph |
| IndexNow + GSC monitoring for AI referrers | Measurement |
| Brand SERP + Wikidata/Knowledge Panel (if applicable) | Off-site entity |

---

## Measurement (post-deploy)

- Server logs: requests to `/llms.txt`, `/llms-full.txt`
- Referrers from AI crawlers (if identifiable)
- GSC: indexed/not indexed status of llms URLs
- Qualitative: manual prompts in ChatGPT/Perplexity/Claude about "What is ScholarshipTop?"
- Track `/corrections` volume (should not spike from bad AI advice)

---

## Language strategy for llms.txt

**Recommendation: Option A — English-only `/llms.txt` and `/llms-full.txt`**, with a dedicated **Supported languages** section documenting `/es` and `/fr` pilot scope.

| Option | Verdict |
| --- | --- |
| A: Only `/llms.txt` (EN) + mention `/es`, `/fr` | **Recommended** |
| B: `/es/llms.txt`, `/fr/llms.txt` | Defer — doubles maintenance; pilot paths change |
| C: `/llms-es.txt`, `/llms-fr.txt` | Defer — nonstandard paths, easy to stale |

**Rationale:**

- AI guidance is operational/policy text — English is the team's authoring language and matches methodology source docs.
- Localized **page content** already exists for 53 paths; llms files describe **where** that content lives, not duplicate it.
- Localized llms files would need translation QA, version sync, and legal review on disclaimers — high risk for Stage 2.
- **Wait for DB translation** before localized llms variants; then consider a short ES/FR addendum file or section block generated from the same source strings as `financial-aid-disclaimer` translations.

**Avoid stale translations:** Single EN source of truth; `Last-Updated` header; CI check that llms mentions match `STAGE2_PILOT_CANONICAL_PATHS` count; update only on route registry or policy changes.

---

## SEO safety (summary)

See implementation plan for full table. Short answer:

- **Indexable:** Yes (fine as low-value plain text); optional `noindex` if you prefer not to show in SERPs — not required.
- **Sitemap:** Do **not** add (not a content page for users).
- **robots.txt:** No change required; `/api/` already disallowed.
- **Content-Type:** `text/plain; charset=utf-8`
- **Implementation:** `public/llms.txt` static (recommended)
- **Thin content risk:** Minimal — plain text policy file, not duplicate of HTML pages
- **Security risk:** Low if exclusion list is enforced in review
