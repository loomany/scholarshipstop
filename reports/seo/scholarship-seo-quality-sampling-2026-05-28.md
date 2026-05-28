# Scholarship SEO Quality Sampling - 2026-05-28

## Method

Created and ran `scripts/seo/audit-scholarship-seo-quality.ts` against production for baseline evidence and against the local production build after implementation. The script checks status, robots, canonical, title, meta description, H1, visible word count, internal links, JSON-LD count, sitemap presence, and route-policy decision.

Machine-readable sample:

- `artifacts/seo/scholarship-seo-quality-sample-2026-05-28.json`

## Baseline production examples before local policy

| URL | Status | Robots | Visible words | Internal links | Baseline issue |
|---|---:|---|---:|---:|---|
| `/scholarships/california` | 200 | `index, follow` | 36 | 1 | Thin SSR, indexable |
| `/scholarships/no-essay` | 200 | `index, follow` | 80 | 9 | Thin SSR, indexable |
| `/scholarships/connecticut/high-school/nursing` | 200 | `index, follow` | 39 | 1 | Thin SSR, indexable |
| `/scholarships/texas/high-school/arts` | 200 | `index, follow` | 39 | 1 | Thin SSR, indexable |
| `/scholarships/engineering` | 200 | `index, follow` | 751 | 22 | Curated manifest route, should stay indexable |
| `/scholarships/category/stem` | 200 | default indexable | 1821 | 49 | Strong category page |
| `/scholarships/for-students-from/canada/study-in/united-states` | 200 | `index, follow` | 398 | 16 | Approved cross-country route; keep existing policy |

## Local sample after policy

| URL | Robots | In sitemap | Policy family | Classification |
|---|---|---:|---|---|
| `/scholarships/california` | `noindex, follow` | no | `dynamic_state` | `NOINDEX_AND_REMOVE_FROM_SITEMAP` |
| `/scholarships/no-essay` | `noindex, follow` | no | `legacy_long_tail` | `NOINDEX_AND_REMOVE_FROM_SITEMAP` |
| `/scholarships/connecticut/high-school/nursing` | `noindex, follow` | no | `dynamic_state_degree_topic` | `NOINDEX_AND_REMOVE_FROM_SITEMAP` |
| `/scholarships/texas/high-school/arts` | `noindex, follow` | no | `dynamic_state_degree_topic` | `NOINDEX_AND_REMOVE_FROM_SITEMAP` |
| `/scholarships/engineering` | `index, follow` | yes | `manifest_single` | `KEEP_BUT_IMPROVE` |
| `/scholarships/category/stem` | default indexable | yes | category route | `KEEP_INDEXABLE` |
| `/scholarships/category/education` | default indexable | yes | category route | `KEEP_INDEXABLE` |
| `/scholarships/for-students-from/canada/study-in/united-states` | `index, follow` | yes | `cross_country_seo` | `KEEP_BUT_IMPROVE` |

## Interpretation

- The weak examples now get `noindex, follow` and are removed from the relevant sitemap.
- Strong category pages are unaffected.
- Curated GOOD manifest routes stay indexable even when their SSR text should be improved later.
- Approved cross-country routes stay under the existing cross-country policy.
