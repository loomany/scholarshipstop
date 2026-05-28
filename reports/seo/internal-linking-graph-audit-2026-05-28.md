# Internal Linking Graph Audit - 2026-05-28

## Verdict

- Strong internal linking: homepage, categories, resources hub, essays hub, providers with rich data.
- Medium internal linking: generated essays, compare guide pages, cross-country GEO pages.
- Weak internal linking: thin long-tail scholarship filter pages with 1 internal link and very little SSR text.
- No link-cloud or mass-linking changes were made.

## Sampled internal link counts

| URL family | Examples | Unique internal links | Notes |
|---|---|---:|---|
| Homepage | `/` | 66 | Strong crawl paths into product and public content. |
| Resources hub | `/resources` | 18 | Good path into guides. |
| Resource articles | two guide samples | 12 each | Good article-to-related content coverage. |
| Essays hub | `/essays` | 27 | Strong path into essay guides. |
| Static essay pages | `/essays/examples`, `/essays/checklist` | 7 each | Usable, could add more related guide links later. |
| Generated essay guide | one scholarship essay sample | 11 | Good enough for generated guide route. |
| Compare hub | `/compare` | 18 | Good guide discovery. |
| Compare guides | two guide samples | 5-6 | Medium, acceptable for short guides. |
| Categories | STEM, education, medical | 28-31 | Strong: links to scholarships and related surfaces. |
| Providers | hub and details | 15-27 | Good on rich provider profiles; weaker providers need gating before RSS. |
| Cross-country GEO | two samples | 16 | Medium and useful. |
| Scholarship detail | one detail sample | 6 | Medium; later safe improvement could add guide/category/provider paths. |
| Thin long-tail scholarship pages | four samples | 1-9 | Weak; not RSS-ready. |

## Recommended safe improvements

P0:

- Keep thin long-tail scholarship filter pages out of RSS.
- Do not add broad footer keyword link clouds.

P1:

- Add a reusable related-resources block to thin scholarship landing templates only if it can be data-driven and relevant.
- Add breadcrumbs or visible related guide links where page family lacks them.
- On scholarship details, consider links to provider profile, relevant category, essay help, and application checklist when those URLs are public/indexable.
- On provider details, keep connected scholarship links and add relevant category/resource links only when provider data is strong.

P2:

- Add an internal-link sampling script to track link count, noindex status, and canonical status across route families before future GEO/RSS expansion.

## No implementation in this stage

No visual/link module was added because the largest issue is not lack of global linking; it is low content depth on specific long-tail scholarship route families. A safe internal-link module should be designed together with the thin-page policy.

## Protected areas

No auth, payments, Lemon Squeezy, checkout, onboarding, Supabase RLS, DB schema, migrations, account/dashboard/profile, private user essay pages, private API endpoints, or pricing logic changed.
