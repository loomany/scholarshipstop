# D8 Static Enrichment V2 Preflight

This is the implementation preflight for D8 Wave 1 from the D7 roadmap.

## Scope

Build and wire three small aggregate outputs:

- `provider_nonprofit_enrichment.json`
- `institution_research_enrichment.json`
- `state_social_context.json`

## Source Resolution

Resolved inputs are recorded in:

- `reports/data/d8-resolved-input-files.csv`

All required D8 sources were found. Optional city/rent sources were resolved but held for later:

- `bls_metro`
- `zillow_zori`

## Read Policy

- Customer package read-only
- Stream-read JSONL/GZ sources
- Aggregate large sources before display
- No raw NIH project text, raw ProPublica filings, raw ADI block-group rows, or large source dumps shipped

## Implementation Policy

- Strict provider and institution matching
- Ambiguous provider nonprofit name/state matches hidden by loader
- School/university providers continue to prefer College Scorecard context
- State social copy stays neutral and does not create ScholarshipTop rules or guarantees
