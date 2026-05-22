# Stage 5G — Compare detail pilot — 2026-05-22

## Status: **not implemented**

## Current behavior

- Compare **sub-hubs** (`/compare/universities`, `/compare/states`) localized with UI chrome.
- Compare **detail** pairs (e.g. `harvard-university-vs-massachusetts-institute-of-technology`): **404** on EN and ES (verified).
- `contentTranslationsTypes` includes `compare_university` / `compare_state` — no published pilot rows.

## Planned pilot (max 8 rows)

- 2 university compare pages × ES/FR
- 2 state compare pages × ES/FR
- Slugs from live sitemap once pair pages exist on EN

## Required before seed

- `app/[locale]/compare/universities/[slug]` (and states) gated routes.
- Render localized body from `content_translations`.
- Sitemap only after published + smoke.

## Production write

None.
