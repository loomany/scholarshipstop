# Scholarship SEO Route Family Inventory - 2026-05-28

## Summary

The remaining thin-page risk is concentrated in scholarship SEO/filter landing routes under `/scholarships/...`, not in resources, essays, compare, providers, RSS, account, API, or scholarship detail pages.

## Route families

| Family | Pattern | Source of truth | Sitemap source | Current risk | Policy direction |
|---|---|---|---|---|---|
| Scholarship details | `/scholarships/{uuid-or-slug}` | DB scholarship rows | `scholarships-*.xml` | Low | Protected; do not noindex by landing-page policy |
| Categories | `/scholarships/category/{slug}` | category allowlist + category templates | `categories.xml` | Low | Protected; remain indexable |
| Curated manifest SEO | `/scholarships/{manifestPath}` | `data/seo-scholarship-routes.json` | `seo.xml` | Medium | Keep only explicit `indexable: true`, `qualityBucket: GOOD`, result count > 3 |
| Legacy long-tail | `/scholarships/{legacySlug}` | `scholarshipLongTailPresets.ts` | partial long-tail sitemap allowlist | High | Noindex unless promoted/quality-approved |
| State landing | `/scholarships/{state}` | dynamic token resolver + state grant RPC | `seo.xml` state rows | High | Noindex and remove from sitemap until explicit quality approval |
| State/topic | `/scholarships/{state}/{topic}` | dynamic token resolver | generated programmatic rows | High | Noindex and remove from sitemap until explicit quality approval |
| State/degree/topic | `/scholarships/{state}/{degree}/{topic}` | dynamic token resolver + generated hub rows | generated programmatic rows | High | Noindex and remove from sitemap until explicit quality approval |
| Cross-country SEO | `/scholarships/for-students-from/{applicant}/study-in/{host}` | `data/seo-cross-country-routes.json` | cross-country sitemap builder | Medium | Keep existing approved/manual-review policy |
| Country SEO | country scholarship SEO route helpers | `scholarshipCountrySeo` | `seo.xml` | Medium | Keep existing specialized policy |
| University/provider scholarship hubs | `/scholarships/{state}/{university}` | `provider_hub_listing` + RPC | `seo.xml` university rows | Medium | Keep dedicated route; not targeted by thin filter policy |

## Manifest inventory

- Total manifest routes: 789.
- GOOD indexable manifest routes: 789.
- Single routes: 95.
- Double routes: 345.
- Triple routes: 349.

## Key finding

Dynamic entries already carried weak signals (`indexable: false`, `noindexNow: true`, `reasonCodes: ["dynamic_route"]`), but metadata and sitemap builders did not consistently apply those signals. The new policy needs to centralize that decision.
