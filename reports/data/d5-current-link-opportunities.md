# D5 — Current Link Opportunities

**Date:** 2026-05-31

## Summary

D1/D2 already added enrichment sidebars and resource/essay context clusters. D5 consolidates rules into a shared graph and extends clusters to scholarship state/university pages, provider pages, and compare detail pages without adding new routes or datasets.

## Implemented clusters

### State scholarship (`/scholarships/{state}`)

- Compare states hub
- Compare universities hub
- How to find scholarships (resource)
- Financial need essay guide
- Optional: California vs Texas compare (CA/TX only)
- Excludes self-link to current state page

**Component:** `ScholarshipStateExternalContextSidebar` → `InternalLinkCluster` (`pageType: scholarship-state`)

### University scholarship (`/scholarships/{state}/{university}`)

- Scholarships in {state}
- Compare universities
- How to find scholarships
- Financial need essay guide
- Provider page (only when hub slug is passed — confident match)

**Component:** `ScholarshipUniversityExternalContextSidebar` → `InternalLinkCluster` (`pageType: scholarship-university`)

### Provider (`/providers/{id}`)

- Scholarships in matched state (Scorecard match only)
- Compare universities
- How to find scholarships

**Component:** `ProviderExternalSchoolContext` → `InternalLinkCluster` (`pageType: provider`)

### Compare state detail (`/compare/states/{slug}`)

- Both state scholarship pages
- Compare universities hub
- How to find scholarships
- Financial need essay guide
- Compare states hub

**Component:** `CompareExternalStateAffordabilitySection` → `InternalLinkCluster` (`pageType: compare-state-detail`)

### Compare university detail (`/compare/universities/{slug}`)

- State scholarship pages for each institution state
- Compare these states (when states differ)
- Compare universities hub
- How to find scholarships
- Financial need essay guide

**Component:** `CompareExternalSchoolEnrichmentSection` → `InternalLinkCluster` (`pageType: compare-university-detail`)

### Resource / essay (D2 retained, D5 tightened)

- **State/school-specific resources:** D2 clusters via `RelatedScholarshipContextLinks` + `finalizeInternalLinks`
- **State-specific essays:** state scholarships, browse scholarships, how-to-find, compare universities, compare states
- **Generic resources/essays:** no fake state/school context (blocks hidden)

**Component:** `ExternalReferenceContextCard` → `RelatedScholarshipContextLinks` → `SmartRelatedLinks`

## Skipped (by design)

| Opportunity | Reason |
|-------------|--------|
| Generic essay hub links on `/essays/career-goals` etc. | Risk of low-value/spammy links; D2 generic denylist kept |
| Generic resource extra links on `/resources/best-scholarship-websites` | No displayable context — block correctly hidden |
| Risky provider fuzzy links on university pages | Only hub `providerSlug` used |
| New compare pairs beyond published CA vs TX featured link | Avoid inventing unpublished compare URLs |

## Gaps closed vs spec

| Required edge | Status |
|---------------|--------|
| State → compare states / universities / how-to-find / financial-need | Done |
| University → state / compare universities / how-to-find / financial-need / provider | Done |
| Provider → state scholarships / compare universities / how-to-find | Done |
| Resource (contextual) → state / compare hubs / essay | Done (D2 + finalize) |
| Essay (contextual) → how-to-find / scholarships / compare universities | Done (D2) |
