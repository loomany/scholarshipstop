# Taxonomy / filter display labels — completion (2026-05-20)

## Summary

**Fixed:** Visible scholarship **category** and **country** filter labels on ES/FR scholarships hub and category listings.

**Unchanged:** Category IDs, URL query params, DB `categories` field, API payloads.

## Implementation

| File | Change |
| --- | --- |
| `lib/i18n/taxonomyLabels.ts` | `getLocalizedCategoryLabel`, `getLocalizedCategoryBreadcrumbLabel`, `getLocalizedCategoryPageH1`, `getLocalizedCountryLabel`, `getLocalizedFilterLabel` |
| `lib/i18n/__tests__/taxonomyLabels.test.ts` | 3 unit tests |
| `components/scholarships/ScholarshipsListHeader.tsx` | Category modal, chips search, country rows use locale |
| `app/scholarships/ScholarshipsHubPageClient.tsx` | Passes `uiLocale` to list header |
| `app/scholarships/category/ScholarshipCategoryPageClient.tsx` | Hub UI copy + localized category chips |

## Categories translated (13 ids)

| ID | EN | ES | FR |
| --- | --- | --- | --- |
| arts | Arts | Artes | Arts |
| education | Education | Educación | Éducation |
| humanities | Humanities | Humanidades | Humanités |
| stem | STEM | STEM | STIM |
| medical | Medicine | Medicina | Médecine |
| law | Law | Derecho | Droit |
| community | Community | Comunidad | Communauté |
| biology | Biology | Biología | Biologie |
| safety | Safety | Seguridad | Sécurité |
| music | Music | Música | Musique |
| disability | Disability | Discapacidad | Handicap |
| hobbies | Hobbies | Pasatiempos | Loisirs |
| miscellaneous | Miscellaneous | Varios | Divers |

## More filters (education, eligibility, etc.)

Already localized in `lib/i18n/scholarshipsMoreFiltersUiCopy.ts` (ES/FR option arrays). No change required this sprint.

## User-requested extra labels (Graduate, Women, …)

Those appear in **more-filters eligibility/education** options, not `scholarshipCategories.ts`. They are covered by `scholarshipsMoreFiltersUiCopy` when locale is `es`/`fr`.

## Verification

- `npx tsx --test lib/i18n/__tests__/taxonomyLabels.test.ts` — **3/3 pass**
- `npm run build` — **pass**
- Manual: open `/es/scholarships` → Categories filter → labels in Spanish

## Out of scope

- Category **SEO page** H1 on EN-only `/scholarships/category/*` long-tail (DB SEO)
- Scholarship **card** category badges (internal catalog labels)
- Translating category **slugs** in URLs
