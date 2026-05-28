# Scholarship SEO Helpful Sections Plan - 2026-05-28

## Decision

No helpful-content UI block was added in this stage.

## Why

The immediate P0 problem was indexation/sitemap leakage from dynamic thin routes. Adding content blocks safely would require careful data-driven design for each page family, and the task explicitly asked not to generate mass AI content or add broad keyword/link clouds.

## Future safe improvements

For medium pages that remain indexable, use only existing data sources:

- related scholarship cards already available from listing payloads
- related resources/guides from `relatedScholarshipHubLinks`
- category links from existing category definitions
- essay/application planning links where the relation is explicit
- breadcrumbs where missing

## Rules for later implementation

- Do not invent counts or facts.
- Do not add footer link clouds.
- Do not link to noindex/thin/broken pages.
- Do not add DB-heavy queries in request paths.
- Keep UI helpful for students, not keyword-stuffed.
