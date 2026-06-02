# D7 - Current Data Usage Summary

**Scope:** Max data reuse audit for the MedResidency/customer data package against the current ScholarshipTop site.

**Repo path used:** `C:\dev\scholarshipstop` (the TZ path says `scholarshiptop`, but the actual local repo directory is `scholarshipstop`).

**Customer package:** `C:\dev\adek\customer_package\medresidency_data_package_2026-05-29`

**Permission note:** data use is treated as `permission_received_per_user_statement`. Private permission emails were not copied or quoted.

## Current Static Outputs On Site

ScholarshipTop currently uses a small server-only static enrichment layer, not the full customer package:

| Output | Rows | Current purpose | Source package inputs represented |
|---|---:|---|---|
| `data/external/scholarshiptop-enrichment/school_enrichment.json` | 6,197 | School matching, university compare, provider/scholarship university context | College Scorecard, OpenAlex, ROR |
| `data/external/scholarshiptop-enrichment/state_affordability.json` | 52 | State affordability, wage, neutral public-safety, and light health availability context | Census ACS, HUD FMR, MIT Living Wage, BLS state OEWS, FBI Crime, County Health Rankings |
| `data/external/scholarshiptop-enrichment/city_affordability.json` | 2,759 | City/state affordability join layer | US Cities/SimpleMaps, College Scorecard cities, HUD FMR |
| `data/external/scholarshiptop-enrichment/location_crosswalk.json` | 2,704 | City/state/county/lat-lng/geocode joins | US Cities/SimpleMaps, GeoNames, College Scorecard cities |

Total static data on disk is about 4.88 MB. Loaders are server-only in `lib/external-data/loadStaticEnrichment.ts`.

## Already Used Customer Sources

11 unique source groups are already represented in live site outputs:

1. `college_scorecard`
2. `openalex`
3. `ror`
4. `census_acs`
5. `hud_fmr`
6. `mit_living_wage`
7. `bls_state_oes`
8. `fbi_crime`
9. `county_health_rankings`
10. `uscities` / SimpleMaps deliverable
11. `geonames`

Note: `uscities` is present in deliverables and static outputs but not as a standalone row in `source_status_matrix.csv`; D7 adds it to the master matrix as a supplemental required source.

## Pages Currently Using The Data

| Page type | Current usage |
|---|---|
| `/compare/states` | Coverage teaser from `state_affordability` stats |
| `/compare/states/[slug]` | Median income, HUD FMR 2BR, living wage, BLS wage, neutral FBI public-safety context |
| `/compare/universities` | Coverage teaser from `school_enrichment` stats |
| `/compare/universities/[slug]` | College Scorecard tuition/outcomes/enrollment, optional OpenAlex/ROR research signal |
| `/providers/[id]` | Strict College Scorecard school match; hidden for foundations/non-school providers |
| `/resources/[slug]` | State/school planning context only when resolver finds a confident match |
| `/essays/[slug]` | Same guarded context path as resources; generic essays remain hidden |
| `/scholarships/[state]` | State affordability sidebar with income, rent, living wage, BLS wage |
| `/scholarships/[state]/[university]` | School cost context plus state affordability sidebar when strict match succeeds |
| Internal links | Centralized D5 graph links among scholarship, compare, provider, resource, and essay pages |
| Structured data | D6 shared JSON-LD; provider pages can include `EducationalOrganization` when Scorecard school match is visible |

## Outputs Already Connected

- `lib/external-data/*` server-only loaders/resolvers
- `components/compare/CompareExternalStateAffordabilitySection.tsx`
- `components/compare/CompareExternalSchoolEnrichmentSection.tsx`
- `components/compare/CompareHubExternalDataTeaser.tsx`
- `components/providers/ProviderExternalSchoolContext.tsx`
- `components/content-hub/ExternalReferenceContextCard.tsx`
- `components/resources/ResourceExternalContextCard.tsx`
- `components/essays/EssayExternalContextCard.tsx`
- `components/scholarships/ScholarshipStateExternalContextSidebar.tsx`
- `components/scholarships/ScholarshipUniversityExternalContextSidebar.tsx`
- `components/data-viz/*` stat/grid/bar components
- D5 internal link graph
- D6 shared JSON-LD helpers

## Sources Still Underused Or Not Considered Enough

High-value not-yet-used or underused sources:

- `cdc_svi`: present in package, but `social_vulnerability_context` is currently null in the static state output.
- `adi`: strong social context source, but block-group data needs aggregation before display.
- `bls_metro`: city/metro wage layer is not in the current static output.
- `zillow_zori`: rent trend layer is not in the current static output; HUD is currently used instead.
- `propublica_nonprofit`: ideal for foundation/provider context, currently not wired.
- `nih_reporter`: huge research funding layer; needs aggregate-only output before site use.
- `usaspending_fy2025_thcgme_recipients`: partial but useful for funding context.
- `hrsa_hpsa`: useful for future health workforce/nursing/medical scholarship clusters.
- `va_facility_list`: future provider/medical clusters.
- `wdoms_us_medical_schools`, `aacom_osteopathic_medical_schools`, `lcme`, `coca`, `admit_med_school_stats`: future medical school vertical.

## Sources Not Suitable For Current General ScholarshipTop

- Residency program directories, board pass data, match/fellowship directories, ACGME/NRMP/FREIDA program data: useful only for a future medical/residency vertical.
- Hospital quality/clinical/provider datasets: useful only if ScholarshipTop launches medical/provider clusters.
- Blocked/manual sources: do not use until access/export/legal status is resolved.
- Page aggregate rows: downstream computed concepts, not reusable source files.
