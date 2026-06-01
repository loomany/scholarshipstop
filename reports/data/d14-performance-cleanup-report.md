# D14 Performance Cleanup Report

Date: 2026-06-01

## What Was Audited

- Production response time / HTML size (11 URLs, 3 samples each)
- HTML payload for embedded JSON / RSC bloat
- Client bundle for static JSON leakage
- Server render duplication (lookups + repeated footer markup)
- D1–D13 enrichment blocks still visible after fixes

## What Was Changed

### Duplicate source footer consolidation

Added `showSourceFooter?: boolean` (default `true`) to:

- `StateSocialContextBlock`
- `InstitutionResearchContext`
- `CityRentMetroContext`
- `MedicalSchoolContext`
- `PremedTopicContextCard`

Parents now pass `showSourceFooter={false}` when a consolidated footer exists:

- `ScholarshipStateExternalContextSidebar`
- `ScholarshipUniversityExternalContextSidebar`
- `CompareExternalStateAffordabilitySection`
- `CompareExternalSchoolEnrichmentSection` (SchoolProfileColumn)
- `ProviderExternalSchoolContext`
- `ExternalReferenceContextCard`
- Medical guide `PremedTopicContextCard`

### Medical guide source section

Removed redundant `DataSourceFooter` from `MedicalScholarshipPlanningSections` source note (inline copy retained).

## Before / After (local verification)

| Route | `Reference only` footers (visible text) |
|---|---:|
| Compare university (production pre-fix) | 10 |
| Compare university (local post-fix) | **1** |
| State scholarship sidebar (local post-fix) | **1** |
| Provider Loyola (local post-fix) | **1** |
| Medical guide (local post-fix) | **1** |

Estimated HTML savings: ~1–4 KB per heavy enriched page (footer paragraph repetition).

## What Was Not Changed

- Scholarship listing query / ranking / pagination
- Canonical / robots / sitemap / noindex policy
- Static JSON files or loaders
- Supabase / Auth / Payments
- D1–D13 visible enrichment content (metrics, bars, links, copy)
- Listing SSR performance (out of scope)

## Remaining Slow Routes

| Route | Issue | D14 action |
|---|---|---|
| `/scholarships/texas` etc. | ~2–4s listing SSR | Monitor only |
| `/resources/best-scholarships-texas-international-students` | Cold/cache spikes ~10–30s | Monitor only |
| `/scholarships/.../csun` | Occasional 45s outlier | Monitor only |
| `/compare/universities/...` | ~274 KB HTML | Footer dedupe helps; full fix needs listing/compare architecture |

## Recommended Future Performance Work

1. CDN/cache warm for top state listing routes
2. Investigate CSUN / Texas intl resource TTFB outliers (infra, not enrichment)
3. Consider streaming or deferring scholarship listing below fold (separate approved sprint)
4. Optional: collapse compare school columns when bar charts already show same metrics

## Policy

| Item | Changed |
|---|---|
| SEO/canonical/robots | **no** |
| Supabase/Auth/Payments | **no** |
| New datasets | **no** |

## Verdict

**FIXED** — safe footer dedupe reduces HTML payload on all major enriched surfaces without removing useful context.
