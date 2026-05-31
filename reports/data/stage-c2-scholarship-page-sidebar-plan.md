# Stage C2 scholarship page sidebar plan (audit only)

**Date:** 2026-05-31  
**Status:** Plan for **Stage C4** — no UI changes in C2

---

## Routes in scope

1. **State hub:** `/scholarships/[state]` — `app/scholarships/[[...slugPath]]/page.tsx`
2. **University hub:** `/scholarships/[state]/[university]` — `app/scholarships/[state]/[university]/page.tsx`

Both are SEO-indexable, high-traffic surfaces with existing canonical/robots logic. C2 intentionally skipped UI to avoid bundle, match, and SEO regressions.

---

## State pages — `state_affordability`

### Join path

```
URL segment → SEO_ROUTE_STATE_SLUG_TO_CODE → getStateAffordability(stateCode)
```

State slug is already normalized in scholarship routing (`normalizeScholarshipDynamicParam`, `routeSegmentMaps`).

### Proposed sidebar block (C4)

**Title:** “Cost of living in {StateName}”  
**Metrics:** top highlights from `getTopStateAffordabilityHighlights(stateRow)` — median rent, living wage, median wage (same formatters as compare C1).  
**Placement:** Server sidebar or below hero in `ScholarshipsSlugPathPageBody` — must not ship inside client-only filter panel without RSC boundary.

### Risks

| Risk | Mitigation |
|------|------------|
| SEO duplicate content | Neutral stats + source footer; no keyword stuffing |
| noindex on query variants | Do not change robots policy; sidebar on canonical state URL only |
| Wrong state mapping | Reuse existing `SEO_ROUTE_STATE_SLUG_TO_CODE`; hide if code missing |
| Performance | Lazy-load JSON already in memory on server; no client import |

---

## University pages — `school_enrichment`

### Join path

```
fetchUniversityHubRow(state, university)
  → hub.displayName + state code
  → matchSchoolForInstitution({ name, state })
  → reject if duplicate name+state keys (getSchoolByNameAndState returns null)
```

Optional state context: `getStateAffordability(hub.stateCode)`.

### Proposed sidebar block (C4)

**Title:** “{displayName} — college cost context”  
**Metrics:** in-state tuition, avg net price, admission/completion, enrollment (mirror `ProviderExternalSchoolContext` / compare detail cards).  
**Match rule:** Same strict rules as providers — hide if ambiguous or non-institution hub name.

### `location_crosswalk` role

When school row includes `city` + `state`:

```
getLocationByCityState(city, state) → optional HUD/Census crosswalk fields
```

Use crosswalk for supplemental city cost lines, not primary school match. Crosswalk helps when university hub display name differs slightly from Scorecard but city/state align.

---

## Combined sidebar layout (C4 sketch)

```
┌─────────────────────────────┐
│ Scholarships at {University}│  ← existing
├─────────────────────────────┤
│ College cost context        │  ← school_enrichment (server)
│  tuition / net price / …    │
├─────────────────────────────┤
│ {State} affordability       │  ← state_affordability (server)
│  rent / living wage / …     │
├─────────────────────────────┤
│ Source: public reference    │
└─────────────────────────────┘
```

Render as server component sibling to `UniversityHubPageContent`, not inside client scholarship table.

---

## SEO / noindex / canonical

- **Do not** change `generateMetadata` robots or canonical builders.
- Sidebar is supplementary factual context (same policy as compare enrichment footnotes).
- Avoid rendering enrichment on non-indexable query-noise URLs (`isSeoNoiseQuery` paths stay unchanged).

---

## Performance

- Single server read per request (Maps already built lazily in `lib/external-data`).
- No additional API calls.
- Keep First Load JS unchanged — scholarship list client bundle must not import JSON loaders.

---

## Stage C4 implementation checklist

1. Add `ScholarshipHubExternalContextSidebar.tsx` (server-only).
2. Wire in `[state]/[university]/page.tsx` after hub row fetch; pass `displayName`, `stateCode` only.
3. For state-only pages, wire in slug path body when `segments.length === 1` and state code resolves.
4. Reuse `CompareExternalEnrichmentStatCard` + formatters for visual parity with C1.
5. Add smoke URLs to post-deploy report (sample state + university hubs).
6. Log ambiguous university matches in staging report (same as provider audit).

---

## Why deferred from C2

- University hub page mixes Supabase hub row + large client scholarship grid.
- State scholarship pages share filter client architecture with national catalog.
- Match confidence and SEO impact need isolated C4 QA separate from content-hub expansion.
