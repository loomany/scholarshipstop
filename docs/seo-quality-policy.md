# ScholarshipTop SEO Quality Policy

Last updated: 2026-05-16

ScholarshipTop should be treated as a verified scholarship intelligence platform, not a raw listing aggregator. A page is indexable only when it has clear student value, visible trust signals, and a canonical route.

## Core Principles

- Do not copy provider text as the primary value of a page.
- Do not invent scholarship facts, review dates, winners, experts, or verification claims.
- Do not generate thousands of weak pages just because filter combinations exist.
- Do not index search results, query-parameter views, user-specific pages, private pages, onboarding, saved lists, or temporary technical routes.
- Do not hide critical official-source and trust information from users on indexable public pages.
- Always tell students to confirm final requirements on the official provider page.

## Scholarship Detail Pages

Index only if all of these are true:

- The page is canonical and self-resolving.
- The listing has an official source, official application route, or high-confidence source signal.
- The page has an original summary or explanatory layer, not only raw copied listing text.
- At least three meaningful facts are present: deadline, award value, provider/source, eligibility, documents, study level, field, host country, applicant country, or official application path.
- Missing critical fields are transparently flagged.
- The page displays source status, deadline urgency, application difficulty, review status or unavailable-review status, what to verify, and financial aid disclaimer links.
- JSON-LD is aligned with visible page content.

Noindex if any of these are true:

- No source or source is unclear.
- Raw/thin listing with no original student guidance.
- Fewer than three meaningful facts.
- Expired and no evergreen value or future-cycle context.
- Duplicate/generic page with no listing-specific value.
- Explicit `is_indexable=false`.

Required visible blocks for future detail pages:

- ScholarshipTop quick verdict
- Best for
- Not ideal for, when confidently derived
- Eligibility decoded or eligibility missing-data flag
- Application difficulty with reason
- Deadline urgency
- Award value context
- Required documents or required-documents unclear flag
- What to verify before applying
- Official source status
- Last reviewed, last verified, or review status unavailable
- Similar scholarships or related hubs when available
- Listing-specific FAQ, not generic FAQ spam
- Financial aid disclaimer

## Category Pages

Index only if:

- At least 10 quality listings are available for the category.
- The category has a unique 120-180 word intro that explains the student intent.
- The page includes "How to choose this category of scholarships" guidance.
- FAQ is specific to the category.
- Internal links point to related categories, country hubs, guides, methodology, and disclaimer.
- ItemList, CollectionPage, BreadcrumbList, and visible FAQ schema are consistent.
- Title and description are unique.

Noindex if:

- Low result count.
- Generic intro that only swaps the category name.
- High overlap with another category page.
- No specific FAQ or internal links.
- Generated from query parameters rather than a curated canonical route.

Priority indexable categories:

- STEM
- Engineering
- Medical
- Business
- Women
- International students
- Undergraduate
- Graduate
- High school seniors
- First-generation students
- Transfer students
- No essay
- Easy apply

## Country And Cross-Country Pages

Index only if:

- The route is approved in the country or cross-country manifest.
- There are enough strict listings to satisfy the student intent.
- The intro includes route-specific context, not only country-name substitution.
- The page explains visa, enrollment, level, document, or deadline caveats when relevant.
- FAQ is specific to the country or country pair.
- Internal links connect related countries, categories, guides, methodology, and disclaimer.
- Sitemap inclusion is limited to approved/indexable entries.

Noindex if:

- Low listing count.
- Manual-review status or insufficient local context.
- Generic copy.
- Duplicate overlap with a stronger country route.
- The route is a filter/query view rather than a curated canonical route.

## Search, Filters, Pagination, And User Pages

Keep as noindex:

- `/scholarships?page=2` and later pages: `noindex, follow` with canonical `/scholarships`.
- Search query URLs.
- Filter query URLs.
- Saved, ignored, started, submitted, or user-specific pages.
- Onboarding, auth, checkout, subscription state, and private account pages.
- Any page with query parameters that do not represent a canonical SEO route.

Do not include noindex/query pages in sitemap.

## Resources And Guides

Index only if:

- The guide has original helpful content.
- It answers a real student intent.
- It includes checklists, examples, internal links, and a clear next step.
- It links to relevant scholarship hubs and detail pages when useful.
- It includes Article or BlogPosting schema, BreadcrumbList, dateModified, and visible author/organization context.
- It avoids generic AI filler.

Priority resource clusters:

- Scholarship search strategy
- Application checklist
- Essay guidance
- Country-specific guides
- Student audience guides
- Deadline/monthly planning
- Scam and safety prevention
- Financial aid explainers
- Comparison pages
- Program-specific explainers

## Schema Rules

Sitewide:

- Organization with real name, URL, logo, and support email when available.
- WebSite with SearchAction.

Homepage:

- WebPage
- Organization
- WebSite
- SearchAction

Catalog, category, country, and cross-country pages:

- CollectionPage
- ItemList
- BreadcrumbList
- FAQPage only when the FAQ is visible and specific.

Scholarship detail pages:

- EducationalOccupationalProgram when the page describes a scholarship/program opportunity.
- Offer only when a monetary award amount is structured and trustworthy enough.
- FAQPage only when visible FAQ content is present.
- BreadcrumbList.
- dateModified from last verified or updated timestamp when available.

Resources:

- Article or BlogPosting.
- BreadcrumbList.
- FAQPage only when visible and non-spammy.

Trust pages:

- WebPage.
- AboutPage for `/about` where supported by the route.

Do not add unsupported schema types or properties only to chase rich results.

## Sitemap Inclusion Rules

Include:

- Homepage and core public hubs.
- Trust pages.
- Resources that are published and indexable.
- Scholarship detail pages with `is_indexable !== false` and enough quality signals.
- Promoted category pages only.
- Approved country and cross-country routes only.
- Programmatic SEO routes only when listing count and quality gates pass.

Exclude:

- Query URLs.
- Noindex URLs.
- Expired/thin/raw scholarship pages.
- Search/filter/pagination pages beyond the canonical root.
- User-specific, onboarding, auth, checkout, and account pages.
- Manual-review country or cross-country routes.

## Forbidden SEO Practices

- Copying official provider text as the main content layer.
- Doorway pages.
- Hidden text.
- Fake reviews, fake winners, fake verification claims, or fake experts.
- Guaranteed scholarship, guaranteed eligibility, or guaranteed award claims.
- Indexing every filter combination.
- Publishing AI-thin articles without original examples, guidance, and links.
- Selling unlabeled ranking placement.

## Future Publishing Checklist

Before publishing an indexable page, confirm:

- Canonical route exists and no query parameter is required.
- Title and description are unique.
- H1 matches a clear search intent.
- Page has original explanatory content.
- Page has visible source/trust/disclaimer context.
- Page links to relevant hubs, resources, and methodology.
- Schema mirrors visible content.
- No duplicate or near-duplicate page already answers the same intent better.
- Sitemap inclusion matches the index policy.
