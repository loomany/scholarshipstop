# Stage C3 localized route audit

**Date:** 2026-05-31  
**Pilot locales:** `es`, `fr` (Stage 2)

---

## Summary

| Route | Exists | C3 action |
|-------|--------|-----------|
| `/[locale]/providers/[slug]` | yes | **Wired** — `ProviderExternalSchoolContext` |
| `/[locale]/resources/[slug]` | yes | **Wired** — `ResourceExternalContextCard` |
| `/[locale]/essays/[slug]` | yes | **Wired** — `EssayExternalContextCard` |
| `/[locale]/compare/universities` | yes | **Already covered** — reuses `UniversityCompareHubPageBody` (C2 teaser) |
| `/[locale]/compare/states` | yes | **Already covered** — reuses `StateCompareHubPageBody` (C2 teaser) |
| `/[locale]/compare/universities/[slug]` | yes | **Audit only** — detail uses shared compare body (C1 enrichment) |
| `/[locale]/compare/states/[slug]` | yes | **Audit only** — same as English detail |

---

## `/[locale]/providers/[slug]`

| Field | Value |
|-------|-------|
| **File** | `app/[locale]/providers/[slug]/page.tsx` |
| **Shell** | Server RSC → `LocalizedProviderProfilePage` |
| **Data available** | `data.displayName`, `data.hqState`, scholarships, translated copy |
| **Reuse** | Same `ProviderExternalSchoolContext` as `/providers/[id]` |
| **Join key** | `displayName` + `hqState` via `matchProviderToSchool` |
| **Risk** | Medium — wrong college match |
| **Recommendation** | Wire strict provider card after About section |
| **C3 status** | **Changed** in `LocalizedProviderProfilePage.tsx` |

Locale gate: `isStage2PilotLocale` — non-pilot locales 404 (unchanged).

---

## `/[locale]/resources/[slug]`

| Field | Value |
|-------|-------|
| **File** | `app/[locale]/resources/[slug]/page.tsx` |
| **Shell** | Server RSC → `LocalizedResourceArticlePage` (or `LocalizedProductionPage` for static pilot) |
| **Data available** | English `post.title`, `post.slug`, `post.meta_description`, `post.meta_title`; translated `copy.*` for display |
| **Reuse** | `ResourceExternalContextCard` with **English source fields** for matching |
| **Risk** | Low — card hidden on weak match |
| **Recommendation** | Wire after header; pass classification category/subcategory |
| **C3 status** | **Changed** in `LocalizedResourceArticlePage.tsx` |

Static pilot pages via `LocalizedProductionPage` skip CMS card (no post row) — acceptable.

---

## `/[locale]/essays/[slug]`

| Field | Value |
|-------|-------|
| **File** | `app/[locale]/essays/[slug]/page.tsx` |
| **Shell** | Server RSC → `LocalizedEssayGuidePage` or static pilot page |
| **Data available** | English `essay.title`, `essay.slug`, `essay.meta_description`, hub category fields |
| **Reuse** | `EssayExternalContextCard` with English hints (not localized headline) |
| **Risk** | Low |
| **Recommendation** | Wire after intro using English metadata |
| **C3 status** | **Changed** in `LocalizedEssayGuidePage.tsx` |

---

## `/[locale]/compare/universities`

| Field | Value |
|-------|-------|
| **File** | `app/[locale]/compare/universities/page.tsx` |
| **Implementation** | Re-exports English metadata; renders `UniversityCompareHubPageBody` with `locale` prop |
| **Enrichment** | C2 `CompareHubExternalDataTeaser` already in shared body |
| **Risk** | Low |
| **C3 status** | **No change needed** |

---

## `/[locale]/compare/states`

| Field | Value |
|-------|-------|
| **File** | `app/[locale]/compare/states/page.tsx` |
| **Implementation** | Re-exports English metadata; renders `StateCompareHubPageBody` |
| **Enrichment** | C2 hub teaser already present |
| **C3 status** | **No change needed** |

---

## `/[locale]/compare/universities/[slug]` and `/[locale]/compare/states/[slug]`

| Field | Value |
|-------|-------|
| **Files** | `app/[locale]/compare/universities/[slug]/page.tsx`, `app/[locale]/compare/states/[slug]/page.tsx` |
| **Enrichment** | C1 detail sections via shared compare detail page bodies |
| **C3 status** | **Audit only** — no refactor required |

---

## Middleware / locale handling

- Pilot routes gated by `isStage2PilotLocale` in page components
- `LocalizedProviderProfilePage` uses `hrefForLocalizedUiRequired` for links — unchanged
- Enrichment components are server-only; no client JSON imports

---

## Client bundle safety

All C3 wiring uses existing server components importing `lib/external-data` (`server-only`). Localized shells pass serializable string props only.
