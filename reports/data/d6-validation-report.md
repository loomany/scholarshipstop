# D6 — Validation Report

**Date:** 2026-05-31

## Static checks

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| `npm run seo:validate-jsonld` | **PASS** — 13 blocks / 10 cases |
| `npx tsx --test lib/seo/__tests__/jsonLd.test.ts` | **PASS** — 4/4 |

## Local JSON-LD smoke (`localhost:3006`, built app)

| URL | HTTP | Expected types | Result |
|-----|------|----------------|--------|
| `/resources/best-scholarship-websites` | 200 | BreadcrumbList, BlogPosting | **PASS** |
| `/resources/best-scholarships-texas-international-students` | 200 | BreadcrumbList, BlogPosting | **PASS** |
| `/essays/financial-need` | 200 | BreadcrumbList, Article | **PASS** (+ visible FAQPage) |
| `/providers/loyola-university-chicago` | 200 | BreadcrumbList, WebPage, EducationalOrganization | **PASS** |
| `/compare/states/california-vs-texas` | 200 | BreadcrumbList, WebPage | **PASS** |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | BreadcrumbList, WebPage | **PASS** |
| `/scholarships/texas` | 200 | BreadcrumbList, WebPage, ItemList | **PASS** (`@graph`) |
| `/scholarships/texas/tarleton-state-university` | 200 | BreadcrumbList, WebPage, ItemList, FAQPage | **PASS** |

All pages: valid JSON-LD, no `undefined`/`null`/`NaN` leaks in scripts.

## SEO policy

| Area | Changed |
|------|---------|
| canonical | **no** |
| robots/noindex | **no** |
| sitemap | **no** |
| Supabase/Auth/Payments | **no** |

## Verdict

**D6 validation PASS** — ready for scoped commit pending approval.
