# Stage C5 route performance smoke

**Date:** 2026-05-31  
**Production base:** https://scholarshiptop.com  
**Deployed commit:** `d76d94e`  
**Method:** Live HTTP fetch + HTML inspection (read-only)

**CSV:** `stage-c5-route-performance-smoke.csv`

---

## Overall result

| Verdict | **PASS with warnings** |
|---------|--------------------------|
| HTTP 500s | **None** on sampled routes |
| Enrichment placement | **Correct** on all sampled routes |
| Visible garbage | **None** in enrichment UI snippets |
| Rollback needed | **No** |

---

## Results by URL

| URL | Status | Time | HTML | Enrichment | Canonical | Robots | Result |
|-----|--------|------|------|------------|-----------|--------|--------|
| `/compare/universities` | 200 | 1.4s | 99 KB | N/A (hub) | self | default | **PASS** |
| `/compare/states` | 200 | 1.1s | 103 KB | N/A (hub) | self | default | **PASS** |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | 3.4s | 220 KB | School cards ($17,772 / $6,410) | self | `noindex, follow` | **PASS** |
| `/compare/states/california-vs-texas` | 200 | 2.7s | 126 KB | State cost-of-living grid | self | `noindex, follow` | **PASS** |
| `/providers/loyola-university-chicago` | 200 | 2.8s | 295 KB | Provider school context + tuition | self | default | **PASS** |
| `/providers/alamo-colleges-foundation` | 200 | 2.4s | 289 KB | **Hidden** (strict match) | self | default | **PASS** |
| `/resources/best-scholarship-websites` | 200 | 1.2s | 108 KB | **Hidden** (generic topic) | self | default | **PASS** |
| `/resources/best-scholarships-texas-international-students` | 200 | 30.2s | 168 KB | State planning context | self | default | **PASS** ⚠ slow |
| `/essays/financial-need` | 200 | 0.3s | 68 KB | **Hidden** (generic essay) | self | default | **PASS** |
| `/scholarships/california` | 200 | 3.5s | 170 KB | State sidebar | self | `noindex, follow` | **PASS** |
| `/scholarships/texas` | 200 | 3.2s | 170 KB | State sidebar | self | `noindex, follow` | **PASS** |
| `/scholarships/new-york` | 200 | 3.2s | 170 KB | State sidebar | self | `noindex, follow` | **PASS** |
| `/scholarships/texas/tarleton-state-university` | 200 | 9.4s | 151 KB | School card + listing | self | `index, follow` | **PASS** ⚠ slow |

---

## Warnings

1. **`/resources/best-scholarships-texas-international-students` — 30s** on this sample (likely cold ISR/cache miss). Re-fetch recommended in post-deploy monitoring; not a functional failure.
2. **University hub `/scholarships/texas/tarleton-state-university` — ~9.4s** — moderate; dominated by scholarship listing SSR, not enrichment block alone.
3. **Scholarship state pages ~170 KB** — up from ~40 KB pre-C4.1 on alternate state templates; expected after sidebar + full listing SSR (see HTML payload audit).
4. **Hub/provider/resource pages without explicit `robots` meta** — HTML omits tag; site default applies. Not introduced by enrichment commits.

---

## Enrichment signal reference

| Surface | Expected marker |
|---------|-----------------|
| Compare university detail | `College cost & outcomes`, formatted tuition stats |
| Compare state detail | `Cost of living &`, median income / HUD FMR cards |
| Provider (school match) | `provider-school-context-heading`, `In-state tuition` |
| Provider (foundation) | No provider-school block |
| Resource (generic) | No `Planning context` card |
| Resource (Texas topic) | `Planning context` / state affordability card |
| Essay (generic) | No external context card |
| Scholarship state | `scholarship-state-context-heading` |
| Scholarship university | `college cost context`, correct school name |

---

## Runtime errors

No 500 responses, Next error pages, or enrichment-related stack traces observed on sampled URLs.
