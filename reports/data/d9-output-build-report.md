# D9 Output Build Report

Generated at: 2026-06-01T06:44:29.904Z

## Output

- File: `city_rent_metro_enrichment.json`
- Rows: 2,692
- Size: 2.67 MB

## Coverage

- Raw location rows: 2,704
- Base location rows after strict city_key dedupe: 2,692
- Duplicate location city keys hidden: 3
- city/state rows with existing affordability match: 2,688
- BLS metro rows read: 150,176
- BLS all-occupation metro rows used: 390
- BLS metro matched city rows: 518
- Zillow rows read: 4,432
- Zillow usable metro rows: 4,374
- Zillow matched city rows: 1,667
- Ambiguous city affordability keys hidden: 4
- Ambiguous BLS city/metro matches hidden: 0
- Ambiguous Zillow city/metro matches hidden: 0

## Examples

- Unmatched BLS examples: Normal, AL; Alexander City, AL; Athens, AL; Phenix City, AL; Enterprise, AL; Bay Minette, AL; Albertville, AL; Hanceville, AL
- Unmatched Zillow examples: Normal, AL; Alexander City, AL; Bay Minette, AL; Gadsden, AL; Albertville, AL; Selma, AL; Deatsville, AL; Tanner, AL
- Ambiguous BLS examples: none
- Ambiguous Zillow examples: none
- Ambiguous city affordability examples: Port St Lucie, FL; Winston-Salem, NC; Wilkes-Barre, PA; Bayamón, PR

## Source Files Used

- Existing local `city_affordability.json` for compact HUD FMR fields.
- Existing local `location_crosswalk.json` for city/state identity.
- Customer package `bls_metro.jsonl.gz` streamed read-only for all-occupation metro wage aggregates.
- Customer package `zillow_zori.jsonl.gz` streamed read-only for latest metro rent and 12-month change.

No raw customer package files, full BLS occupation tables, or full Zillow monthly series are shipped.
