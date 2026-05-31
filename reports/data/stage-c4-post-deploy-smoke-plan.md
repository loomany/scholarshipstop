# Stage C4 post-deploy smoke plan

**Date:** 2026-05-31  
**Deploy commit (after approval):** `feat(scholarships): add static affordability sidebars`  
**Production base:** https://scholarshiptop.com  
**Method:** Live HTTP fetch + HTML inspection (read-only)

---

## Overall pass criteria

| Check | Pass condition |
|-------|----------------|
| HTTP status | 200 on all primary URLs |
| Server errors | No 500 / Next error page |
| State sidebar | Visible on state hub URLs with affordability stats |
| University sidebar | School card when match confident; state section always when state resolves |
| Wrong college | None on sampled university hubs |
| Unknown/ambiguous university | School card hidden; state section may still show |
| Garbage tokens | No visible `undefined`, `null`, `NaN` |
| Canonical | Self-referencing on indexable pages |
| Robots | Unchanged from pre-C4 policy |
| Performance | No obvious regression (note response times) |

---

## Primary URLs

### State scholarship hubs

| # | URL | Expected sidebar |
|---|-----|------------------|
| 1 | [/scholarships/california](https://scholarshiptop.com/scholarships/california) | **Cost of living in California** + stat cards |
| 2 | [/scholarships/texas](https://scholarshiptop.com/scholarships/texas) | **Cost of living in Texas** + stat cards |
| 3 | [/scholarships/new-york](https://scholarshiptop.com/scholarships/new-york) | **Cost of living in New York** + stat cards |

**HTML signals:**

- Heading: `Cost of living in {State}`
- Copy: `Public reference data for planning context`
- Footer: `Census ACS, HUD FMR, MIT Living Wage, and BLS`
- Optional: neutral public safety footnote (not safety rating language)

---

### University scholarship hubs

| # | URL | Expected |
|---|-----|----------|
| 4 | [/scholarships/texas/tarleton-state-university](https://scholarshiptop.com/scholarships/texas/tarleton-state-university) | Tarleton school card + Texas affordability |
| 5 | [/scholarships/california/stanford-university](https://scholarshiptop.com/scholarships/california/stanford-university) | Stanford match if hub exists; else verify 200/fallback |
| 6 | [/scholarships/california/university-of-california-los-angeles](https://scholarshiptop.com/scholarships/california/university-of-california-los-angeles) | UCLA match if hub exists |

**If slug 404/redirect:** pick alternate from sitemap `seo.xml` university hub entries.

**HTML signals (university):**

- `{school_name} — college cost context` when matched
- `Matched from College Scorecard by school name and state`
- `{State} affordability` subsection
- Footer: `Not a ScholarshipTop verification of linked scholarships`

---

### Negative controls

| URL | Expected |
|-----|----------|
| `/scholarships/hub/all` or non-state manifest | No state sidebar (no state slug context) |
| University hub with foundation-like name (if exists) | School card hidden; state section may show |

---

## SEO policy regression checks

| Page type | Canonical | Robots |
|-----------|-----------|--------|
| State hub (indexable) | `/scholarships/{state}` | index (default or explicit index) |
| University hub | `/scholarships/{state}/{slug}` | index |
| Query-noise scholarship URLs | unchanged noindex behavior | must match pre-deploy |

**Do not expect changes** to any metadata fields from C4.

---

## Localized inheritance (optional spot check)

| URL | Notes |
|-----|-------|
| `/es/scholarships/california` | Should inherit state sidebar via shared body |
| `/fr/scholarships/texas/tarleton-state-university` | Should inherit university sidebar if route resolves |

---

## Rollback triggers

Rollback if any of:

- HTTP 500 on state/university hub URLs
- Wrong college name in school context card
- Visible undefined/null/NaN
- Canonical or robots policy drift on sampled pages
- Scholarship list fails to load

---

## Report output

After deploy, create (optional):

```text
reports/data/stage-c4-post-deploy-smoke.md
```

With URL table, pass/fail, response times, and rollback recommendation.
