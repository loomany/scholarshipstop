# D8 Validation Report

## Current Results

- `npm run data:validate-enrichment`: pass
- `npx tsc --noEmit`: pass
- `npm run seo:validate-jsonld`: pass
- `npm run build`: pass

## Data Validation Notes

- 7 static outputs validated
- Total static data size: 7.60 MB
- No `C:\dev\adek` paths in final JSON
- No secret-like strings detected
- Manifest row counts match
- Known Stage A duplicate warnings remain:
  - school name+state duplicate keys: 40, hidden by strict loaders
  - city `Bayamon|PR` duplicate key, documented in Stage A
- New provider nonprofit ambiguous name+state keys: 29, hidden by the provider nonprofit loader

## D8 Output Counts

- `provider_nonprofit_enrichment.json`: 1,293 rows, 0.95 MB
- `institution_research_enrichment.json`: 2,323 rows, 1.72 MB
- `state_social_context.json`: 52 rows, 0.05 MB

## Policy Checks

- No Supabase writes
- No migrations
- No Auth/Payments changes
- No canonical/robots/sitemap/noindex policy changes
- No raw huge files copied

## Build Notes

- `next build --experimental-app-only` compiled successfully
- 206 static pages generated
- No D8 changes to JSON-LD schema shapes beyond existing validation surface
