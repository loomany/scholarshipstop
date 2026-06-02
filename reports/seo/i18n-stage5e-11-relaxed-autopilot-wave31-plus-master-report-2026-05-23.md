# STAGE5E-11 relaxed scholarship_detail autopilot — master report (2026-05-23)

## Summary

| Metric | Value |
|--------|-------|
| Start ES/FR sitemap | 1201 / 1201 |
| Final ES/FR sitemap | 1701 / 1701 |
| Sitemap net-new ES/FR | 500 / 500 |
| Target net-new scholarships | 500 |
| Net-new scholarships | 500 |
| Rows added | 1000 |
| Waves attempted | 10 |
| Waves accepted | 10 |
| OpenAI cost | $0 |
| Stop reason | completed |

## Per-wave net-new

- Wave 31: net-new=50, ES+50, FR+50
- Wave 32: net-new=50, ES+50, FR+50
- Wave 33: net-new=50, ES+50, FR+50
- Wave 34: net-new=50, ES+50, FR+50
- Wave 35: net-new=50, ES+50, FR+50
- Wave 36: net-new=50, ES+50, FR+50
- Wave 37: net-new=50, ES+50, FR+50
- Wave 38: net-new=50, ES+50, FR+50
- Wave 39: net-new=50, ES+50, FR+50
- Wave 40: net-new=50, ES+50, FR+50

## Tier audit

| Tier | Count |
|------|-------|
| A | 16338 |
| B | 0 |
| C | 0 |
| D | 2062 |
| Publishable A+B | 16338 |

## Rollback per wave

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-{N}';
```
