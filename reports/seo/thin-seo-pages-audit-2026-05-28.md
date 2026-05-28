# Thin SEO Pages Audit - 2026-05-28

## Verdict

- Strong families: homepage, resources, essays, compare, categories, provider hubs/details, scholarship details, and approved cross-country GEO pages.
- Medium families: compare detail pages and static essay pages are useful but lighter than resources/categories.
- Weak family: long-tail scholarship filter landing pages in `/scholarships/{state}` and `/scholarships/{state}/{level}/{topic}` can be indexable with very low SSR text and minimal internal links.
- No mass content generation or broad noindex policy change was made in this stage.

## Sampled families

| Route family | Examples | Status | Robots | Text length range | Internal link range | Quality | Action |
|---|---|---|---|---:|---:|---|---|
| Homepage | `/` | 200 | default index | 35145 | 66 | strong | keep |
| Resource hub/articles | `/resources`, `/resources/scholarships-for-international-students-guide`, `/resources/medical-scholarships-guide` | 200 | default index | 3791-12157 | 12-18 | strong | keep and RSS |
| Essay hub/static/generated | `/essays`, `/essays/examples`, `/essays/checklist`, generated essay guide | 200 | default or `index, follow` | 2603-14974 | 7-27 | medium to strong | keep and RSS with existing quality policy |
| Compare hub/guides | `/compare`, `/compare/scholarship-vs-grant`, `/compare/no-essay-vs-essay-scholarships` | 200 | default index | 2241-4556 | 5-18 | medium | keep and RSS |
| Category pages | `/scholarships/category/stem`, `/education`, `/medical` | 200 | default index | 12248-12420 | 28-31 | strong | keep and RSS |
| Provider pages | `/providers`, `/providers/loyola-university-chicago`, `/providers/university-of-pennsylvania` | 200 | default index | 3945-12463 | 15-27 | medium to strong | later provider RSS with gates |
| Cross-country GEO | `/scholarships/for-students-from/canada/study-in/united-states`, `/south-korea/study-in/united-states` | 200 | `index, follow` | 3009-3068 | 16 | medium | keep curated, no broad RSS yet |
| Scholarship detail | one sitemap detail sample | 200 | `index, follow` | 3578 | 6 | medium | later scholarship RSS with active/indexable gates |
| Thin state/filter pages | `/scholarships/california`, `/scholarships/no-essay`, `/scholarships/connecticut/high-school/nursing`, `/scholarships/texas/high-school/arts` | 200 | `index, follow` | 268-603 | 1-9 | weak | P1 cleanup |

## Weak page examples

| URL | Status | Robots | Text length | Internal links | Issue |
|---|---:|---|---:|---:|---|
| `/scholarships/california` | 200 | `index, follow` | 268 | 1 | Too little SSR text and almost no crawl path. |
| `/scholarships/no-essay` | 200 | `index, follow` | 603 | 9 | Better than state pages, still thin for an indexable SEO page. |
| `/scholarships/connecticut/high-school/nursing` | 200 | `index, follow` | 294 | 1 | Thin long-tail combination page. |
| `/scholarships/texas/high-school/arts` | 200 | `index, follow` | 285 | 1 | Thin long-tail combination page. |

## Recommended cleanup plan

P0:

- Do not include thin state/filter long-tail pages in any RSS feed.
- Keep RSS Stage 1 limited to resources, essays, compare, categories, and curated master items.

P1:

- Add a route quality policy for `/scholarships/{state}` and `/scholarships/{state}/{level}/{topic}` pages.
- If a page lacks enough scholarship results, useful copy, internal links, or structured sections, remove it from sitemap or mark noindex until improved.
- Add reusable helpful sections only where real data exists: related categories, guide links, scholarship counts, deadline context, and relevant scholarship cards.

P2:

- Consider removing empty sitemap shards.
- Add a thin-page monitoring script that samples text length, H1, metadata, internal links, and noindex status before future RSS or GEO expansion.

## No fixes applied in this stage

No broad noindex changes were applied because that would require a route-policy decision and likely affect a large indexed surface. The safer action is documented cleanup with quality thresholds.

## Protected areas

No auth, payments, Lemon Squeezy, checkout, onboarding, Supabase RLS, DB schema, migrations, account/dashboard/profile, private user essay pages, private API endpoints, or pricing logic changed.
