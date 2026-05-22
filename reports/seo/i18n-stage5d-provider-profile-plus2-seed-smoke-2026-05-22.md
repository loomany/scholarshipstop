# Stage 5D-2 — provider profile +2 seed & smoke (2026-05-22)

## Scope

- 2 providers × ES/FR = **4 rows**
- `machine_model`: `stage5d-provider-manual-pilot-2`
- Total provider pilot: **5** providers (10 ES+FR rows)

## Slugs

| slug | source_id |
|------|-----------|
| princeton-university | dfb1b3ba-61fc-4c41-8989-3796f0044a86 |
| columbia-university | 9ddb75bf-c755-45a5-b818-3d57e0151926 |

CSV: `i18n-stage5d-provider-profile-plus2-rows-2026-05-22.csv`

## Production smoke

- `/providers/princeton-university` + ES/FR → 200
- `/providers/columbia-university` + ES/FR → 200
- `/es/providers/stanford-university` → 404
- Legal provider names preserved; localized body only

## Commit

`5bbe6d5` feat(i18n): expand ES FR provider profile pilot

## Rollback

```sql
delete from public.content_translations
where source_type = 'provider_profile'
  and locale in ('es', 'fr')
  and machine_model = 'stage5d-provider-manual-pilot-2';
```
