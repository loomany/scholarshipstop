# Stage 5G — compare detail pilot seed & smoke (2026-05-22)

## Scope

- 2 university + 2 state compares × ES/FR = **8 rows**
- No English narrative fallback on ES/FR routes (localized summary/body/FAQ only)
- Institution/state names preserved in English where factual

## University slugs

| slug | source_id |
|------|-----------|
| austin-community-college-vs-midlands-technical-college | 99031a7d-9e86-4e3f-88ec-7ba3316a1723 |
| massachusetts-bay-community-college-massbay-vs-worcester-state-university | d46b603d-f18c-4118-8fe8-b8fc2fff6b59 |

## State slugs

| slug | source_id |
|------|-----------|
| california-vs-texas | 2916f756-78ab-463f-8458-6aa744c3cd94 |
| florida-vs-new-york | 5103ad4e-1c27-4b73-8190-4983c9cdee26 |

CSV: `i18n-stage5g-compare-detail-pilot-rows-2026-05-22.csv`

Machine models:

- `stage5g-compare-university-manual-pilot`
- `stage5g-compare-state-manual-pilot`

## Production smoke

- Pilot EN/ES/FR compare URLs → 200
- Unseeded ES compare → 404

## Commit

`809e613` feat(i18n): add ES FR compare detail pilot

## Rollback

```sql
delete from public.content_translations
where source_type in ('compare_university', 'compare_state')
  and locale in ('es', 'fr')
  and machine_model in (
    'stage5g-compare-university-manual-pilot',
    'stage5g-compare-state-manual-pilot'
  );
```
