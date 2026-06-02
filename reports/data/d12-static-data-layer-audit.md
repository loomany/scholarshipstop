# D12 Static Data Layer Audit

Date: 2026-06-01  
Path: `data/external/scholarshiptop-enrichment/`

## Summary

| Metric | Value |
|---|---:|
| JSON output files | 11 (+ MANIFEST.json, README.md) |
| Total rows (data files) | 20,454 |
| Total on-disk size | **10.58 MB** (11,098,970 bytes) |
| D7 baseline size | ~4.88 MB |
| Hard cap | 25 MB |
| Growth since D7 | +5.7 MB (D8 +2.72 MB, D9 +2.67 MB, D10 +0.32 MB) |

**Risk assessment:** Total size is well under cap. Largest single file is `school_enrichment.json` at 3.22 MB. No dangerous bloat; monitor if future verticals add more city/medical layers.

## JSON Outputs

| File | Rows | Size (KB) | Primary page surfaces |
|---|---:|---:|---|
| `school_enrichment.json` | 6,197 | 3,219.7 | `/compare/universities/[slug]`, `/providers/[id]` (school match), `/scholarships/[state]/[university]` |
| `state_affordability.json` | 52 | 45.5 | `/compare/states/[slug]`, `/scholarships/[state]`, state-aware `/resources/*` and `/essays/*` cards |
| `city_affordability.json` | 2,759 | 977.4 | Join layer for city/state context; university scholarship sidebars |
| `location_crosswalk.json` | 2,704 | 755.9 | Internal joins only (city/state/county/geocode) |
| `provider_nonprofit_enrichment.json` | 1,293 | 968.0 | `/providers/[id]` (non-school foundation/nonprofit strict match) |
| `institution_research_enrichment.json` | 2,323 | 1,765.9 | University compare, provider research signal, medical school aggregate research |
| `state_social_context.json` | 52 | 53.1 | `/compare/states/[slug]` neutral social/community planning context |
| `city_rent_metro_enrichment.json` | 2,692 | 2,733.0 | `/compare/universities/[slug]` city rent + metro wage cards (D9) |
| `medical_school_enrichment.json` | 321 | 266.5 | Medical guide, provider exact med-school match, career-goals card |
| `health_workforce_context.json` | 52 | 37.9 | Medical guide planning sections (state workforce/HPSA context) |
| `premed_topic_context.json` | 9 | 11.4 | Medical guide, career-goals essay, guarded dynamic resource/essay cards |

## Loader Architecture

- Single import surface: `lib/external-data/loadStaticEnrichment.ts` (`import 'server-only'`)
- Resolvers in `lib/external-data/*` build lazy indexes; ambiguous matches hidden
- UI components consume resolved context only — no raw JSON in client bundles

## Customer Package Sources Already Used

Represented in live static outputs (D1–D11 cumulative):

| Source group | Used in |
|---|---|
| College Scorecard | school, city, medical school identity |
| OpenAlex / ROR | school, institution research |
| Census ACS | state affordability |
| HUD FMR | state/city affordability |
| MIT Living Wage | state affordability |
| BLS state OEWS | state affordability, health workforce |
| FBI Crime (aggregate) | state affordability public-safety note |
| County Health Rankings | state affordability, state social context |
| US Cities / SimpleMaps | city crosswalk |
| GeoNames | location crosswalk |
| ProPublica Nonprofit | provider nonprofit (D8) |
| CDC SVI | state social context (D8) |
| ADI (state aggregate) | state social context (D8) |
| NIH RePORTER (aggregate only) | institution research (D8) |
| BLS metro (aggregate) | city rent/metro (D9) |
| Zillow ZORI (latest metro rent) | city rent/metro (D9) |
| WDOMS / LCME / COCA / AACOM | medical school enrichment (D10) |
| admit.med stats (strict match) | medical school enrichment (D10) |
| HRSA HPSA (state aggregate) | health workforce context (D10) |

## Customer Package Sources Not Yet Used

High-value deferred:

- Raw NIH RePORTER projects / abstracts
- USAspending (beyond partial D7 note; not in static outputs)
- VA facility list
- Block-level ADI (only state aggregate shipped)
- Full BLS occupation tables
- Full Zillow monthly series (only latest metro snapshot used)

Medical/residency vertical only (intentionally excluded):

- FREIDA, NRMP, ACGME, MedMap, ResidencyAdvisor
- Board pass rates, CMS hospital quality, NPPES, Open Payments
- Residency program directories

Blocked / needs approval:

- Manual-gated or blocked sources per D7 matrix (no raw package copies)

## Safety Checks

| Check | Result |
|---|---|
| `C:\dev\adek` paths in JSON | **None found** |
| Secrets / API keys in JSON | **None** (validator passed) |
| Raw JSONL / GZ / CSV dumps in folder | **None** |
| Raw customer package copied into repo | **No** |
| Supabase writes from enrichment pipeline | **No** |

## Duplicate / Ambiguity Warnings (documented)

- 40 school name+state duplicate keys (loader resolves conservatively)
- 1 city duplicate: Bayamón, PR
- 29 ambiguous nonprofit name+state keys hidden by loader

## Verdict

**PASS** — static layer is typed, server-only, within size budget, and scoped to display-safe aggregates.
