# SEO Pages

Current cleaned SEO route set for scholarship listing pages.

This document reflects only the promoted SEO pages in `data/seo-scholarship-routes.json`. Broad, internal, legacy-noise, and noindex browsing routes are intentionally excluded from this file.

## Current SEO Pages

- `/scholarships/for-women`
- `/scholarships/engineering`
- `/scholarships/closing-soon`
- `/scholarships/first-generation`
- `/scholarships/computer-science`
- `/scholarships/payout-student`
- `/scholarships/payout-college`
- `/scholarships/veterans`
- `/scholarships/phd`
- `/scholarships/international-students`
- `/scholarships/low-income`
- `/scholarships/african-american`
- `/scholarships/hispanic`
- `/scholarships/disability`
- `/scholarships/minority`
- `/scholarships/lgbtq`
- `/scholarships/native-american`
- `/scholarships/single-parent`
- `/scholarships/foster-youth`

## Current SEO Policy

- Only `GOOD` routes are promoted.
- `THIN`, `EMPTY`, and `TOO_BROAD` routes are not promoted.
- Weak broad facets are excluded from promoted SEO generation.
- `nationwide` routes are excluded from promoted SEO generation.
- Manual and legacy broad routes are excluded from the promoted set.
- Category promotion is restricted to an allowlisted subset; broad umbrella categories are not promoted.
- Internal browsing pages may still exist for UX, but they do not belong to the promoted SEO set.

## Template Rules

- `GOOD` pages use the full scholarship listing SEO template.
- Internal or noindex pages use the internal listing template only.
- Hero intro and factual blocks are deterministic-aggregates-first.
- AI polish, if used at all, must stay light and must not invent facts.
- Do not use generic filler, broad education boilerplate, or fake urgency language.
- Related pages must come only from the current promoted SEO set.

## GOOD Page Template

For promoted `GOOD` pages, the listing template should render:

1. Hero
- H1
- short factual intro built from page aggregates

2. Quick summary
- exact scholarships count
- award range snapshot
- deadline summary
- who the page is most useful for
- updated date

3. Award snapshot
- median / min / max where available
- stated vs unstated amount counts

4. Deadline snapshot
- within 30 days
- within 60 days
- rolling / unknown counts

5. Common eligibility patterns
- common study levels
- common fields
- common residency / audience labels
- essay / requirement patterns where available

6. Top providers
- providers with the highest scholarship counts on that page

7. Related pages
- only from the current promoted `GOOD` set

8. FAQ
- built from page aggregates only
- no invented facts

## Internal Page Rules

- Internal or non-indexable listing pages do not get a strong SEO hero.
- They should show a clear internal-listing notice instead of pretending to be a promoted SEO page.
- They should not render rich SEO intro copy, rich FAQ, or legacy filler blocks.
- Fallback or relaxed results must not be masked as an exact SEO landing page.

## Editorial Review Candidates

These pages are still in the current clean set but should stay on the editorial review list:

- `payout-college`
- `payout-student`
- `minority`
