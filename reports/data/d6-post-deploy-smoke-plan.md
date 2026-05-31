# D6 — Post-Deploy Smoke Plan

**Date:** 2026-05-31  
**Deploy:** After merge of `feat(seo): add structured data for enriched pages`

## URLs (8)

1. https://scholarshiptop.com/resources/best-scholarship-websites
2. https://scholarshiptop.com/resources/best-scholarships-texas-international-students
3. https://scholarshiptop.com/essays/financial-need
4. https://scholarshiptop.com/providers/loyola-university-chicago
5. https://scholarshiptop.com/compare/states/california-vs-texas
6. https://scholarshiptop.com/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida
7. https://scholarshiptop.com/scholarships/texas
8. https://scholarshiptop.com/scholarships/texas/tarleton-state-university

## Expected JSON-LD `@type` values

| URL | Minimum expected types |
|-----|------------------------|
| Generic resource | BreadcrumbList, BlogPosting |
| Texas resource | BreadcrumbList, BlogPosting |
| Financial need essay | BreadcrumbList, Article |
| Loyola provider | BreadcrumbList, WebPage, EducationalOrganization (if school match renders) |
| State compare detail | BreadcrumbList, WebPage |
| University compare detail | BreadcrumbList, WebPage |
| Texas state hub | BreadcrumbList, WebPage, ItemList (in `@graph`) |
| Tarleton university hub | BreadcrumbList, WebPage, ItemList, FAQPage |

## Pass criteria

- [ ] HTTP 200 on all URLs
- [ ] Each `<script type="application/ld+json">` parses as valid JSON
- [ ] No `"undefined"`, `"null"`, or `NaN` in JSON-LD payloads
- [ ] FAQPage only where visible FAQ accordion/section exists
- [ ] No Review/AggregateRating/Product/Offer/Course schema introduced
- [ ] canonical link still self-referencing
- [ ] robots meta unchanged vs pre-D6 baseline for each URL
- [ ] Rollback **no** unless invalid JSON-LD or policy regression

## Quick validation command

```bash
npm run seo:validate-jsonld
```

Optional live HTML spot-check with Rich Results Test or Search Console URL inspection after deploy.
