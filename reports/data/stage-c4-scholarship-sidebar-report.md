# Stage C4 scholarship sidebar report

**Date:** 2026-05-31  
**Base commit:** `7e083d0` — `feat(data): extend enrichment context to localized content`  
**Suggested commit:** `feat(scholarships): add static affordability sidebars`

---

## Executive summary

Stage C4 adds server-rendered static enrichment sidebars to scholarship state and university hub pages using existing `state_affordability` and `school_enrichment` data. Strict school matching prevents wrong-college cards. No SEO, listing, or Supabase changes.

---

## Routes audited

| Route | File |
|-------|------|
| `/scholarships/[state]` | `app/scholarships/[[...slugPath]]/page.tsx` → `scholarshipsSlugPathPageBody.tsx` |
| `/scholarships/[state]/[university]` | `app/scholarships/[state]/[university]/page.tsx` → `UniversityHubPageContent.tsx` |

Full audit: `stage-c4-scholarship-route-audit.md`

---

## Routes changed

| Route | Change |
|-------|--------|
| `/scholarships/[state]` | `ScholarshipStateExternalContextSidebar` in manifest SEO `leadContent` |
| `/scholarships/[state]/[topic]` | Same state sidebar via `tripleHubCtx.stateSlug` |
| `/scholarships/[state]/[university]` | `ScholarshipUniversityExternalContextSidebar` in university hub `leadContent` |

Localized scholarship routes using `ScholarshipsSlugPathPageBody` inherit state sidebar automatically.

---

## Routes skipped

| Route | Reason |
|-------|--------|
| Scholarship detail pages | Not in C4 scope |
| `/scholarships` root catalog | No state slug |
| `/scholarships/category/*` | No geographic join |
| Non-state manifest SEO pages | No `stateHubCtx` / `tripleHubCtx` |

---

## Components added

| Component | Purpose |
|-----------|---------|
| `components/scholarships/ScholarshipStateExternalContextSidebar.tsx` | State affordability context |
| `components/scholarships/ScholarshipUniversityExternalContextSidebar.tsx` | School + state stacked context |

Reuses `CompareExternalEnrichmentStatCard` and C1 formatters for visual parity.

---

## Helper functions added

**File:** `lib/external-data/scholarshipPageEnrichment.ts`

| Function | Purpose |
|----------|---------|
| `resolveScholarshipStateContext(stateSlugOrCode)` | State code from slug → affordability highlights |
| `resolveScholarshipUniversityContext({ stateSlugOrCode, universityDisplayName })` | Strict school match + state context |
| `hasScholarshipUniversitySidebarContent(context)` | Hide empty university sidebar |

Exported from `lib/external-data/index.ts`.

---

## Examples where sidebars **show**

| Page | Context |
|------|---------|
| `/scholarships/california` | California median income, FMR, living wage, BLS wage |
| `/scholarships/texas` | Texas affordability highlights |
| `/scholarships/texas/tarleton-state-university` | Tarleton Scorecard card + Texas affordability |

---

## Examples where sidebars **hide correctly**

| Page | Behavior |
|------|----------|
| University hub with ambiguous/non-institution name | School card hidden |
| `matchSchoolForInstitution` duplicate name+state | School card hidden |
| State slug that does not map to enrichment row | Entire state sidebar hidden |
| Foundation provider-style hub name | School card hidden (state may still show on university URL if hub exists) |

Local resolver smoke: Alamo Colleges Foundation + TX → `schoolRow: null`.

---

## Validation results

See `stage-c4-validation-report.md`.

| Gate | Result |
|------|--------|
| data:validate-enrichment | PASS |
| tsc --noEmit | PASS |
| npm run build | PASS |

---

## SEO / canonical / robots confirmation

**SEO policy changed: no**

- No edits to `generateMetadata` in scholarship page files
- No edits to `getCanonical`, robots builders, or sitemap modules
- Sidebar is supplementary HTML in existing `leadContent` slots only

---

## Risks

| Risk | Mitigation |
|------|------------|
| Wrong college on university hubs | `matchSchoolForInstitution` + duplicate key null |
| SEO duplicate content | Neutral stats + source footers; no keyword stuffing |
| Client bundle bloat | Server-only components and helpers |
| Page length | Compact card grid; placed after intro, before listing |

---

## Commit prep

**Ready to commit:** yes (pending user approval)

**Suggested message:**

```
feat(scholarships): add static affordability sidebars
```

**Stage only:**

- `lib/external-data/scholarshipPageEnrichment.ts`
- `lib/external-data/index.ts`
- `components/scholarships/ScholarshipStateExternalContextSidebar.tsx`
- `components/scholarships/ScholarshipUniversityExternalContextSidebar.tsx`
- `components/scholarships/UniversityHubPageContent.tsx`
- `app/scholarships/scholarshipsSlugPathPageBody.tsx`
- `reports/data/stage-c4-*.md`

**Do not push** without explicit approval.

---

## Related reports

- `stage-c4-preflight.md`
- `stage-c4-scholarship-route-audit.md`
- `stage-c4-validation-report.md`
- `stage-c4-post-deploy-smoke-plan.md`
- `stage-c2-scholarship-page-sidebar-plan.md` (original C4 plan)
