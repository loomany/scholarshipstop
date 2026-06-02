# D6 — Post-Deploy Smoke Result

**Date:** 2026-05-31  
**Deploy commit:** `2e92f67` — `feat(seo): add structured data for enriched pages`  
**Base URL:** https://scholarshiptop.com  
**Overall verdict:** **PASS** (8/8)  
**Rollback needed:** **no**

---

## Summary

| URL | HTTP | JSON-LD | Parse | Expected types | Forbidden types | Bad tokens | Canonical | Robots | Result |
|-----|------|---------|-------|----------------|-----------------|------------|-----------|--------|--------|
| `/resources/best-scholarship-websites` | 200 | 3 blocks | OK | BreadcrumbList, BlogPosting ✓ | none ✓ | none ✓ | self ✓ | default | **PASS** |
| `/resources/best-scholarships-texas-international-students` | 200 | 3 blocks | OK | BreadcrumbList, BlogPosting ✓ | none ✓ | none ✓ | self ✓ | default | **PASS** |
| `/essays/financial-need` | 200 | 4 blocks | OK | BreadcrumbList, Article ✓ (+ visible FAQPage) | none ✓ | none ✓ | self ✓ | default | **PASS** |
| `/providers/loyola-university-chicago` | 200 | 6 blocks | OK | Organization, EducationalOrganization ✓ | none ✓ | none ✓ | self ✓ | default | **PASS** |
| `/scholarships/texas` | 200 | 2 blocks | OK | BreadcrumbList, WebPage, ItemList ✓ (`@graph`) | none ✓ | none ✓ | self ✓ | `noindex, follow` *(pre-existing)* | **PASS** |
| `/scholarships/texas/tarleton-state-university` | 200 | 5 blocks | OK | BreadcrumbList, WebPage, ItemList, FAQPage ✓ | none ✓ | none ✓ | self ✓ | `index, follow` | **PASS** |
| `/compare/states/california-vs-texas` | 200 | 4 blocks | OK | BreadcrumbList, WebPage ✓ | none ✓ | none ✓ | self ✓ | `noindex, follow` *(pre-existing)* | **PASS** |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | 4 blocks | OK | BreadcrumbList, WebPage ✓ | none ✓ | none ✓ | self ✓ | `noindex, follow` *(pre-existing)* | **PASS** |

---

## Checks (all URLs)

| Criterion | Result |
|-----------|--------|
| HTTP 200 / no 500 | **PASS** 8/8 |
| `application/ld+json` present where expected | **PASS** |
| JSON-LD parses as valid JSON | **PASS** |
| Expected `@type` values present | **PASS** |
| No `undefined` / `null` / `NaN` in JSON-LD payloads | **PASS** |
| No fake Review / AggregateRating / Product / Offer / Course / LocalBusiness | **PASS** |
| Canonical self-referencing | **PASS** 8/8 |
| Robots policy unchanged by D6 | **PASS** — `noindex` on state hub + compare detail matches pre-D6 baseline |

---

## Notable live schema (page-level blocks)

### Resources
- **Generic:** BreadcrumbList + BlogPosting (+ layout publisher graph)
- **Texas article:** BreadcrumbList + BlogPosting

### Essays
- **Financial need:** BreadcrumbList + Article + FAQPage (matches visible FAQ content)

### Provider — Loyola
- BreadcrumbList, WebPage, Organization, **EducationalOrganization** (with PostalAddress from Scorecard match), FAQPage

### Scholarships
- **Texas state hub:** `@graph` with BreadcrumbList, WebPage, ItemList (scholarship cards)
- **Tarleton university hub:** BreadcrumbList, WebPage, ItemList, FAQPage (visible FAQ accordion)

### Compare detail
- BreadcrumbList, WebPage, FAQPage (visible FAQ) — unchanged from pre-D6 compare wiring

---

## Global layout graph (all pages)

Each page also includes the root layout `@graph` (Organization, EducationalOrganization publisher, WebSite, SearchAction). This is expected and unchanged by D6 page-level work.

---

## Rollback decision

**No.** All smoke criteria pass. No invalid JSON-LD, no forbidden schema types, no canonical regressions, and robots values match known pre-D6 policy for indexed vs noindex routes.

---

## Method

Production HTML fetched via HTTPS; all `<script type="application/ld+json">` blocks extracted, parsed with `ConvertFrom-Json`, and `@type` values collected recursively (including `@graph` nodes).
