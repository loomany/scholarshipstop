# Structured Data Audit and Safe Improvements - 2026-05-28

## Verdict

- Current structured data coverage is healthy across sampled public page types.
- No fake FAQ schema, news schema, or invented authors were added.
- Safe improvement applied indirectly: localized static essay detail pages now render their existing localized page content and metadata instead of 404/noindex, which makes their existing schema reachable.
- No additional structured data code was added in this stage because the sampled pages already have Organization/WebSite plus relevant page-level schema.

## Sampled structured data

Production samples:

| URL | JSON-LD scripts | Parsed types | Parse errors |
|---|---:|---|---:|
| `/` | 2 | `Organization`, `EducationalOrganization`, `WebSite`, `SearchAction`, `WebPage` | 0 |
| `/resources` | 3 | `Organization`, `WebSite`, `BreadcrumbList`, `ItemList` | 0 |
| `/resources/scholarships-for-international-students-guide` | 3 | `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage` | 0 |
| `/essays` | 3 | `Organization`, `WebSite`, `BreadcrumbList`, `ItemList` | 0 |
| `/essays/examples` | 4 | `Organization`, `WebSite`, `BreadcrumbList`, `Article`, `FAQPage` | 0 |
| `/compare` | 3 | `Organization`, `WebSite`, `BreadcrumbList`, `ItemList` | 0 |
| `/compare/scholarship-vs-grant` | 4 | `Organization`, `WebSite`, `BreadcrumbList`, `Article`, `FAQPage` | 0 |
| `/scholarships/category/stem` | 4 | `Organization`, `WebSite`, `BreadcrumbList`, `WebPage`, `ItemList`, `FAQPage` | 0 |
| `/providers` | 4 | `Organization`, `WebSite`, `BreadcrumbList`, `CollectionPage`, `ItemList` | 0 |
| `/providers/loyola-university-chicago` | 5 | `Organization`, `WebSite`, `BreadcrumbList`, `WebPage`, `FAQPage` | 0 |
| scholarship detail sample | 2 | `Organization`, `WebSite`, `EducationalOccupationalProgram`, `Offer`, `BreadcrumbList` | 0 |
| cross-country sample | 2 | `Organization`, `WebSite`, `WebPage`, `ItemList` | 0 |

## Findings

- Global Organization/WebSite schema exists and parses.
- BreadcrumbList is present on public hubs and detail pages sampled.
- Article schema exists on static essay and compare guide pages.
- FAQPage schema appears on sampled pages with FAQ-like guide content.
- Category pages use WebPage, ItemList, FAQPage, and breadcrumbs.
- Provider pages expose Organization-style schema plus breadcrumbs and FAQ.
- Scholarship detail sample uses education/offer-oriented schema and breadcrumbs.

## Safe improvement decision

No new schema was added because the current coverage is already broad and page-specific. Adding more schema in this pass would risk duplication or unsupported claims.

The localized static essay route fix is the relevant structured data improvement: sitemap URLs that previously returned 404/noindex now return real localized content and can expose the same localized page metadata/schema path as other static pilot pages.

## Remaining work

- Run rich-results validation on top pages after deploy.
- Review whether generated essay guides have visible FAQ sections exactly matching FAQPage JSON-LD.
- Consider provider-specific Organization subtype only when provider data is reliably typed.
- Add automated JSON-LD parse tests if structured data becomes more complex.

## Validation

- JSON-LD parse errors in sampled production pages: 0.
- `npm run build`: pass.

## Protected areas

No auth, payments, Lemon Squeezy, checkout, onboarding, Supabase RLS, DB schema, migrations, account/dashboard/profile, private user essay pages, private API endpoints, or pricing logic changed.
