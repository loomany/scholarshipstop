# Stage C4.1 post-deploy smoke plan

**Date:** 2026-05-31  
**Production base:** https://scholarshiptop.com  
**Expected commit message:** `fix(scholarships): show affordability sidebar on state routes`

---

## Preconditions

- Deploy includes C4.1 scoped diff only (page body + enrichment helper + reports).
- No Supabase migrations or env changes required.

---

## URLs to check

| ID | URL | Expect |
|----|-----|--------|
| S1 | `/scholarships/california` | 200, state sidebar **visible**, listing visible |
| S2 | `/scholarships/texas` | 200, state sidebar **visible** (gap fix) |
| S3 | `/scholarships/new-york` | 200, state sidebar **visible** (gap fix) |
| S4 | `/scholarships/florida` | 200, state sidebar **visible** |
| U1 | `/scholarships/texas/tarleton-state-university` | 200, **school card** present, strict match |
| U2 | `/scholarships/california/california-state-university-northridge` | 200, **school card** present (CSUN) |

---

## Per-URL checklist

For each URL record:

- [ ] HTTP status (200 for valid routes)
- [ ] Page loads without 500 / Next error overlay
- [ ] `scholarship-state-context-heading` present on S1–S4
- [ ] “Planning context” / “Cost of living in {State}” copy present on S1–S4
- [ ] Median income / FMR / living wage stat cards render with formatted values
- [ ] Scholarship list + filters still visible
- [ ] No visible `undefined`, `null`, `NaN`
- [ ] Canonical unchanged vs pre-deploy
- [ ] Robots unchanged vs pre-deploy (`noindex, follow` on state listings; `index, follow` on university hubs)

---

## C4.1 regression guards

| Check | Pass criteria |
|-------|---------------|
| California regression | Sidebar still present (S1) |
| Texas/NY gap closed | Sidebar present (S2, S3) |
| University strict match | Tarleton + CSUN cards correct (U1, U2) |
| Invalid slug | Unknown university slug still hides school card (optional: U3 from C4 smoke) |

---

## Rollback criteria

Rollback only if:

- 500 on state or university hub URLs
- Wrong college shown on university hubs
- Visible garbage tokens in sidebar
- Unexpected canonical/robots regression

**Sidebar missing on one state after deploy:** investigate cache/revalidate (300s) before rollback.

---

## Sign-off template

```
C4.1 production smoke: PASS / FAIL
SEO policy changed: no
Rollback needed: yes / no
```
