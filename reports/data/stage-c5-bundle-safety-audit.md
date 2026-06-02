# Stage C5 bundle / client safety audit

**Date:** 2026-05-31  
**Static data total:** ~4.88 MB (`school_enrichment` + `state_affordability` + `city_affordability` + `location_crosswalk`)

---

## Summary

| Check | Result |
|-------|--------|
| JSON imported only in server loader | **PASS** |
| `lib/external-data/*` uses `server-only` | **PASS** |
| Enrichment UI components use `'use client'` | **None** — all server components |
| Client page imports `@/lib/external-data` | **None** (only server pages / server components) |
| First Load JS bloat from 4.88 MB JSON | **Not observed** |
| Compare route JS vs Stage B | **Unchanged** (247 kB / 321 kB) |

**Verdict:** **PASS**

---

## JSON import map

Single import site:

```
lib/external-data/loadStaticEnrichment.ts
  → @/data/external/scholarshiptop-enrichment/school_enrichment.json
  → @/data/external/scholarshiptop-enrichment/state_affordability.json
  → @/data/external/scholarshiptop-enrichment/city_affordability.json
  → @/data/external/scholarshiptop-enrichment/location_crosswalk.json
```

All guarded by `import 'server-only'`.

---

## `@/lib/external-data` import graph

| Consumer | Kind | Client? |
|----------|------|---------|
| `CompareExternalStateAffordabilitySection` | Server component | No |
| `CompareExternalSchoolEnrichmentSection` | Server component | No |
| `CompareHubExternalDataTeaser` | Server component | No |
| `ProviderExternalSchoolContext` | Server component | No |
| `ResourceExternalContextCard` | Server component | No |
| `EssayExternalContextCard` | Server component | No |
| `ExternalReferenceContextCard` | Server component | No |
| `ScholarshipStateExternalContextSidebar` | Server component | No |
| `ScholarshipUniversityExternalContextSidebar` | Server component | No |
| `scholarshipsSlugPathPageBody.tsx` | Server RSC | No |
| `UniversityHubPageContent.tsx` | Server (imports sidebar) | No |
| `app/compare/*/…PageBody.tsx` | Server | No |
| `app/providers/[id]/page.tsx` | Server | No |
| `app/resources/[slug]/page.tsx` | Server | No |
| `app/essays/[slug]/page.tsx` | Server | No |

Parent wrappers (`LocalizedProviderProfilePage`, `LocalizedResourceArticlePage`, `ScholarshipsHubPageAuthBridge`) may be client boundaries, but enrichment components are passed as **server-rendered children** / composed in server pages — JSON resolvers execute on server.

---

## First Load JS ( `npm run build`, 2026-05-31 )

| Route | First Load JS | vs Stage B |
|-------|---------------|------------|
| `/compare/states/[slug]` | **247 kB** | Same |
| `/compare/universities/[slug]` | **321 kB** | Same |
| `/compare` hubs | **188 kB** | N/A (teasers only) |
| `/providers/[id]` | **329 kB** | Provider page baseline |
| `/resources/[slug]` | **323 kB** | Resource page baseline |
| `/essays/[slug]` | **323 kB** | Essay page baseline |
| `/scholarships/[[...slugPath]]` | **458 kB** | Scholarship hub baseline |
| Shared | **87.7 kB** | — |

No route shows multi-MB client chunks consistent with static JSON bundling.

---

## Risk notes

1. **`ProviderExternalSchoolContext` imports `@/lib/external-data` barrel** — safe today because component is server-only and tree-shaken on server. Avoid adding `'use client'` to this file without refactoring to props-from-server pattern.
2. **Type-only imports** (`type SchoolEnrichment`) in compare components — compile-time only; no runtime JSON pull on client.

---

## Rollback trigger?

**No** — client bundle safety criteria met.
