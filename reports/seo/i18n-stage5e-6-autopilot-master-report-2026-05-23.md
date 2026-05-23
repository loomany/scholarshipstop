# Stage 5E-6 scholarship detail autopilot — master report (2026-05-23)

## Summary

| Metric | Value |
|--------|-------|
| Starting scholarships | 116 |
| Target | 500 |
| Scholarships added | 100 |
| Rows added | 200 |
| Waves attempted | 3 |
| Waves accepted | 2 |
| Final ES/FR (approx) | 366 each |
| OpenAI cost | $0 |
| Stop reason | wave 6 smoke failed: sitemap ES=0 FR=0 expected>=416; ES sitemap missing carn-congo-basin-aspire-grant-2026-congo-basin-grant-program; FR sitemap missing carn-congo-basin-aspire-grant-2026-congo-basin-grant-program; ES sitemap missing women-in-finance-and-accounting-scholarship-at-henley-business-school-20-women-in-finance-scholarship-at-; FR sitemap missing women-in-finance-and-accounting-scholarship-at-henley-business-school-20-women-in-finance-scholarship-at- |

## Rollback per wave

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-wave-{N}';
```

## Recommendation

- Continue +500: evaluate
- Safe for batch 12+ manual: after deploy verify
