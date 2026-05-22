# Stage 5D — Provider profile +2 seed — 2026-05-22

## Status: **not executed (production)**

## Blocker

- `scripts/i18n/seed-provider-pilot-translations.ts` enforces exactly **6** rows and `PROVIDER_PILOT_SLUGS` (3 universities).
- No `stanford-university` / `yale-university` entries in `providerPilotTranslationsData.ts`.
- Dry-run against production UUID resolution not run this session (requires explicit env + slug verification).

## Current production (unchanged)

| Slug | ES/FR rows |
|------|------------|
| loyola-university-chicago | 2 |
| harvard-university | 2 |
| university-of-michigan | 2 |

**Total:** 6 rows, `machine_model = stage5d-provider-manual-pilot`

## Rollback SQL (+2 batch — if ever applied)

```sql
delete from public.content_translations
where source_type = 'provider_profile'
  and locale in ('es', 'fr')
  and machine_model in ('stage5d-provider-manual-pilot-2');
```

## Recommended next step

1. Read-only: confirm `providers.slug` for stanford/yale (or alternate high-value slugs).
2. Add `PROVIDER_PILOT_PLUS2_SLUGS` + 4 rows in data module, `machine_model = stage5d-provider-manual-pilot-2`.
3. Bump `PROVIDER_PILOT_STAGE_MAX_ROWS` to 10 or run isolated script with row cap 4.
4. Dry-run → manual QA → production apply → smoke (5 EN + 5 ES + 5 FR sitemap URLs).
