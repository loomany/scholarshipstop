# Stage C4 scholarship route audit

**Date:** 2026-05-31

---

## `/scholarships/[state]`

| Field | Value |
|-------|-------|
| **Route** | `/scholarships/{state}` (e.g. `/scholarships/california`) |
| **File** | `app/scholarships/[[...slugPath]]/page.tsx` → `scholarshipsSlugPathPageBody.tsx` |
| **Resolution** | `resolveScholarshipSlugPath` → `manifest_seo` + `parseUsStateHubFromCanonicalPath` |
| **Component type** | Server RSC body + client `ScholarshipsHubPageAuthBridge` for listing |
| **State param** | `stateHubCtx.stateSlug` from canonical path |
| **University param** | N/A |
| **SEO policy** | Indexable when manifest entry + promoted chrome; query-noise paths may noindex (unchanged) |
| **Canonical/robots** | `generateMetadata` in `[[...slugPath]]/page.tsx` + layout metadata helpers — **not modified in C4** |
| **Safe enrichment?** | **Yes** — insert server sidebar in `leadContent` after hero |
| **Risk** | Medium — large page, SEO-sensitive; sidebar is supplementary |
| **Recommendation** | **Implemented** — `ScholarshipStateExternalContextSidebar` when `stateHubCtx` or `tripleHubCtx` |
| **C4 status** | **Changed** |

State+topic URLs (`/scholarships/texas/nursing`) also receive state sidebar via `tripleHubCtx.stateSlug`.

---

## `/scholarships/[state]/[university]`

| Field | Value |
|-------|-------|
| **Route** | `/scholarships/{state}/{university}` |
| **File** | `app/scholarships/[state]/[university]/page.tsx` |
| **Shell** | Server page → `UniversityHubPageContent` + client scholarship list |
| **State param** | `hub.stateSlug`, `hub.stateCode` from `fetchUniversityHubRow` |
| **University param** | `hub.displayName`, `hub.slug` |
| **SEO policy** | `robots: { index: true, follow: true }` when hub row exists — **unchanged** |
| **Canonical** | `/scholarships/${hub.stateSlug}/${hub.slug}` in page metadata — **unchanged** |
| **Safe enrichment?** | **Yes** — server sidebar in `leadContent` before client list |
| **Risk** | High if wrong college match |
| **Recommendation** | **Implemented** — `ScholarshipUniversityExternalContextSidebar` with strict `matchSchoolForInstitution` |
| **C4 status** | **Changed** |

Fallback when hub row missing: delegates to `ScholarshipsSlugPathPageBody` (no university sidebar).

---

## Related routes (not changed)

| Route | Notes |
|-------|-------|
| `/scholarships` root | Catalog — no state slug |
| `/scholarships/hub/*` | Internal hub tabs — different path prefix |
| `/scholarships/category/[slug]` | Category pages — out of C4 scope |
| `/[locale]/scholarships/*` | Uses same `ScholarshipsSlugPathPageBody` — inherits state sidebar when state hub resolves |
| Scholarship detail UUID/slug pages | Detail view — not C4 scope |

---

## Constraints honored

- No changes to `generateMetadata`, canonical builders, or robots logic
- No changes to `fetchInitialUniversityHubScholarshipsPayload` or listing filters
- No changes to `resolveScholarshipSlugPath` behavior
- Server-only enrichment; JSON not passed to client bundle

---

## Join keys

| Page | State join | School join |
|------|------------|-------------|
| State hub | `SEO_ROUTE_STATE_SLUG_TO_CODE[stateSlug]` → `getStateAffordability` | N/A |
| University hub | Same via `hub.stateSlug` | `matchSchoolForInstitution({ name: hub.displayName, state: hub.stateCode })` |

Duplicate name+state Scorecard rows return null (strict, from C2/C3 behavior).
