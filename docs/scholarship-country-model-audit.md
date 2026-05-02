# Scholarship Country Model Audit

Date: 2026-05-02

## Goal

Separate two concepts before adding country/location chips to scholarship cards:

- Applicant eligibility: who can apply (`applicant_country_codes`).
- Grant location/origin: where the opportunity is based (`host_country_codes`, `state_codes`).

`Countries` in the UI must remain an applicant eligibility filter, not a grant-location filter.

## Current Field Coverage

Audited `scholarships_listing_view`.

- Total scholarships: 15,999
- With applicant country codes: 2,003
- With host country codes: 1,306
- With state codes: 3,659
- Empty applicant country codes: 13,996
- US-context scholarships: 4,395

International Friendly subset:

- Total: 584
- With applicant country codes: 216
- With host country codes: 235
- With state codes: 19
- US-context: 134

## Important Finding

Many rows with empty `applicant_country_codes` are not truly "no country restriction listed".

Risk scan over active scholarships with empty applicant country codes found many texts with citizenship/residency language, for example:

- `Resident of the U.S.`
- `U.S. residents may apply`
- `Resident of the U.S. Attend Loyola University Chicago`

The previous parser missed `Resident of the U.S.` because the `U.S.` punctuation cut off the captured country phrase. This made some US-resident-only grants look structurally open/unspecified.

## Parser Fix

Updated `parseScholarshipCountryEligibility` to recognize:

- `Resident of the U.S.`
- `U.S. residents`
- `study in the U.S.` as host-country signal

Added parser tests for:

- U.S. resident applicant eligibility.
- Separate applicant country vs host country signals.

Updated parser dry-run impact:

- Scanned active scholarships: 15,997
- Any updates: 5,846
- Applicant country updates: 5,826
- Host country updates: 23

This was large enough that production backfill was handled as a deliberate separate step.

Verbose dry-run sample (`--limit=80 --verbose`) showed 28 proposed updates. The sampled updates are mostly clear `US` applicant eligibility additions, with `country_eligibility_notes: ['applicant country text']`, for grants such as:

- Grace Englebert Memorial Scholarship
- Ruth Cobb Arnold Endowed Education Scholarship
- Mason-Krause Scholarship USA 2026 Apply
- Empowering Women through STEM Grant

These samples supported the parser fix, but the full backfill required explicit approval because it changes thousands of listing/filter records.

## Backfill Applied

Approved backfill was applied on 2026-05-02.

Post-backfill coverage:

- Total scholarships: 15,999
- With applicant country codes: 7,792
- With host country codes: 1,317
- With state codes: 3,659
- Empty applicant country codes: 8,207
- Applicant includes US: 7,258
- US-context scholarships: 4,404

International Friendly subset:

- Total: 584
- With applicant country codes: 306
- With host country codes: 237
- With state codes: 19
- US-context: 134

Validation dry-run on the first 1,000 active scholarships returned `Would update: 0`.

## Decision Table

Applicant badge:

- Selected country matches `applicant_country_codes`: show `For {selected country}`.
- Selected country does not match: the card should not be present under that country filter.
- No selected country and exactly one applicant country: show `For {country}`.
- No selected country and multiple applicant countries: show `Open to many countries`.
- Empty applicant country: do not show a card-level `Open to many countries` badge until backfill/cleanup is applied.

Grant location chip:

- `host_country_codes` includes `US`: show `US-based`.
- `state_codes` present: show `US-based`.
- One non-US host country: show `Hosted in {country}`.
- Multiple host countries without US: show `{N} host countries`.
- Empty/ambiguous host fields: show no location chip.

## Implementation Order

1. Keep the parser fix and tests.
2. Continue treating any future broad backfill as an explicit approval step.
3. Add compact card chips in `ScholarshipCard`.
4. Keep `Countries` filter semantics unchanged: it means student citizenship/home country eligibility.
