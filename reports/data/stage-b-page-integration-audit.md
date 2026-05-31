# Stage B page integration audit

**Date:** 2026-05-31  
**Data layer:** `lib/external-data/` (server-only)

## Summary

| Route | Can use static data now | Implemented Stage B | Risk |
|-------|-------------------------|---------------------|------|
| `/compare/states/[slug]` | yes | **yes** | low |
| `/compare/universities/[slug]` | yes (name+state match) | **yes** | medium (name matching) |
| `/compare/states` | partial (index only) | no | low |
| `/compare/universities` | partial (index only) | no | low |
| `/providers/[id]` | yes (school enrichment by name) | no | medium |
| `/resources/[slug]` | yes (state/city COL via hub topic) | no | low |
| `/essays/[slug]` | yes (same as resources) | no | low |
| `/scholarships/[state]` | yes (`getStateAffordability`) | no | low |
| `/scholarships/[state]/[university]` | yes (school + city COL) | no | medium |

---

## `/compare/universities`

| Field | Value |
|-------|-------|
| **Route** | `/compare/universities` |
| **File** | `app/compare/universities/page.tsx`, `app/[locale]/compare/universities/page.tsx` |
| **Component** | Server (hub listing) |
| **Can use static data now** | Partial — list pages could show aggregate hints later |
| **Recommended helper** | `getSchoolsByState`, `findSchoolsByName` (server-only, not for client search) |
| **Risk** | low if index-only; avoid loading 6k rows on hub |
| **Implemented Stage B** | no |

---

## `/compare/universities/[slug]`

| Field | Value |
|-------|-------|
| **Route** | `/compare/universities/[slug]` |
| **File** | `app/compare/universities/[slug]/page.tsx` → `universityCompareDetailPageBody.tsx` |
| **Component** | Server (`UniversityCompareDetailPageBody`) |
| **Can use static data now** | yes — `instA/B.name` + `instA/B.state` |
| **Recommended helper** | `matchSchoolForInstitution`, `getSchoolByUnitId` (when unit_id added to DB later) |
| **Risk** | medium — ambiguous school names; section hidden when no match |
| **Implemented Stage B** | **yes** — `CompareExternalSchoolEnrichmentSection` |

---

## `/compare/states`

| Field | Value |
|-------|-------|
| **Route** | `/compare/states` |
| **File** | `app/compare/states/page.tsx` |
| **Component** | Server hub |
| **Can use static data now** | partial |
| **Recommended helper** | `getStateAffordability` for hub teasers (Stage C) |
| **Risk** | low |
| **Implemented Stage B** | no |

---

## `/compare/states/[slug]`

| Field | Value |
|-------|-------|
| **Route** | `/compare/states/[slug]` |
| **File** | `app/compare/states/[slug]/page.tsx` → `stateCompareDetailPageBody.tsx` |
| **Component** | Server (`StateCompareDetailPageBody`) |
| **Can use static data now** | yes — `stateA.code`, `stateB.code` |
| **Recommended helper** | `getStateAffordability` |
| **Risk** | low — FBI copy uses neutral aggregate wording only |
| **Implemented Stage B** | **yes** — `CompareExternalStateAffordabilitySection` |

---

## `/providers/[id]`

| Field | Value |
|-------|-------|
| **Route** | `/providers/[id]` (also `/[locale]/providers/[slug]`) |
| **File** | `app/providers/[id]/page.tsx` |
| **Component** | Server |
| **Can use static data now** | yes — if provider maps to institution/school name |
| **Recommended helper** | `matchSchoolForInstitution`, `getSchoolByUnitId` |
| **Risk** | medium — provider ↔ school join not standardized |
| **Implemented Stage B** | no (plan only) |

**Stage C plan:** sidebar stat box when provider has linked institution or high-confidence name match.

---

## `/resources/[slug]`

| Field | Value |
|-------|-------|
| **Route** | `/resources/[slug]` |
| **File** | `app/resources/[slug]/page.tsx` |
| **Component** | Server |
| **Can use static data now** | yes — via `seo_hub_content.cost_of_living_json` replacement/supplement |
| **Recommended helper** | `getStateAffordability`, `getCityAffordability`, `getLocationByCityState` |
| **Risk** | low for read-only stat box; **do not** change AI hub generation in Stage B |
| **Implemented Stage B** | no (plan only) |

**Stage C plan:** optional stat box when article topic includes state/city; compare against existing AI COL JSON policy.

---

## `/essays/[slug]`

| Field | Value |
|-------|-------|
| **Route** | `/essays/[slug]` |
| **File** | `app/essays/[slug]/page.tsx` |
| **Component** | Server |
| **Can use static data now** | same as resources |
| **Recommended helper** | `getStateAffordability`, `getCityAffordability` |
| **Risk** | low |
| **Implemented Stage B** | no (plan only) |

---

## `/scholarships/[state]`

| Field | Value |
|-------|-------|
| **Route** | `/scholarships/[state]` |
| **File** | `app/scholarships/[[...slugPath]]/page.tsx` (state hub segment) |
| **Component** | Server |
| **Can use static data now** | yes — map state slug → code → `getStateAffordability` |
| **Recommended helper** | `getStateAffordability` |
| **Risk** | low |
| **Implemented Stage B** | no |

---

## `/scholarships/[state]/[university]`

| Field | Value |
|-------|-------|
| **Route** | `/scholarships/[state]/[university]` |
| **File** | `app/scholarships/[state]/[university]/page.tsx` |
| **Component** | Server |
| **Can use static data now** | yes — institution slug/name + state; city via crosswalk |
| **Recommended helper** | `matchSchoolForInstitution`, `getCityAffordability`, `getLocationByCityState` |
| **Risk** | medium — slug ↔ Scorecard name alignment |
| **Implemented Stage B** | no |

---

## `seo_hub_content.cost_of_living_json`

| Field | Value |
|-------|-------|
| **Current** | AI-generated via `lib/seo/seoHubContentAi.ts` / seo worker |
| **Static alternative** | `getStateAffordability` + `getCityAffordability` |
| **Implemented Stage B** | no — documented for Stage C / separate policy TZ |

**Recommendation:** keep AI COL for narrative pages until product decides static-vs-AI policy; static layer can supplement fact boxes without replacing worker output.
