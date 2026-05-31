# Stage C2 route enrichment audit

**Date:** 2026-05-31  
**Data package:** `data/external/scholarshiptop-enrichment/` (school, state, city, crosswalk)

Legend: **Y** = safe to use server-side; **N** = not applicable or high risk; **C** = conditional (strict matching only).

---

## `/providers/[id]`

| Field | Value |
|-------|-------|
| **Route** | `/providers/[id]` |
| **File** | `app/providers/[id]/page.tsx` |
| **Component type** | Server page (async RSC); client islands for auth bridge / scroll |
| **Current data** | Supabase provider profile (`displayName`, `hqState`, scholarships, FAQ) |
| **school_enrichment** | **C** — via `matchProviderToSchool` (exact name+state or institution-like + unambiguous) |
| **state_affordability** | N — school card sufficient |
| **city_affordability** | N — no reliable city on all providers |
| **location_crosswalk** | N — not needed for provider match |
| **Join key** | `displayName` + `hqState` (2-letter code) |
| **Risk** | **Medium** — wrong college match would harm trust |
| **Recommendation** | **Implemented** — `ProviderExternalSchoolContext` after About section; hide on low confidence |
| **C2 status** | **Changed** |

**Localized route:** `app/[locale]/providers/[slug]/page.tsx` uses `LocalizedProviderProfilePage` — **not wired in C2** (separate component tree; defer to C3).

---

## `/resources/[slug]`

| Field | Value |
|-------|-------|
| **Route** | `/resources/[slug]` |
| **File** | `app/resources/[slug]/page.tsx` |
| **Component type** | Server page; body rendered server-side |
| **Current data** | Supabase content post (slug, title, body, categories) |
| **school_enrichment** | **C** — only if explicit `schoolName` passed (not wired from DB in C2) |
| **state_affordability** | **C** — via `resolveStateCodeFromContentHints(slug, title)` |
| **city_affordability** | N — no city metadata on most articles |
| **location_crosswalk** | N — not used in C2 content resolver |
| **Join key** | State slug token in URL or unambiguous state name in title |
| **Risk** | **Low** — card hidden when mapping ambiguous |
| **Recommendation** | **Implemented** — conservative state-only context card after header |
| **C2 status** | **Changed** |

Most articles will **not** show the card (by design). Example slugs with state tokens may show (e.g. `scholarships-for-california-students`).

---

## `/essays/[slug]`

| Field | Value |
|-------|-------|
| **Route** | `/essays/[slug]` |
| **File** | `app/essays/[slug]/page.tsx` |
| **Component type** | Server page |
| **Current data** | Supabase essay guide (slug, title, body) |
| **school_enrichment** | **C** — same resolver; rarely triggered without school metadata |
| **state_affordability** | **C** — slug/title state hints |
| **city_affordability** | N |
| **location_crosswalk** | N |
| **Join key** | Same as resources |
| **Risk** | **Low** |
| **Recommendation** | **Implemented** — `EssayExternalContextCard` after header |
| **C2 status** | **Changed** |

Localized mirror: `app/[locale]/essays/[slug]/page.tsx` — **not wired** (defer C3).

---

## `/compare/universities`

| Field | Value |
|-------|-------|
| **Route** | `/compare/universities` |
| **File** | `app/compare/universities/universityCompareHubPageBody.tsx` (via compare layout) |
| **Component type** | Server body + client filter UI |
| **Current data** | Compare catalog counts from Supabase |
| **school_enrichment** | **Y** — aggregate coverage stats only (no row dump) |
| **state_affordability** | N |
| **city_affordability** | N |
| **location_crosswalk** | N |
| **Join key** | N/A (aggregates) |
| **Risk** | **Low** — teaser is summary counts, server-rendered |
| **Recommendation** | **Implemented** — `CompareHubExternalDataTeaser variant="universities"` |
| **C2 status** | **Changed** |

---

## `/compare/states`

| Field | Value |
|-------|-------|
| **Route** | `/compare/states` |
| **File** | `app/compare/states/stateCompareHubPageBody.tsx` |
| **Component type** | Server body + client filter UI |
| **Current data** | Compare catalog from Supabase |
| **school_enrichment** | N |
| **state_affordability** | **Y** — aggregate coverage stats |
| **city_affordability** | N |
| **location_crosswalk** | N |
| **Join key** | N/A |
| **Risk** | **Low** |
| **Recommendation** | **Implemented** — `CompareHubExternalDataTeaser variant="states"` |
| **C2 status** | **Changed** |

---

## `/scholarships/[state]`

| Field | Value |
|-------|-------|
| **Route** | `/scholarships/[state]` (single segment) |
| **File** | `app/scholarships/[[...slugPath]]/page.tsx` → `ScholarshipsSlugPathPageBody` |
| **Component type** | Mixed — heavy client scholarship list + server metadata |
| **Current data** | State slug, scholarship filters, SEO tags |
| **school_enrichment** | N on state-only pages |
| **state_affordability** | **Y** — direct `stateCode` from route segment |
| **city_affordability** | N |
| **location_crosswalk** | **C** — could normalize city labels later |
| **Join key** | `SEO_ROUTE_STATE_SLUG_TO_CODE[stateSlug]` |
| **Risk** | **High** — large page, SEO-sensitive, client bundle concern |
| **Recommendation** | **Audit only** — plan in `stage-c2-scholarship-page-sidebar-plan.md` |
| **C2 status** | **Audited only** |

---

## `/scholarships/[state]/[university]`

| Field | Value |
|-------|-------|
| **Route** | `/scholarships/[state]/[university]` |
| **File** | `app/scholarships/[state]/[university]/page.tsx` |
| **Component type** | Server shell + `UniversityHubPageContent` (client list) |
| **Current data** | `fetchUniversityHubRow(state, university)` — displayName, stateSlug, scholarship count |
| **school_enrichment** | **Y** — `matchSchoolForInstitution({ name: hub.displayName, state: hub.stateCode })` |
| **state_affordability** | **Y** — state from hub row |
| **city_affordability** | **C** — if school row has city |
| **location_crosswalk** | **C** — city/state join for cost context |
| **Join key** | `hub.displayName` + state code; crosswalk via school city |
| **Risk** | **High** — indexable SEO pages, performance, wrong-school match |
| **Recommendation** | **Audit only** — Stage C4 sidebar |
| **C2 status** | **Audited only** |

---

## Client bundle safety

All C2 enrichment components are **async server components** importing `lib/external-data` (marked `server-only`). JSON loaders are not imported from client modules. Hub teasers render numeric aggregates only — no full JSON in client props.

---

## Summary

| Route | C2 action |
|-------|-----------|
| `/compare/universities` | Teaser added |
| `/compare/states` | Teaser added |
| `/providers/[id]` | School context card added |
| `/resources/[slug]` | Conditional context card added |
| `/essays/[slug]` | Conditional context card added |
| `/scholarships/[state]` | Audit only |
| `/scholarships/[state]/[university]` | Audit only |
| `/[locale]/providers/[slug]` | Skipped — localized shell |
| `/[locale]/essays/[slug]` | Skipped — localized shell |
