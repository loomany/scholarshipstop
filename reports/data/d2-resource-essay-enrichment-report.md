# D2 — Resource/Essay Enrichment Expansion Report

**Date:** 2026-05-31  
**Status:** Complete (pending commit approval)

## Summary

Expanded static enrichment for resource/essay pages via improved context resolution, reusable topical link clusters, and richer planning copy — without new datasets, SEO policy changes, or Supabase work.

## Resolver improvements (`resolveContentEnrichmentContext.ts`)

- Expanded **generic slug denylist** (national guides, static hub slugs)
- **USA-national slug guard** — pages like `easy-usa-scholarships-international-students` hide state context unless a strict school match exists
- **Institution slug hints** — strict College Scorecard match for tokens: harvard, stanford, yale, mit, princeton, duke, ucla, nyu, columbia, georgetown
- **`hasDisplayableContentContext(context, hints)`** — generic slugs always hidden; weak national topics require school match
- State detection unchanged for unambiguous slug/title/category signals

## New link cluster layer

| File | Role |
|------|------|
| `lib/external-data/contentEnrichmentLinks.ts` | Cluster builders (`state-resource`, `school-resource`, `state-essay`, `provider`) |
| `components/content-hub/RelatedScholarshipContextLinks.tsx` | Reusable 3–6 link nav wrapper |

### Cluster link sets

| Cluster | Links (max 6) |
|---------|----------------|
| `state-resource` | state scholarships, compare states, compare universities, financial need essays |
| `school-resource` | state scholarships, compare universities, how to find scholarships, financial need essays |
| `state-essay` | state scholarships, how to find scholarships, compare universities, compare states |
| `provider` | state scholarships, compare universities, how to find scholarships |

## Component updates

| Component | Change |
|-----------|--------|
| `ExternalReferenceContextCard` | Essay/resource copy, compact stats only, clustered links, source footer |
| `ResourceExternalContextCard` | Passes hints to display gate; `contentType="resource"` |
| `EssayExternalContextCard` | State/school-specific planning intro; `contentType="essay"` |
| `ProviderExternalSchoolContext` | Uses `RelatedScholarshipContextLinks` cluster |

## Candidate inventory

`reports/data/d2-resource-essay-candidate-pages.csv` — **323 rows** scanned from static guides + CMS pilot inventory.

| Metric | Count |
|--------|-------|
| Pages with context showing | 8 (in static/inventory sample) |
| Generic pages forced hidden | 4+ in sample |
| Resolver candidates (monitor) | remainder |

Notable new matches:

- `/resources/harvard-scholarships-international-students` → school context (MA, Harvard University)
- `/resources/best-scholarships-texas-international-students` → state context (TX)

## Generic pages still hidden

- `/resources/best-scholarship-websites`
- `/resources/how-to-find-scholarships`
- `/essays/financial-need`
- `/essays/career-goals`
- National USA guides (`types-of-scholarships-usa-explained`, `scholarships-in-usa-for-international-students`, etc.)

## Files changed

```
lib/external-data/resolveContentEnrichmentContext.ts
lib/external-data/contentEnrichmentLinks.ts
lib/external-data/index.ts
components/content-hub/ExternalReferenceContextCard.tsx
components/content-hub/RelatedScholarshipContextLinks.tsx
components/resources/ResourceExternalContextCard.tsx
components/essays/EssayExternalContextCard.tsx
components/providers/ProviderExternalSchoolContext.tsx
reports/data/d2-*.md
reports/data/d2-resource-essay-candidate-pages.csv
```

## Suggested commit

```
feat(seo): expand contextual enrichment links
```
