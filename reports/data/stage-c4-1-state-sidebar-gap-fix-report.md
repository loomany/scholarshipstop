# Stage C4.1 state sidebar gap fix report

**Date:** 2026-05-31  
**Base commit:** `9d8b62b` (Stage C4)  
**Status:** Fix implemented, validated locally, **not committed** (awaiting approval)

---

## Root cause

Stage C4 wired `ScholarshipStateExternalContextSidebar` inside the promoted SEO chrome block (`leadContent={promotedChrome ? … : null}`). Valid `/scholarships/{state}` pages that use the **lighter dynamic manifest template** (`promotedChrome === false` on production for Texas/New York) never received `leadContent`, so the sidebar was omitted despite available static `state_affordability` data.

---

## Fix summary

1. Added `resolveAffordabilitySidebarStateSlug()` in `lib/external-data/scholarshipPageEnrichment.ts` — resolves state slug from:
   - `parseUsStateHubFromCanonicalPath`
   - URL / canonical path segments
   - manifest `includeLocationLabels` (dynamic state filters)
   - validates against static affordability data

2. Updated `scholarshipsSlugPathPageBody.tsx` manifest SEO branch:
   - Build sidebar node once
   - Render sidebar in `leadContent` when `promotedChrome` is true **or false**
   - Leave hero + post-listing SEO gated on `promotedChrome` (unchanged)

---

## Files changed

| File | Change |
|------|--------|
| `lib/external-data/scholarshipPageEnrichment.ts` | New `resolveAffordabilitySidebarStateSlug()` |
| `lib/external-data/index.ts` | Export new helper |
| `app/scholarships/scholarshipsSlugPathPageBody.tsx` | Decouple sidebar from promoted chrome |
| `reports/data/stage-c4-1-*.md` | Preflight, audit, validation, smoke plan, this report |

**University sidebar:** unchanged (`UniversityHubPageContent.tsx` not modified).

---

## Routes fixed

| Route | Before | After (local) |
|-------|--------|---------------|
| `/scholarships/california` | Sidebar yes | Sidebar yes (no regression) |
| `/scholarships/texas` | Sidebar **no** (prod) | Sidebar **yes** |
| `/scholarships/new-york` | Sidebar **no** (prod) | Sidebar **yes** |
| `/scholarships/florida` | n/a | Sidebar **yes** |
| University hubs | School card yes | Unchanged |

---

## Validation results

| Check | Result |
|-------|--------|
| `npm run data:validate-enrichment` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| Local smoke (7 URLs) | **PASS** |

---

## SEO / listing policy

| Item | Changed? |
|------|----------|
| SEO policy (canonical/robots/sitemap) | **No** |
| Listing / ranking queries | **No** |
| Supabase / Auth / Payments | **No** |

---

## Commit prep (not executed)

**Suggested message:**

```
fix(scholarships): show affordability sidebar on state routes
```

**Stage scope:**

```
app/scholarships/scholarshipsSlugPathPageBody.tsx
lib/external-data/scholarshipPageEnrichment.ts
lib/external-data/index.ts
reports/data/stage-c4-1-*.md
```

**Ready to commit:** yes (pending user approval)
