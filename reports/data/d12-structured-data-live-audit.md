# D12 Structured Data Live Audit

Date: 2026-06-01  
Base: https://scholarshiptop.com  
Validator: `npm run seo:validate-jsonld` (repo) + live HTML JSON-LD parse

## Verdict

**PASS** — all checked routes return parseable JSON-LD with expected types; no new fake Review/AggregateRating/Product schema in JSON-LD blocks; D6 policy unchanged.

## Route-by-Route Findings

### `/resources/medical-scholarships-guide`

| Check | Result |
|---|---|
| JSON-LD blocks | 3 |
| @types | Organization/WebSite (global), BreadcrumbList, **FAQPage** |
| D11 new sections | Plain HTML only — no new schema types (correct) |
| Parses | yes |
| null/undefined/NaN in visible copy | none |
| Fake Review/Rating/Product/Offer/Course in JSON-LD | none |

Note: HTML page body may contain editorial words like “Review” or “Course” in article copy — not emitted as schema types.

### `/resources/best-scholarships-texas-international-students`

| Check | Result |
|---|---|
| JSON-LD blocks | 3 |
| @types | Organization/WebSite, BreadcrumbList, **BlogPosting** |
| Parses | yes |
| Matches visible content | yes — article-style resource |

### `/essays/career-goals`

| Check | Result |
|---|---|
| JSON-LD blocks | 4 |
| @types | Organization/WebSite, BreadcrumbList, **Article**, **FAQPage** |
| D11 planning section | No schema change (correct) |
| Parses | yes |

### `/providers/loyola-university-chicago`

| Check | Result |
|---|---|
| JSON-LD blocks | 6 |
| @types | Organization/WebSite, BreadcrumbList, WebPage, **Organization**, **EducationalOrganization**, FAQPage |
| School match schema | EducationalOrganization aligns with visible Scorecard school context |
| Parses | yes |

### `/scholarships/texas`

| Check | Result |
|---|---|
| JSON-LD blocks | 2 |
| @types | Organization/WebSite, BreadcrumbList + **WebPage** + **ItemList** |
| Parses | yes |
| ItemList | Scholarship listing schema — matches visible list |

### `/scholarships/texas/tarleton-state-university`

| Check | Result |
|---|---|
| JSON-LD blocks | 5 |
| @types | Organization/WebSite, BreadcrumbList, WebPage, ItemList, FAQPage |
| Parses | yes |

### `/compare/states/california-vs-texas`

| Check | Result |
|---|---|
| JSON-LD blocks | 4 |
| @types | Organization/WebSite, BreadcrumbList, WebPage, FAQPage |
| Parses | yes |
| Enrichment data in schema | Not over-claimed — affordability shown in HTML, not fake AggregateRating |

### `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`

| Check | Result |
|---|---|
| JSON-LD blocks | 4 |
| @types | Organization/WebSite, BreadcrumbList, WebPage, FAQPage |
| Parses | yes |

## Cross-Cutting Checks

| Policy | Status |
|---|---|
| JSON-LD parses on all 8 routes | **PASS** |
| Expected @type present per page kind | **PASS** |
| No Review / AggregateRating in JSON-LD | **PASS** |
| No Product / Offer / Course schema added by enrichment | **PASS** |
| No undefined/null/NaN strings in visible enriched copy | **PASS** |
| Schema matches visible content (no invisible FAQ/rating spam) | **PASS** |
| Canonical / robots / sitemap policy | **Unchanged** |
| Repo validator (`seo:validate-jsonld`) | **PASS** — 13 blocks, 10 cases |

## False Positive Note

Raw HTML grep for words `Review`, `Offer`, `Product`, `Course` matches **editorial copy and UI labels**, not JSON-LD `@type` fields. Live JSON-LD extraction confirms safe types only.

## Rollback

Not needed for structured data.
