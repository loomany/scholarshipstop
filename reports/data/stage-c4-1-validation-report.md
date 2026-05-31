# Stage C4.1 validation report

**Date:** 2026-05-31  
**Fix:** Decouple state affordability sidebar from promoted SEO chrome

---

## Automated checks

| Check | Command | Result |
|-------|---------|--------|
| Data validation | `npm run data:validate-enrichment` | **PASS** (exit 0; documented dup-key WARNs) |
| Typecheck | `npx tsc --noEmit` | **PASS** (exit 0) |
| Production build | `npm run build` | **PASS** (exit 0) |

---

## Local smoke (`npx next start -p 3010`)

| URL | Status | State sidebar | School card | List visible | Garbage |
|-----|--------|---------------|-------------|--------------|---------|
| `/scholarships/california` | **200** | **Yes** | no | yes | none |
| `/scholarships/texas` | **200** | **Yes** | no | yes | none |
| `/scholarships/new-york` | **200** | **Yes** | no | yes | none |
| `/scholarships/florida` | **200** | **Yes** | no | yes | none |
| `/scholarships/texas/tarleton-state-university` | **200** | N/A | **Yes** | yes | none |
| `/scholarships/california/california-state-university-northridge` | **200** | N/A | **Yes** | yes | none |
| `/scholarships/not-a-real-state-xyz` | **404** | hidden | no | n/a | none |

**Notes:**

- Texas/NY HTML size increased from ~40 KB to ~169 KB locally with sidebar present (expected).
- University hubs still use `ScholarshipUniversityExternalContextSidebar` only; state listing sidebar heading not duplicated on those routes.
- No visible `undefined`, `null`, or `NaN` in sampled HTML.

---

## Policy checks

| Policy | Changed? |
|--------|----------|
| Canonical | **No** |
| Robots / noindex | **No** |
| Sitemap | **No** |
| Listing / ranking queries | **No** |
| Supabase / Auth / Payments | **No** |

---

## Verdict

**Stage C4.1 validation: PASS**
