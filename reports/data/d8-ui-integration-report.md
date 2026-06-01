# D8 UI Integration Report

## Routes Improved

- `/providers/[id]`
- localized provider profile component shared by provider routes
- `/compare/universities/[slug]`
- `/scholarships/[state]/[university]`
- `/scholarships/[state]`
- `/compare/states/[slug]`
- resource and essay context cards when strict state/school context already resolves

## Components Added

- `components/providers/ProviderNonprofitContext.tsx`
- `components/data-viz/InstitutionResearchContext.tsx`
- `components/data-viz/StateSocialContextBlock.tsx`

## Components Updated

- `components/providers/ProviderExternalSchoolContext.tsx`
- `components/providers/LocalizedProviderProfilePage.tsx`
- `app/providers/[id]/page.tsx`
- `components/compare/CompareExternalSchoolEnrichmentSection.tsx`
- `components/compare/CompareExternalStateAffordabilitySection.tsx`
- `components/scholarships/ScholarshipUniversityExternalContextSidebar.tsx`
- `components/scholarships/ScholarshipStateExternalContextSidebar.tsx`
- `components/content-hub/ExternalReferenceContextCard.tsx`
- `components/data-viz/DataSourceFooter.tsx`

## Matching Rules In UI

- Provider nonprofit card appears only when `matchProviderToSchool` does not find a Scorecard school and nonprofit name+state match is unique.
- Research cards use unit id, ROR id, OpenAlex id, or exact school name+state.
- State social context uses state code/name only after the existing page resolver has a clear state.
- Generic pages remain clean because resource/essay cards still depend on existing strict content context detection.

## Display Copy

- Provider copy: "Public nonprofit context"
- Research copy: "Research and institution context"
- State/social copy: "Public planning context"
- Source footers describe aggregate/static data and avoid claiming ScholarshipTop rules or guarantees.

## Risks

- ProPublica source coverage is medical/hospital-heavy, so many scholarship foundations correctly do not receive a nonprofit card.
- USAspending parsed successfully, but no exact ProPublica recipient/EIN joins were found in this scoped source.
- CDC SVI coverage is not present for every state in the packaged legacy export; the UI hides missing SVI fields and still shows ADI/County Health where available.
