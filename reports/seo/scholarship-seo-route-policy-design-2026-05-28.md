# Scholarship SEO Route Policy Design - 2026-05-28

## Objective

Prevent weak scholarship SEO/filter landing pages from being treated as healthy indexable sitemap/RSS/GEO candidates until they have explicit quality approval.

## Policy outputs

The reusable helper returns:

- `shouldIndex`
- `shouldIncludeInSitemap`
- `shouldBeRssEligible`
- `qualityTier`
- `routeFamily`
- `reasonCodes`

Compatibility aliases are included for existing code:

- `indexable`
- `includeInSitemap`
- `rssEligible`

## Hard exclusions

The helper excludes pages with:

- unstable public route
- route does not resolve
- query params defining the page
- missing canonical path
- dynamic scholarship filter route without explicit quality approval
- legacy long-tail route not promoted for sitemap
- manifest route below result threshold

## Family rules

| Family | Rule |
|---|---|
| `manifest_single` / `manifest_combo` | Index and sitemap only if manifest entry is `indexable: true`, `qualityBucket: GOOD`, not `noindexNow`, not `dynamic_route`, and result count > 3 |
| `dynamic_state` | `noindex, follow`; exclude from sitemap |
| `dynamic_state_topic` | `noindex, follow`; exclude from sitemap |
| `dynamic_state_degree_topic` | `noindex, follow`; exclude from sitemap |
| `dynamic_filter` | `noindex, follow`; exclude from sitemap |
| `legacy_long_tail` | Exclude unless explicitly promoted and content threshold is met |
| `cross_country_seo` | Keep existing cross-country approval/noindex policy outside this cleanup |
| `country_seo` | Keep existing specialized route policy |
| `scholarship_detail` | Protected; not classified as thin landing page |
| `university_hub` | Protected dedicated route; future provider/university quality gate can be separate |

## Runtime safety

The policy does not fetch live HTML or call external services during request handling. It uses available route metadata, manifest fields, canonical path shape, and optional local SEO bundle facts.
