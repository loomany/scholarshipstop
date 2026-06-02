# D7 - Max Data Reuse Roadmap

## Goal

Maximize reuse of the existing customer package while keeping the current ScholarshipTop architecture safe: small static JSON outputs, server-only loaders, conservative matching, no Supabase changes, and no SEO policy changes.

## Wave 1 - Already Safe / Static JSON Extension

Recommended next implementation wave.

1. **State/community context v2**
   - Add CDC SVI aggregate fields to `state_affordability` or a sibling static JSON.
   - Add ADI only after county/state/city aggregation.
   - Expand County Health Rankings beyond `counties_with_data` if a small neutral metric set is chosen.
   - Keep FBI wording neutral and non-ranking.

2. **Provider enrichment v1**
   - Add ProPublica Nonprofit for foundation/provider pages.
   - Add ROR/OpenAlex identity fields for institution pages.
   - Add USAspending only as scoped funding context with clear partial-coverage copy.

3. **University compare research signals**
   - Normalize OpenAlex/ROR `research_signal` into display-safe counts.
   - Add NIH RePORTER institution aggregates; never ship raw NIH projects.
   - Add source-year/source-method notes to current Scorecard cards.

4. **City affordability foundation**
   - Add BLS metro and Zillow ZORI normalized latest-rent/trend fields.
   - Keep this behind future city pages or university city sidebars.

## Wave 2 - Content Clusters

1. **State scholarship clusters**
   - Enrich state scholarship pages with affordability, income, wage, rent, and community context.
   - Add internal links to resource/essay pages already in the D5 graph.

2. **University scholarship clusters**
   - Add richer Scorecard, ROR/OpenAlex, and eventually NIH context.
   - Improve match confidence with `unit_id` or provider identity where available.

3. **Financial need / cost of college cluster**
   - Use Census, HUD, MIT, BLS, Scorecard net price, and scholarships by state.
   - Create data-backed examples on resources/essays.

4. **International student cluster**
   - Use school cost/outcome context and state affordability examples.
   - Avoid implying eligibility from external data.

5. **STEM / nursing / medical scholarship cluster**
   - Use BLS, HRSA HPSA, NIH/OpenAlex, and medical school sources only when the vertical has pages to support it.

## Wave 3 - Future Verticals

1. **Medical school scholarships**
   - WDOMS, LCME, AACOM, COCA, College Scorecard, admit.med stats.

2. **Pre-med resources**
   - Admissions stats, accreditation context, school directory facts, research/funding signals.

3. **Health workforce scholarship pages**
   - HRSA HPSA, BLS healthcare occupations, nursing/medical workforce context.

4. **School/provider comparison pages**
   - Medical school compare, provider research/funding compare, hospital/provider clusters.

## Wave 4 - New Datasets Later

Only after the customer package reuse pass is exhausted:

- Fresh official source recrawls.
- More city-level affordability datasets.
- Additional education datasets.
- Better official institution ID crosswalks.
- Updated source-specific permissions where blocked/manual sources are still gated.

## Guardrails

- Keep raw package files out of the site.
- Keep generated outputs small and typed.
- Aggregate huge files before display.
- Keep public-safety, health, SVI, and ADI wording neutral.
- Keep provider/school matching strict; hide uncertain matches.
- Do not change canonical, robots, sitemap, noindex, Supabase, Auth, Payments, RLS, or migrations as part of this roadmap.

## Suggested Next D Task

**D8 - Static Enrichment V2 Build Plan**

Produce a scoped implementation plan for three new tiny outputs:

1. `provider_nonprofit_enrichment.json`
2. `institution_research_enrichment.json`
3. `state_social_context.json`

Include exact source fields, row caps, matching keys, QA checks, display copy policy, and no raw-data shipping guarantees.
