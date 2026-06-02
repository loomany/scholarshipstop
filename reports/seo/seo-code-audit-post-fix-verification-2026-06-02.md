# SEO Code Audit Post-Fix Verification — 2026-06-02

## Verdict

**PASS_WITH_WARNINGS**

The implemented SEO fixes are internally consistent for scholarship detail metadata, FAQ schema, resource/essay canonical guards, Article JSON-LD, and validation commands. Warnings are listed below for production follow-up.

## What Was Checked

- **Sitemap vs metadata:** scholarship detail metadata uses `getScholarshipDetailIndexPolicy()`, and sitemap generation now applies the same policy before including detail URLs.
- **FAQ visible vs JSON-LD:** scholarship detail visible FAQ and FAQPage JSON-LD use the same strict FAQ source. Legacy/schema-only fallback FAQ is not emitted.
- **Listing quality policy:** programmatic listing metadata and sitemap both route through `getScholarshipSeoRouteQualityPolicy()`. Removed legacy/manifest live thin evaluators are no longer active.
- **Canonical guard:** no-essay resource/essay explainers canonicalize to `/scholarships/no-essay`; normal resources/essays remain indexable.
- **Article E-E-A-T:** resources and essays expose visible byline/reviewer and Article JSON-LD Person author + reviewedBy.
- **Tests/build:** required commands passed.

## URL Verification Table

| URL | Type | Meta robots | Canonical | In sitemap | Visible FAQ | JSON-LD FAQ | Expected | Result |
|---|---|---|---|---:|---:|---:|---|---|
| `/scholarships/nbcc-minority-fellowship-program-for-addictions-counselors-nbcc-minority-fellowship-program` | Scholarship detail, indexable | `index, follow` | self | Yes by sitemap generation policy | 0 | 0 | index + sitemap | PASS |
| `/scholarships/kerrie-ervin-realtor-scholarship-qvfaom6ijbul` | Scholarship detail, indexable | `index, follow` | self | Yes by sitemap generation policy | 0 | 0 | index + sitemap | PASS |
| `/scholarships/sage-de-i-scholarship-award-sage-deandi-scholarship-award` | Scholarship detail, weak | `noindex, follow` | self | No | 0 | 0 | noindex + not in sitemap | PASS |
| `/scholarships/elizabeth-garde-national-scholarship-elizabeth-garde-national-scholar` | Scholarship detail, weak | `noindex, follow` | self | No | 0 | 0 | noindex + not in sitemap | PASS |
| `/scholarships/girls-for-gaming-scholarship-girls-for-gaming-scholarship` | Scholarship detail, expired | `noindex, follow` | self | No | 0 | 0 | noindex + not in sitemap | PASS |
| `/scholarships/john-kitt-memorial-aact-scholarship-fund-john-kitt-memorial-aact-scholars` | Scholarship detail, expired | `noindex, follow` | self | No | 0 | 0 | noindex + not in sitemap | PASS |
| `/scholarships/ruby-a-carter-memorial-scholarship-nezjszcwluq0` | Scholarship detail, FAQ positive | `index, follow` | self | Not checked in shard | 4 | 4 | visible FAQ = JSON-LD FAQ | PASS |
| `/scholarships/doyle-and-mildred-carlton-scholarship-sjpkmtwzedc0` | Scholarship detail, FAQ positive | `index, follow` | self | Not checked in shard | 5 | 5 | visible FAQ = JSON-LD FAQ | PASS |
| `/scholarships/no-essay` | Scholarship listing winner | `noindex, follow` | self | No | 0 | 0 | intended winner for no-essay | WARNING |
| `/resources/no-essay-scholarships-guide` | Resource, no-essay overlap | `noindex, follow` | `/scholarships/no-essay` | No | N/A | 2 | canonicalized to winner | PASS |
| `/essays/no-essay-scholarships` | Essay, no-essay overlap | `noindex, follow` | `/scholarships/no-essay` | No | N/A | 2 | canonicalized to winner | PASS |
| `/scholarships/closing-soon` | Scholarship listing winner | `index, follow` | self | Yes | 0 | 0 | index + sitemap | PASS |
| `/resources/scholarships-closing-soon-guide` | Resource, closing-soon overlap | 404 | N/A | No | N/A | 0 | absent if unpublished | PASS |
| `/essays/scholarships-closing-soon` | Essay, closing-soon overlap | 404 | N/A | No | N/A | 0 | absent if unpublished | PASS |
| `/resources/verified-staff-pages-scholarship-trust` | Normal resource | `index, follow` | self | Yes | N/A | 0 | remains indexable | PASS |
| `/resources/public-speaking-scholarships-usa` | Normal resource | `index, follow` | self | Yes | N/A | 0 | remains indexable | PASS |
| `/resources/track-scholarship-deadlines-usa` | Normal resource, deadline topic | `index, follow` | self | Yes | N/A | 0 | not caught by guard | PASS |
| `/resources/scholarships-usa-deadline-january` | Normal resource, deadline topic | `index, follow` | self | Yes | N/A | 0 | not caught by guard | PASS |
| `/essays/examples` | Normal essay | `index, follow` | self | Yes | N/A | page FAQ | remains indexable | PASS |
| `/essays/outline` | Normal essay | `index, follow` | self | Yes | N/A | page FAQ | remains indexable | PASS |

Notes:

- FAQ positive pages matched semantically. Rendered visible HTML encodes apostrophes as entities (`&#x27;`), while JSON-LD stores plain apostrophes.
- Scholarship detail sitemap membership for the six detail samples was verified through the sitemap generation code path and DB policy output. Local rendered `/sitemaps/scholarships-0.xml` timed out during verification because the shard is expensive after applying detail policy to full detail payloads.

## Risks Found

- `/scholarships/no-essay` is currently `noindex, follow` and absent from the checked sitemap paths, while no-essay resource/essay pages canonicalize to it as the winner. This is not a canonical guard overreach, but it weakens the selected winner URL and should be reviewed before relying on no-essay as an SEO traffic page.
- No published exact `/resources/scholarships-closing-soon-guide` or `/essays/scholarships-closing-soon` page exists in current data; both return 404. The guard has candidate support for those slugs, but there was no live page to canonicalize.
- The guard is not too broad in the tested set. Deadline-related resource pages such as `/resources/track-scholarship-deadlines-usa` and `/resources/scholarships-usa-deadline-january` stayed indexable.
- Some DB-generated essay pages remain `noindex` under the existing essay quality policy. Static evergreen essay guides (`/essays/examples`, `/essays/outline`) remain indexable.

## Article E-E-A-T

Checked resources and essays show visible authorship and matching schema:

- Visible byline: `By Daur, ScholarshipTop founder and scholarship data reviewer`.
- Visible reviewer: `Reviewed by ScholarshipTop editorial review`.
- Article JSON-LD author: `Person`, name `Daur`.
- Article JSON-LD reviewedBy: `ScholarshipTop editorial review`.
- Published and modified dates are present for checked resource/essay pages.

## Validation Commands

| Command | Result |
|---|---|
| `npm run test:seo-lib` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run seo:validate-jsonld` | PASS |
| `npm run build` | PASS |

Additional local verification:

- Started local production server with `npm run start -- -p 3100`.
- Ran targeted rendered HTML checks for metadata, canonical, robots, FAQ JSON-LD, Article JSON-LD, visible bylines, and selected sitemap documents.

## Production/GSC Next Steps

- In Google Search Console URL Inspection, test:
  - `/scholarships/nbcc-minority-fellowship-program-for-addictions-counselors-nbcc-minority-fellowship-program`
  - `/scholarships/sage-de-i-scholarship-award-sage-deandi-scholarship-award`
  - `/scholarships/girls-for-gaming-scholarship-girls-for-gaming-scholarship`
  - `/scholarships/ruby-a-carter-memorial-scholarship-nezjszcwluq0`
  - `/resources/no-essay-scholarships-guide`
  - `/essays/no-essay-scholarships`
  - `/scholarships/no-essay`
  - `/scholarships/closing-soon`
- Re-fetch and inspect sitemap shards after deploy:
  - `/sitemaps/scholarships-0.xml`
  - `/sitemaps/seo.xml`
  - `/sitemaps/resources.xml`
  - `/sitemaps/essays-0.xml`
- Specifically confirm in production that noindex scholarship detail URLs are absent from scholarship sitemap shards and that indexable scholarship detail URLs remain present.
- Decide whether `/scholarships/no-essay` should be promoted to `index, follow`; currently canonicalized pages point to a noindex winner.
