# Stage 5E-7 empty translated_title audit (2026-05-23)

## Affected rows (autopilot published, empty translated_title)

| Metric | Value |
|--------|-------|
| Total rows | **0** |
| ES | **0** |
| FR | **0** |
| Distinct scholarships | **0** |
| Waves |  |
| Has translated_body/summary | **0** / 0 |
| Slugs in sitemap list | **0** |
| Slugs excluded from sitemap | **0** |

## Why smoke passed

Wave smoke checked route HTTP 200 and sitemap counts vs sitemap-eligible totals; per-slug XML inclusion only for listed slugs after 5E-6 hardening. Empty translated_title excludes rows from listPublishedScholarshipDetailTranslations (hasLocalizedTitle).

## Sample slugs



## Sample routes


