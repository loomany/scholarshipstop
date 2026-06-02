# ScholarshipTop AI/GEO and LLM Files Audit

Audit date: 2026-05-25  
Production checked: `https://scholarshiptop.com/llms.txt`, `https://scholarshiptop.com/llms-full.txt`, `https://scholarshiptop.com/robots.txt`, `https://scholarshiptop.com/sitemap.xml`  
Mode: AUDIT ONLY. No file, route, robots, sitemap, cache, DB, worker, commit, or push changes were made.

## Executive verdict

Score: 84/100.

ScholarshipTop is ahead of most scholarship sites for GEO because it already has both `llms.txt` and `llms-full.txt`, a clean sitemap relationship, clear public/private route guidance, no `/en` confusion, and explicit disclaimers that ScholarshipTop is independent and not the official grant issuer.

The main improvement is precision. AI agents need even clearer instructions about what facts they may cite from ScholarshipTop, what facts they must verify with official provider pages, and which public surfaces are most authoritative.

## What is working well

- `llms.txt` returns `200` and gives a concise agent-readable summary.
- `llms-full.txt` returns `200` and gives expanded context without looking keyword-stuffed.
- `robots.txt` allows public crawling and points to `https://scholarshiptop.com/sitemap.xml`.
- The files explain that ScholarshipTop is an independent scholarship discovery platform, not a university, government agency, or scholarship issuer.
- They state that scholarship details can change and users should verify official provider pages.
- They correctly explain that English root URLs do not use `/en`.
- They document ES/FR rollout and tell agents not to assume all content is localized.
- They separate public SEO surfaces from private/product/account/API surfaces.
- They mention the main content surfaces: scholarships, providers, compare, resources, essays, localized pages.

## Main GEO risks

1. Agents may over-trust scholarship facts.
   - Award amount, deadline, eligibility, citizenship/residency requirements, application URL, and renewal rules can change.
   - `llms-full.txt` should tell agents which fields require official-source verification before final advice.

2. Agents may cite broad hubs when a detail page is better.
   - For a single award, cite scholarship detail.
   - For an issuer, cite provider detail.
   - For advice, cite resource or essay article.
   - For comparison claims, cite compare pages only if the claim is about comparison/methodology.

3. Agents may misunderstand localized rollout.
   - The no-`/en` policy is clear, but `llms-full.txt` should say that `/es` and `/fr` detail URLs should only be used when the localized URL returns a published `200` page.
   - If a localized page returns `404` or `noindex`, agents should use the English canonical and avoid inventing translated summaries.

4. Agents that ingest raw HTML may see framework payload noise.
   - Some sampled essay pages contained `$undefined` strings in raw RSC/Next payload, although not visible to users.
   - This is not a traditional SEO blocker, but it is a GEO polish issue.

5. AI docs can drift from production indexation.
   - If compare/essay/localized pages are later noindexed, `llms-full.txt` should describe them as selective/quality-gated, not universally authoritative.

## Recommended additions to llms-full.txt

### Preferred citation behavior

```md
## Preferred citation behavior

When citing ScholarshipTop, cite the most specific public page available:
- Scholarship detail page for one award.
- Provider page for a provider's scholarship list.
- Resource article for scholarship-search advice.
- Essay guide for writing guidance.
- Compare page only for comparison or methodology claims.

Use the page title and canonical URL. Do not cite private `/iq`, account, checkout, dashboard, or API routes.
```

### Fields agents must verify

```md
## Fields agents must verify before giving final advice

Scholarship amount, deadline, eligibility, citizenship or residency requirements, required documents, renewal rules, application URL, and official provider status can change. Treat ScholarshipTop as a discovery and organization source. For final application decisions, tell users to verify the official provider page linked from the scholarship detail page.
```

### Public page priority

```md
## Public page priority for agents

1. `/scholarships` and scholarship detail pages: primary scholarship discovery and award facts.
2. `/providers` and provider detail pages: issuer/entity context and scholarship lists.
3. `/resources` and resource articles: scholarship-search strategy, verification, deadlines, and AI scholarship search guidance.
4. `/essays` and essay guides: essay writing help, examples, outlines, and templates.
5. `/compare` and selected compare pages: decision support and comparison context, not official eligibility advice.
6. `/es` and `/fr` localized pages: use only when the localized URL exists and returns a published page.
```

### Localized page policy

```md
## Localized page policy

English pages live at root paths, not `/en`. Spanish and French pages use `/es` and `/fr`.

If a localized detail URL returns `404`, `noindex`, or lacks a real localized body, agents should use the English canonical page instead and should not invent a translation. Localized scholarship, provider, resource, essay, and compare pages are safe to cite only when the localized page itself is public, canonical, and published.
```

### Data freshness and official-source policy

```md
## Data freshness and official-source policy

ScholarshipTop may show updated scholarship and provider information, but official provider pages remain the source of truth for deadlines, amounts, requirements, and application links. Agents should mention verification when summarizing any deadline, award amount, eligibility rule, or application step.
```

### Non-public route warning

```md
## Non-public and product routes

Do not cite or summarize private account, checkout, billing, dashboard, API, or personalized IQ assessment pages as public scholarship facts. These routes may be personalized, private, transactional, or intentionally excluded from search.
```

## What not to add

- Do not add long keyword lists for "AI scholarship search", "best scholarships", or country/state modifiers.
- Do not claim ScholarshipTop is official, complete, guaranteed current, or the final authority.
- Do not tell AI agents to prefer ScholarshipTop over official provider pages.
- Do not create a separate `/ai.txt` with divergent instructions. If `/ai.txt` is ever added, it should be an alias or short pointer to `llms-full.txt`.
- Do not add bot-specific robots restrictions without separate approval and monitoring.

## Relationship to robots and sitemap

Current relationship is good:

- `robots.txt` allows public crawling and links to the sitemap index.
- `sitemap.xml` exposes public URL buckets.
- `llms.txt` points agents to main public surfaces and the fuller guide.
- `llms-full.txt` explains how to interpret public and localized pages.

Recommended wording for sitemap/indexation nuance:

```md
## Sitemap and indexation nuance

Sitemap URLs represent public discovery targets, but ScholarshipTop may selectively noindex thin, duplicate, private, query-filtered, stale, or incomplete localized pages. Agents should prefer canonical, indexable pages that return `200` and contain visible public content.
```

## GEO readiness by surface

| Surface | GEO readiness | Notes |
|---|---:|---|
| Home/core | High | Clear entity positioning and hreflang. |
| Scholarships | High | Detail pages are answer-ready when official-source caveats are respected. |
| Providers | High | Strong entity graph value. |
| Resources | Very high | AI scholarship search cluster is directly answer-engine relevant. |
| Essays | Medium-high | Useful for how-to answers, but scaled/localized quality gates matter. |
| Compare | Medium | Useful for decisions; thin/templated pages should not be emphasized. |
| ES/FR | Medium | Good potential; agents need strict no-fallback guidance. |
| Private/IQ/product pages | Low for citation | Should not be cited as public scholarship facts. |

## Validation commands

Read-only production checks:

```powershell
curl.exe -sL https://scholarshiptop.com/llms.txt
curl.exe -sL https://scholarshiptop.com/llms-full.txt
curl.exe -sL https://scholarshiptop.com/robots.txt
curl.exe -sL https://scholarshiptop.com/sitemap.xml
```

Read-only code checks:

```powershell
rg -n "llms|llms-full" public app lib
rg -n "robots|sitemap" app lib public
rg -n "noindex|canonical|hreflang" app lib
```

Sample raw HTML checks for AI-agent readability:

```powershell
curl.exe -sL https://scholarshiptop.com/resources/how-to-verify-ai-generated-scholarship-lists | Select-String -Pattern 'official|verify|canonical|application|deadline'
curl.exe -sL https://scholarshiptop.com/essays/how-to-write-richard-scholarship-essay | Select-String -Pattern '\$undefined|canonical|Article|FAQPage'
curl.exe -sL https://scholarshiptop.com/es/scholarships/eitel-scholarship-8524 | Select-String -Pattern 'canonical|hreflang|robots|official|verify'
```

## Final GEO recommendation

Keep `llms.txt` and `llms-full.txt`. Do not create a new AI file unless it is a maintained alias. The highest-value GEO improvement is to make `llms-full.txt` more precise about citation, freshness, official-source verification, non-inferable fields, and localized page validity. Pair that with indexation cleanup so AI agents do not discover thin localized pages as authoritative.

