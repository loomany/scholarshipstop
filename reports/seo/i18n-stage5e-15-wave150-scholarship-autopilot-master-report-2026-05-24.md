# STAGE5E-15 relaxed scholarship_detail autopilot — master report (2026-05-24)

## Summary

| Metric | Value |
|--------|-------|
| Start ES/FR sitemap | 10751 / 10751 |
| Final ES/FR sitemap | 10801 / 10801 |
| Sitemap net-new ES/FR | 50 / 50 |
| Target net-new scholarships | 50 |
| Net-new scholarships | 50 |
| Rows added | 100 |
| Waves attempted | 1 |
| Waves accepted | 1 |
| OpenAI cost | $0 |
| Stop reason | completed |

## Per-wave net-new

- Wave 182: net-new=50, ES+50, FR+50

## Tier audit

| Tier | Count |
|------|-------|
| A | 6788 |
| B | 0 |
| C | 0 |
| D | 2062 |
| Publishable A+B | 6788 |

## Rollback per wave

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-{N}';
```
