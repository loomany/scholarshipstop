# Stage C4 post-deploy smoke

**Date:** 2026-05-31  
**Deployed commit:** `9d8b62b` — `feat(scholarships): add static affordability sidebars`  
**Production base:** https://scholarshiptop.com  
**Method:** Live HTTP fetch + HTML inspection (read-only)

---

## Overall result

| Verdict | **PASS with gap** |
|---------|-------------------|
| SEO policy changed? | **No** |
| Rollback needed? | **No** |
| Stage C5 can start? | **Yes** (extend state sidebar to non-manifest state routes if desired) |

University hub enrichment is live and strict matching works. California state hub shows the new sidebar. **Texas and New York state URLs do not show the sidebar** — they resolve to a lighter listing template without `stateHubCtx` promoted chrome (pre-existing route split, not a SEO/metadata regression). No 500s, no wrong college cards, no visible garbage tokens.

---

## URL results

| # | URL | Status | Time | Loads OK | State sidebar | School card | List visible | Garbage | Canonical | Robots | Result |
|---|-----|--------|------|----------|---------------|-------------|--------------|---------|-----------|--------|--------|
| S1 | [/scholarships/california](https://scholarshiptop.com/scholarships/california) | **200** | ~5.4s | yes | **Yes** | no | yes | none | self | `noindex, follow` | **PASS** |
| S2 | [/scholarships/texas](https://scholarshiptop.com/scholarships/texas) | **200** | ~5.8s | yes | **No** | no | yes | none | self | `noindex, follow` | **GAP** |
| S3 | [/scholarships/new-york](https://scholarshiptop.com/scholarships/new-york) | **200** | ~5.6s | yes | **No** | no | yes | none | self | `noindex, follow` | **GAP** |
| U1 | [/scholarships/texas/tarleton-state-university](https://scholarshiptop.com/scholarships/texas/tarleton-state-university) | **200** | ~3.2s | yes | N/A | **Yes** (Tarleton) | yes | none | self | `index, follow` | **PASS** |
| U2 | [/scholarships/california/california-state-university-northridge](https://scholarshiptop.com/scholarships/california/california-state-university-northridge) | **200** | ~1.6s | yes | N/A | **Yes** (CSUN) | yes | none | self | `index, follow` | **PASS** |
| U3 | [/scholarships/texas/not-a-real-university-xyz-999](https://scholarshiptop.com/scholarships/texas/not-a-real-university-xyz-999) | **200** | ~0.9s | yes | no | **No** | fallback | none | none | `noindex` | **PASS** |

**California university source:** sitemap `seo.xml` → `california-state-university-northridge`.

---

## C4-specific checks

### State pages (S1–S3)

| Signal | California | Texas | New York |
|--------|------------|-------|----------|
| `scholarship-state-context-heading` | **Present** | Absent | Absent |
| “Public reference data for planning context” | **Present** | Absent | Absent |
| Median household income / FMR / living wage stats | **Present** | Absent | Absent |
| Census ACS footer | **Present** | Absent | Absent |
| Scholarship listing / filters | **Present** | Present | Present |

**Gap note:** C4 wires the state sidebar in `scholarshipsSlugPathPageBody` only when `stateHubCtx` / `tripleHubCtx` + promoted SEO chrome resolve (California path). Texas/New York currently serve a thinner `Scholarship matches` listing (~40 KB HTML) without that branch — sidebar not rendered, but pages load normally.

### University pages (U1, U2)

| Signal | Tarleton | CSU Northridge |
|--------|----------|----------------|
| “college cost context” heading | yes | yes |
| Scorecard match copy | yes | yes |
| Correct school name in card | Tarleton State University | California State University, Northridge |
| In-state tuition stat | yes | present |
| State affordability subsection | yes | yes |
| Wrong college match | **None** | **None** |

### Negative control (U3)

| Signal | Result |
|--------|--------|
| School “college cost context” card | **Absent** (correct) |
| HTTP 500 | **None** |
| Wrong college shown | **None** |
| Robots | `noindex` (fallback listing — expected for unknown slug) |

---

## SEO / metadata policy

| Page type | Canonical | Robots | Change from pre-C4? |
|-----------|-----------|--------|---------------------|
| California state hub | `/scholarships/california` | `noindex, follow` | **No** (existing thin/manifest policy) |
| Texas / New York state | self | `noindex, follow` | **No** |
| University hubs (Tarleton, CSUN) | self | `index, follow` | **No** |
| Unknown university slug | none | `noindex` | **No** |

**SEO policy changed: no** — C4 commit did not modify metadata generators, sitemap, or robots modules. Observed robots/canonical values match existing route-type behavior.

---

## Runtime / performance

| Check | Result |
|-------|--------|
| Server 500 / Next error page | **None** on sampled URLs |
| Visible `undefined` / `null` / `NaN` | **None** |
| Scholarship list still renders | **Yes** on indexable university hubs + state listings |
| Response times | California state ~5–6s; university hubs ~1.6–3.2s; unknown slug ~0.9s |

---

## Rollback assessment

**Rollback needed: No**

- No crashes or wrong-college matches
- University strict matching behaves as designed
- Texas/New York sidebar gap is coverage limitation on alternate route template, not data corruption

**Follow-up (optional Stage C5):** Render `ScholarshipStateExternalContextSidebar` on all `/scholarships/{state}` routes when state slug maps to enrichment, not only manifest promoted-chrome paths.

---

## Related reports

- `stage-c4-post-deploy-smoke-plan.md`
- `stage-c4-scholarship-sidebar-report.md`
- `stage-c4-validation-report.md`
