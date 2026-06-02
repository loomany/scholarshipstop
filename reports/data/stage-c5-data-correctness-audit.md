# Stage C5 data correctness audit

**Date:** 2026-05-31  
**Production base:** https://scholarshiptop.com  
**Method:** Live HTML signals + strict-match design review

---

## Summary

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Provider strict school match (Loyola) | Show school context card | `provider-school-context-heading`, `In-state tuition`, matched copy | **PASS** |
| Foundation / non-school provider (Alamo) | Hide card | No provider-school block | **PASS** |
| Generic resource topic | Hide context | No planning/state card | **PASS** |
| Texas-specific resource | Show state context | `Planning context` present | **PASS** |
| Generic essay topic | Hide context | No external context card | **PASS** |
| Scholarship state (TX/NY/CA) | Correct state sidebar | `scholarship-state-context-heading`, FMR/income stats | **PASS** |
| Scholarship university (Tarleton) | School card + listing | `college cost context`, Tarleton name | **PASS** |
| Unknown university slug (C4.1 reference) | Hide school card | No school card on fake slug | **PASS** (prior smoke) |

**Verdict:** **PASS**

---

## Provider strict matching

### Loyola University Chicago (`/providers/loyola-university-chicago`)

- **Card present:** `College / provider context`
- **Signals:** `In-state tuition`, `Matched to … from College Scorecard`
- **Strict match behavior:** Unambiguous name+state → single Scorecard row

### Alamo Colleges Foundation (`/providers/alamo-colleges-foundation`)

- **Card absent:** No `provider-school-context-heading`
- **Reason:** Foundation name does not resolve to unambiguous school row (`matchProviderToSchool` → null)

---

## Content hub enrichment gating

### Generic resource (`/resources/best-scholarship-websites`)

- Slug on generic topic blocklist via `resolveContentEnrichmentContext`
- **No** `Planning context` / state card — correct

### Texas resource (`/resources/best-scholarships-texas-international-students`)

- **Planning context** card present
- State derived from content hints (Texas topic) — not a wrong-state leak

### Generic essay (`/essays/financial-need`)

- **No** external context card — correct for generic slug

---

## Scholarship pages

### State affordability sidebar

Sampled `/scholarships/california`, `/texas`, `/new-york`:

- Sidebar shows **correct state name** in heading (`Cost of living in {State}`)
- Stat cards use formatted currency (no raw JSON numbers / NaN)
- Post C4.1: Texas/New York match California behavior

### University hub (`/scholarships/texas/tarleton-state-university`)

- **School card:** `college cost context` with Tarleton State University
- **State subsection:** present inside university sidebar when data available
- **Listing:** scholarship matches visible

### Negative control (C4.1 smoke, not re-run in C5 batch)

`/scholarships/texas/not-a-real-university-xyz-999` — no school card, fallback listing, `noindex`. Still valid reference behavior.

---

## Duplicate key WARNs (validation)

`npm run data:validate-enrichment` reports 40 school name+state duplicate keys. Strict matching returns **null** on ambiguity — observed behavior (Alamo hidden, Loyola shown) aligns with policy. **Not a production correctness failure.**

---

## Visible data quality

| Check | Result |
|-------|--------|
| `undefined` / `null` / `NaN` in enrichment UI | **None** (snippet inspection) |
| Wrong college on university hub | **None** on Tarleton sample |
| Wrong state on Texas resource | **None** |

---

## Rollback trigger?

**No** — data correctness criteria met.
