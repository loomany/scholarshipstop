# Stage 5F — essay detail pilot seed & smoke (2026-05-22)

## Scope

- 3 essay guides × ES/FR = **6 rows**
- `source_type`: `essay_guide`
- `machine_model`: `stage5f-essay-manual-pilot`
- Routes: `/es/essays/[slug]`, `/fr/essays/[slug]` (404 without published row)

## Slugs

| slug | source_id |
|------|-----------|
| how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america | 6e9ea82d-7b97-4cab-b0aa-b2a491586253 |
| how-to-write-a-strong-public-policy-scholarship-essay-as-an-international-student | 2b62d854-3e88-4df2-a262-fadb4e054b1d |
| how-to-write-richard-r-tufenkian-scholarship-details-scholarship-essay | 3141fec2-0e23-4533-8066-860243c9ce6c |

CSV: `i18n-stage5f-essay-detail-pilot-rows-2026-05-22.csv`

## Production smoke

- Pilot EN/ES/FR → 200
- `/es/essays/how-to-write-a-scholarship-essay` → 404
- Static essay guide routes unaffected
- English essay title preserved; localized body/FAQ only

## Commit

`ef71a1e` feat(i18n): add ES FR essay detail pilot

## Rollback

```sql
delete from public.content_translations
where source_type = 'essay_guide'
  and locale in ('es', 'fr')
  and machine_model = 'stage5f-essay-manual-pilot';
```
