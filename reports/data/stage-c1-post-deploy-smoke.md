# Stage C1 post-deploy smoke

**Date:** 2026-05-31  
**Deployed commit:** `02027a3` — `feat(compare): polish external enrichment cards`  
**Production base:** https://scholarshiptop.com  
**Method:** Live HTTP fetch + HTML inspection (read-only)

---

## Overall result

| Verdict | **PASS** |
|---------|----------|
| Rollback needed? | **No** |
| Stage C2 can start? | **Yes** |

All five URLs returned **HTTP 200**. C1 card UI is live on compare detail pages (new headings, stat cards, source footers). Old Stage B table headings are **not** present. No visible `undefined` / `null` / `NaN`. Canonical and robots match existing compare policy.

---

## URL results

| # | URL | Status | Time | Loads OK | C1 enrichment | Visible garbage | Canonical | Robots |
|---|-----|--------|------|----------|---------------|-----------------|-----------|--------|
| 1 | [/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida](https://scholarshiptop.com/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida) | **200** | ~4.2s | yes | **Yes** | none | correct | `noindex, follow` |
| 2 | [/compare/states/california-vs-texas](https://scholarshiptop.com/compare/states/california-vs-texas) | **200** | ~1.9s | yes | **Yes** | none | correct | `noindex, follow` |
| 3 | [/compare/states/nebraska-vs-utah](https://scholarshiptop.com/compare/states/nebraska-vs-utah) | **200** | ~3.1s | yes | **Yes** | none | correct | `noindex, follow` |
| 4 | [/compare/universities](https://scholarshiptop.com/compare/universities) | **200** | ~4.3s | yes | N/A (hub) | none | correct | default index |
| 5 | [/compare/states](https://scholarshiptop.com/compare/states) | **200** | ~1.2s | yes | N/A (hub) | none | correct | default index |

---

## C1-specific checks (detail pages)

### University compare (#1)

| Signal | Production |
|--------|------------|
| New heading “College cost & outcomes” | **Present** |
| Old heading “College profile (public data)” | **Absent** (C1 deployed) |
| Stat card markup (`uppercase tracking-wide` labels) | **Present** |
| 2-column card grid (`grid-cols-2`) | **Present** |
| Sample data: UMass in-state **$17,772** | **Present** |
| Footer: “College Scorecard / OpenAlex / ROR where available” | **Present** |

### State compare (#2, #3)

| Signal | CA vs TX | NE vs UT |
|--------|----------|----------|
| New heading “Cost of living & wages” | yes | yes |
| Old “(public data)” suffix in H2 | no | no |
| Stat cards | yes | yes |
| Footer: Census ACS, HUD FMR, MIT, BLS | yes | yes |
| Neutral safety copy (“not a safety rating”) | yes | yes |
| CA FMR 2BR **$1,975** | yes | N/A (expected) |

### Hubs (#4, #5)

| Signal | Result |
|--------|--------|
| Enrichment section IDs absent | **Yes** — no accidental C1 blocks on hubs |
| Indexable (no restrictive robots meta) | **Yes** — unchanged |

---

## Mobile layout (HTML heuristic)

Responsive classes present on enrichment sections:

- `grid-cols-2` for stat cards (stacks two cards per row on narrow viewports)
- `sm:px-4`, `md:grid-cols-2` on section columns

Full visual QA on real devices not performed in this run (headless HTTP only). Layout signals match C1 implementation.

---

## Metadata / SEO policy

| Page type | Canonical | Robots | Change from Stage B? |
|-----------|-----------|--------|---------------------|
| Compare detail | Self-referencing HTTPS URL | `noindex, follow` | **No** |
| Compare hubs | Self-referencing HTTPS URL | default index | **No** |

C1 did not touch metadata generation — policy unchanged.

---

## Platform logs

| Source | Access | Result |
|--------|--------|--------|
| Railway CLI | Token expired (`railway login` required) | Logs not retrieved |
| Vercel / gh | Not available | N/A |

**Inference:** Successful 200 responses with full C1 HTML indicate no production crash from `lib/external-data`, JSON imports, or server components on sampled routes.

---

## Visual / data issues

| Issue | Severity | Notes |
|-------|----------|-------|
| None blocking | — | All checks pass |
| Response times 1.9–4.3s on detail pages | low | Dynamic SSR + Supabase; within prior compare range |
| Headless mobile check only | info | Recommend optional manual spot-check on phone |

---

## Rollback assessment

**Not required.**

- C1 UI live and correct vs `02027a3`
- No 5xx, no visible data corruption
- SEO policy unchanged
- Stage B data layer still functioning (formatted values render)

---

## Stage C2 readiness

**Green light** per `reports/data/stage-c-ui-expansion-plan.md`:

| Next C2 candidates | Status |
|--------------------|--------|
| i18n for enrichment labels/footers | Ready to plan |
| Localized compare routes smoke | Recommended after C2 i18n |
| Hub teaser cards | Ready |
| `unit_id` matching improvement | Ready |
| Resources/essays/provider sidebars | Still out of scope until dedicated stage |

Optional follow-up: post-deploy smoke on one `/es/compare/...` URL when C2 i18n ships.

---

## Commands used

```powershell
$base = 'https://scholarshiptop.com'
Invoke-WebRequest "$base/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida"
Invoke-WebRequest "$base/compare/states/california-vs-texas"
Invoke-WebRequest "$base/compare/states/nebraska-vs-utah"
Invoke-WebRequest "$base/compare/universities"
Invoke-WebRequest "$base/compare/states"
```
