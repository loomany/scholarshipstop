# D7 - Missed Quick Wins

## Executive Summary

The current site already uses the safest static data layer, but several customer package sources can still produce high-value blocks without copying raw data or changing Supabase. The best next move is to extend the existing small-output model with aggregate JSON additions.

## Top 10 Missed Opportunities

1. **CDC SVI state/county context:** add neutral social vulnerability summaries to state/city planning blocks. Current `state_affordability.social_vulnerability_context` is null.
2. **ADI aggregation:** aggregate block-group ADI to county/city/state before display; use for community context, never for rankings or eligibility.
3. **ProPublica Nonprofit provider cards:** give foundation/provider pages EIN, nonprofit category, revenue/assets ranges, ruling year, and filing availability.
4. **NIH RePORTER institution aggregates:** add project/funding counts by institution for university compare and provider pages; ship aggregate-only JSON, not raw projects.
5. **OpenAlex/ROR normalization:** turn `research_signal` into friendly works/citations/identity fields instead of a raw object-like signal.
6. **BLS metro wages:** use metro wage estimates on future city pages and university pages where city/metro matching is confident.
7. **Zillow ZORI rent trends:** add latest-rent and 12-month trend for city/metro pages after normalizing the wide monthly series.
8. **County Health Rankings metrics:** current site only uses county-data availability; add a small set of neutral county/state indicators if display policy permits.
9. **USAspending funding context:** add a clearly scoped federal funding block for matched providers; label partial THCGME scope.
10. **Medical school data cluster:** WDOMS/AACOM/LCME/COCA/admit.med can power pre-med and medical-school scholarship pages later.

## State / City Pages

Potential sources: FBI crime, County Health Rankings, CDC SVI, ADI, BLS, HUD, MIT, Census, Zillow ZORI, US Cities, GeoNames.

Recommended additions:

- State planning context: income, rent, living wage, wage, public-safety context, county health/SVI availability.
- Student affordability: HUD/MIT/Zillow/BLS examples for planning cost of attendance and part-time work realities.
- Public safety: keep the existing neutral wording; no safe/unsafe ratings.
- Community/social context: CDC SVI and ADI only after aggregation and careful copy.

Quick wins:

- Add `social_vulnerability_context` to `state_affordability.json` from CDC SVI state/county aggregates.
- Add `adi_context` as state/county percentile bands, not raw block-group rows.
- Add `bls_metro` and `zillow_zori` to a future `city_affordability_v2.json`.

## Provider Pages

Potential sources: ProPublica Nonprofit, ROR, OpenAlex, USAspending, College Scorecard.

Recommended additions:

- Provider credibility block for foundations/nonprofits that currently fail College Scorecard matching.
- Institution identity block: ROR ID, official aliases, homepage, OpenAlex institution type.
- Research/funding block: OpenAlex works/citations, NIH aggregate, USAspending aggregate where matched.

Quick wins:

- Add `provider_nonprofit_enrichment.json` from ProPublica for foundation/provider pages.
- Add `provider_research_enrichment.json` from OpenAlex/ROR/NIH aggregates.
- Keep strict matching; hide blocks when identity is ambiguous.

## University Compare

Potential sources: College Scorecard, OpenAlex, ROR, NIH RePORTER.

Recommended additions:

- Normalize current OpenAlex `research_signal` into `works_count` and `cited_by_count` cards.
- Add ROR official identity/alias metadata to explain matches.
- Add NIH funding/project aggregate as optional research signal.
- Add source year and source quality notes to current Scorecard cards.

## Resources / Essays

Potential sources: Census, BLS, HUD, MIT, state context, school context.

Recommended additions:

- Financial need resources: state examples for rent/living wage/net price.
- Career goals essays: BLS wage/employment examples by state/field.
- International student resources: school cost/outcome examples and state affordability snippets.
- Keep generic resource/essay pages hidden unless the topic has explicit state/school context.

## Future Medical / School Vertical

Potential sources: WDOMS, AACOM, LCME, COCA, admit_med_school_stats, NIH, OpenAlex, HRSA HPSA.

Recommended additions later:

- Medical school scholarship pages.
- Pre-med scholarship/resource pages.
- Medical school provider pages.
- Health workforce scholarship clusters.
- Compare pages for MD/DO schools.

## Do Not Implement In D7

- Do not add UI blocks now.
- Do not copy the raw customer package into the site.
- Do not ship huge NIH/HRSA/FBI/ADI raw files.
- Do not add `Dataset`/`DataCatalog` JSON-LD until visible page content supports it.
- Do not use blocked/manual sources until access/export status is resolved.
