# Stage 5E-6 scholarship detail autopilot — master report (2026-05-23)

## Summary

| Metric | Value |
|--------|-------|
| Starting scholarships | 116 |
| Target | 500 |
| Scholarships added | 50 |
| Rows added | 100 |
| Waves attempted | 1 |
| Waves accepted | 1 |
| Final ES/FR (approx) | 551 each |
| OpenAI cost | $0 |
| Stop reason | completed |

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
