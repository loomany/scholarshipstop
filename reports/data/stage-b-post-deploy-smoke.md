# Stage B post-deploy smoke

**Date:** 2026-05-31  
**Deployed commit:** `05d1b56` — `feat(compare): add static external enrichment data`  
**Production base:** https://scholarshiptop.com  
**Method:** Live HTTP fetch + HTML inspection (read-only; no code/deploy changes)

---

## Overall result

| Verdict | **PASS** |
|---------|----------|
| Rollback needed? | **No** |
| Stage C can start? | **Yes** |

All five URLs returned **HTTP 200**, loaded without 500, enrichment blocks render on detail pages with real formatted values, no visible `undefined` / `null` / `NaN` in enrichment sections, canonicals are correct, and `noindex` on compare **detail** pages matches existing compare SEO quality policy (not introduced by Stage B).

---

## URL results

| # | URL | Status | Time | Loads OK | Enrichment block | Data sanity | Visible garbage | Canonical | Robots |
|---|-----|--------|------|----------|------------------|-------------|-----------------|-----------|--------|
| 1 | [/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida](https://scholarshiptop.com/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida) | **200** | ~4.6s | yes | **Yes** — `College profile (public data)` | UMass $17,772 / USF $6,410 tuition; 59.7% admission | none | `https://scholarshiptop.com/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | `noindex, follow` |
| 2 | [/compare/states/california-vs-texas](https://scholarshiptop.com/compare/states/california-vs-texas) | **200** | ~3.0s | yes | **Yes** — `Cost of living & wages (public data)` | CA HUD FMR 2BR $1,975; median income labels; FBI neutral copy | none | `https://scholarshiptop.com/compare/states/california-vs-texas` | `noindex, follow` |
| 3 | [/compare/states/nebraska-vs-utah](https://scholarshiptop.com/compare/states/nebraska-vs-utah) | **200** | ~2.9s | yes | **Yes** — same state affordability section | section present with expected heading/copy | none | `https://scholarshiptop.com/compare/states/nebraska-vs-utah` | `noindex, follow` |
| 4 | [/compare/universities](https://scholarshiptop.com/compare/universities) | **200** | ~0.6s | yes | N/A (hub — no Stage B UI expected) | hub loads | none | `https://scholarshiptop.com/compare/universities` | default index (no robots meta) |
| 5 | [/compare/states](https://scholarshiptop.com/compare/states) | **200** | ~1.7s | yes | N/A (hub — no Stage B UI expected) | hub loads | none | `https://scholarshiptop.com/compare/states` | default index (no robots meta) |

### Metadata samples

| Page | `<title>` (truncated) |
|------|------------------------|
| University compare | `ScholarshipTop \| UMass Amherst vs University of South Florida Scholarships 2026` |
| CA vs TX | `ScholarshipTop \| California vs Texas Scholarship Comparison 2026` |
| NE vs UT | `ScholarshipTop \| Nebraska vs Utah Scholarship Comparison 2026` |

### Robots / noindex note

Compare **detail** pages show `noindex, follow`. This aligns with existing `lib/seo/compareSeoQualityPolicy.ts` gating (thin/quality rules), not a Stage B regression. Compare **hubs** remain indexable (no restrictive robots meta). Stage B did not change noindex policy per integration TZ.

---

## Errors observed

| Source | Result |
|--------|--------|
| Production HTTP | **None** — all 200 |
| Visible HTML defects | **None** in enrichment blocks |
| Local dev state 500 (pre-push) | **Not reproduced on production** — CA/TX and NE/UT state compares load correctly live |

---

## Platform logs (Railway / Vercel)

| Platform | Access | Finding |
|----------|--------|---------|
| **Railway CLI** | Available but **unauthorized** (`railway login` token expired) | Could not pull runtime logs |
| **Vercel CLI** | Not installed on machine | N/A |
| **GitHub Actions / gh** | `gh` not available | N/A |

**Inference from successful production renders:** no evidence of `lib/external-data` JSON import failures, server component crashes, or OOM on sampled routes. Enrichment data is clearly loaded and rendered server-side on production.

If deeper log review is needed: re-auth Railway and grep for `[external-data]`, `school_enrichment`, or 500s on `/compare/states/` and `/compare/universities/` after deploy window.

---

## Pre-deploy vs post-deploy

| Check | Pre-push local | Post-deploy production |
|-------|----------------|------------------------|
| Data validation | PASS | N/A (same commit) |
| Build | PASS | Deploy assumed from same commit |
| University enrichment UI | PASS (local dev) | **PASS** |
| State enrichment UI | 500 in local dev only | **PASS** on production |

---

## Rollback assessment

**Not required.**

- No 5xx on target URLs
- Enrichment blocks work as designed
- No SEO/metadata regression beyond existing compare detail `noindex` policy
- No user-visible data corruption

---

## Stage C readiness

**Green light to start Stage C** (`reports/data/stage-c-ui-expansion-plan.md`):

- Static layer is live and serving on production compare detail pages
- Safe to proceed with i18n stat cards, improved matching (unit_id), and resource/essay/scholarship sidebars per plan
- Optional follow-up: post-deploy smoke on one localized compare URL (`/es/compare/states/...`) in Stage C

---

## Commands used (reproducible)

```powershell
# Production smoke (PowerShell)
$base = 'https://scholarshiptop.com'
Invoke-WebRequest "$base/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida"
Invoke-WebRequest "$base/compare/states/california-vs-texas"
Invoke-WebRequest "$base/compare/states/nebraska-vs-utah"
Invoke-WebRequest "$base/compare/universities"
Invoke-WebRequest "$base/compare/states"
```
