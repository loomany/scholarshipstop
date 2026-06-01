# D8 Output Build Report

Generated at: 2026-05-31T20:58:46.838Z

## Outputs

| File | Rows | Size MB | Policy |
|---|---:|---:|---|
| `provider_nonprofit_enrichment.json` | 1,293 | 0.95 | aggregate/static only |
| `institution_research_enrichment.json` | 2,323 | 1.72 | aggregate/static only |
| `state_social_context.json` | 52 | 0.05 | aggregate/static only |

Total new output size: 2.72 MB.

## Matching And Aggregation

- Provider nonprofit: exact normalized organization name + state and EIN where available; ambiguous names are hidden by the loader.
- Institution research: Scorecard identity joined to OpenAlex/ROR ids, with NIH RePORTER aggregated by exact organization name + state.
- State social context: CDC SVI, ADI, and County Health data aggregated to state-level counts and neutral bands.
- No raw filings, NIH abstracts, project text, block-group rows, or source package files are shipped.
