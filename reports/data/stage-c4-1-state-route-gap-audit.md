# Stage C4.1 state route gap audit

**Date:** 2026-05-31  
**Issue:** State affordability sidebar missing on `/scholarships/texas` and `/scholarships/new-york`

---

## Route resolution (both states)

| Field | California | Texas / New York |
|-------|------------|------------------|
| **URL** | `/scholarships/california` | `/scholarships/texas`, `/scholarships/new-york` |
| **Page file** | `app/scholarships/[[...slugPath]]/page.tsx` | Same |
| **Body** | `app/scholarships/scholarshipsSlugPathPageBody.tsx` | Same |
| **Resolver** | `resolveScholarshipSlugPath` → `manifest_seo` | Same |
| **Manifest row** | Dynamic entry (`buildDynamicEntryFromCanonicalPath`) | Same |
| **SEO JSON** | `data/seo-scholarship-content/california.json` | `texas.json`, `new-york.json` |

Both states are valid single-segment US state SEO paths. Neither has a curated single-segment row in `data/seo-scholarship-routes.json`.

---

## Template split observed on production (pre-fix)

| Signal | California | Texas |
|--------|------------|-------|
| HTML size | ~170 KB | ~40 KB |
| `Scholarships in {State} · {year}` heading | **Present** | Absent |
| `SeoScholarshipHero` / promoted chrome | **Present** | Absent |
| `scholarship-state-context-heading` | **Present** | Absent |
| Visible listing title fallback | State hub heading | `Texas scholarships` (`entry.h1Fallback`) |

**California path:** `stateHubCtx` resolves → `loadOrGenerateSeoHubContent` → promoted chrome (`promotedChrome === true`) → hero + sidebar in `leadContent`.

**Texas/NY path (production):** Same `manifest_seo` branch, but **promoted chrome off** (`leadContent={null}`). Metadata still reads SEO JSON (title from bundle), while body falls back to dynamic manifest `h1Fallback`. Sidebar was nested inside the promoted-chrome fragment only.

---

## Root cause

C4 inserted `ScholarshipStateExternalContextSidebar` only when `promotedChrome` was true:

```tsx
leadContent={
  promotedChrome ? (
    <>
      <SeoScholarshipHero ... />
      {stateSlugForSidebar ? <ScholarshipStateExternalContextSidebar ... /> : null}
    </>
  ) : null
}
```

Alternate/lighter state listings (`promotedChrome === false`) never received `leadContent`, so the sidebar was skipped even when:

- the URL is a valid `/scholarships/{state}` path, and
- static `state_affordability` data exists.

State slug detection also relied on `stateHubCtx?.stateSlug`, which is not populated for every dynamic state template path on production.

---

## Safest insertion point

**File:** `app/scholarships/scholarshipsSlugPathPageBody.tsx` — `manifest_seo` branch only.

**Strategy:**

1. Resolve state slug via shared helper `resolveAffordabilitySidebarStateSlug()` (canonical path + URL segments + manifest location filter).
2. Render sidebar in `leadContent` even when `promotedChrome` is false.
3. Keep hero/post-listing SEO blocks gated on `promotedChrome` (unchanged).

No changes to listing fetch, metadata generators, or university hub component.

---

## SEO risk

| Risk | Assessment |
|------|------------|
| Canonical / robots / noindex | **None** — metadata modules untouched |
| Sitemap | **None** |
| Ranking / filter queries | **None** — `fetchInitialLongTailScholarshipsPayload` unchanged |
| Content duplication | **Low** — supplementary aside below hero or above listing |
| Invalid state URLs | Sidebar hidden when slug unmapped or no enrichment rows |

**SEO risk: low**
