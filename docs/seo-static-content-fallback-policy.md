# SEO Static Content Fallback Policy

This policy covers curated SEO content for ScholarshipTop routes such as
`/essays`, `/providers`, and `/compare` when OpenAI generation is unavailable,
paused, or not approved.

## Do Not Run OpenAI Generators Without Approval

- Do not run `scripts/run-manual-essay-guides.ts`.
- Do not run `lib/essays/runEssayGenerationJob.ts`.
- Do not run `scripts/enrich-all-providers.ts`.
- Do not run `scripts/seo-worker-generate.ts`.
- Do not run compare refresh scripts that call OpenAI.
- Do not set or depend on `OPENAI_API_KEY` for curated static pages.

If a generator fails because of quota, model configuration, or missing
environment variables, stop the pipeline and use a static authored content path
instead of retrying paid generation.

## Allowed Static Content

Static authored content is allowed for evergreen pages when it is written from
general scholarship guidance and visible ScholarshipTop product context.

Allowed examples:

- Essay guides such as `/essays/checklist`, `/essays/financial-need`, and
  `/essays/examples`.
- Evergreen compare guides such as `/compare/scholarship-vs-grant`.
- Provider trust blocks that explain data status, source confidence, and what
  students should verify.

## Forbidden Content

- Do not invent official provider URLs.
- Do not invent verification dates.
- Do not invent experts, reviews, winners, or affiliations.
- Do not claim ScholarshipTop provides scholarships directly.
- Do not create mass pages with only swapped keywords.
- Do not index query, filter, user-specific, or private compare pages.

## Route Quality Requirements

Indexable static pages should have:

- Stable canonical route.
- Original introduction.
- Visible useful checklist or table.
- Specific FAQ shown on the page before `FAQPage` schema is emitted.
- Internal links to relevant scholarships, guides, methodology, or disclaimer.
- Clear disclaimer when guidance cannot guarantee awards.

Provider pages should be indexable only when:

- The route resolves publicly.
- The provider has at least one real linked active/public scholarship.
- The display name is clear.
- The page has source/trust context and a public scholarship list.
- Duplicate or merged provider identity issues are not unresolved.

Compare pages should be indexable only when:

- The page has a stable public route without query params.
- The comparison has real search intent.
- A visible comparison table exists.
- FAQ and related internal links are visible.
- The content is not user-specific or a duplicate of another article.

## Sitemap Rules

- Include curated static essay and compare guides when they meet the quality
  rules above.
- Include provider profiles only when provider quality policy returns
  `includeInSitemap: true`.
- Exclude query params, filters, pagination pages after page 1, private pages,
  and weak generated pages.

## Adding New Static Guides

1. Add the guide to the matching static manifest, such as
   `lib/essays/staticEssayGuides.ts` or `lib/compare/staticCompareGuides.ts`.
2. Keep the copy factual, practical, and evergreen.
3. Add visible FAQ only when the answers are page-specific.
4. Add internal links to live hubs, guides, methodology, or disclaimers.
5. Confirm the page renders, has canonical metadata, and appears in sitemap only
   after passing the quality policy.

## Migrating Static Content Into the Database Later

Static content may be migrated into Supabase only after explicit approval for DB
writes. The migrated record should preserve the canonical slug, title, meta
description, visible FAQ, internal links, and disclaimer. Do not delete the
static fallback until the database route is confirmed to render the same or
better public value.
