# ScholarshipTop static enrichment data

These JSON files are read-only static data for ScholarshipTop compare pages,
scholarship hubs, provider profiles, resource pages, and essay context cards.

## Guardrails

- Permission status: `permission_received_per_user_statement`
- Customer package is read as a source package only; it is not copied into the site
- Outputs are small, typed, static JSON files
- No Supabase writes, migrations, Auth changes, Payments changes, or SEO policy changes
- No raw customer package files, raw filings, NIH project abstracts, grant text, ADI
  block-group rows, or large JSONL/GZ/CSV dumps are shipped here

## Files

| File | Rows | Purpose |
|------|------:|---------|
| `school_enrichment.json` | 6,197 | College Scorecard plus optional OpenAlex/ROR joins |
| `state_affordability.json` | 52 | Census ACS, HUD FMR, MIT living wage, BLS, FBI aggregate context |
| `city_affordability.json` | 2,759 | City-level affordability and location context |
| `location_crosswalk.json` | 2,704 | City/state/county join keys |
| `provider_nonprofit_enrichment.json` | 1,293 | ProPublica Nonprofit context for strict non-school provider matches |
| `institution_research_enrichment.json` | 2,323 | OpenAlex/ROR identity plus NIH aggregate research context |
| `state_social_context.json` | 52 | CDC SVI, ADI, and County Health neutral state-level context |

Total on-disk size is about 7.60 MB.

## Regenerating

The Stage A files come from the original static enrichment pipeline. D8 static
enrichment V2 outputs are generated with:

```bash
npx tsx scripts/data/build-static-enrichment-v2.ts
npm run data:validate-enrichment
```

Use helpers from `@/lib/external-data` in server components or scripts only.
The loaders build lazy indexes and hide ambiguous provider/school matches.
