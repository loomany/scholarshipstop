# Stage 5E-2 — scholarship detail +5 seed & smoke (2026-05-22)

## Scope

- 5 scholarships × ES/FR = **10 rows**
- `machine_model`: `stage5e-scholarship-manual-pilot-2`
- Total pilot scholarships after phase: **6** (12 ES+FR rows + climate 5E-1)

## Slugs

| slug | source_id |
|------|-----------|
| china-university-of-petroleum-scholarship-1461 | 3b7d5037-fc7a-4edf-881c-2c4c5fd303f6 |
| creative-arts-scholarship-8932 | 7f58a469-34b8-49b3-9c89-75ae9e7c9ea1 |
| fintech-innovation-scholarship-8931 | 32a15d95-0f3f-4cf7-b1c2-8e047c2a363f |
| healthcare-scholarship-8928 | 50ee2625-8c3c-47db-9c10-2f045ff6e9a9 |
| vice-chancellor-s-scholarship-2905 | f8246610-59ff-4e22-9dc9-9e11a7dc1c5e |

CSV: `i18n-stage5e-2-scholarship-detail-plus5-rows-2026-05-22.csv`

## Gates

- Dry-run: 10 rows exact
- Build/tsc/i18n tests: pass
- Commit: `7bd9fe3`

## Production smoke (post-deploy)

- All 6 pilot EN/ES/FR scholarship URLs → 200
- Unseeded ES scholarship → 404
- climate-stripes pilot unchanged

## Rollback

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-manual-pilot-2';
```
