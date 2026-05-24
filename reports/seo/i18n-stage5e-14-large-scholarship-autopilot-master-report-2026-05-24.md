# STAGE5E-14 relaxed scholarship_detail autopilot — master report (2026-05-24)

## Summary

| Metric | Value |
|--------|-------|
| Start ES/FR sitemap | 3701 / 3701 |
| Final ES/FR sitemap | 7701 / 7701 |
| Sitemap net-new ES/FR | 4000 / 4000 |
| Target net-new scholarships | 4000 |
| Net-new scholarships | 4000 |
| Rows added | 8000 |
| Waves attempted | 80 |
| Waves accepted | 80 |
| OpenAI cost | $0 |
| Stop reason | completed |

## Per-wave net-new

- Wave 81: net-new=50, ES+50, FR+50
- Wave 82: net-new=50, ES+50, FR+50
- Wave 83: net-new=50, ES+50, FR+50
- Wave 84: net-new=50, ES+50, FR+50
- Wave 85: net-new=50, ES+50, FR+50
- Wave 86: net-new=50, ES+50, FR+50
- Wave 87: net-new=50, ES+50, FR+50
- Wave 88: net-new=50, ES+50, FR+50
- Wave 89: net-new=50, ES+50, FR+50
- Wave 90: net-new=50, ES+50, FR+50
- Wave 91: net-new=50, ES+50, FR+50
- Wave 92: net-new=50, ES+50, FR+50
- Wave 93: net-new=50, ES+50, FR+50
- Wave 94: net-new=50, ES+50, FR+50
- Wave 95: net-new=50, ES+50, FR+50
- Wave 96: net-new=50, ES+50, FR+50
- Wave 97: net-new=50, ES+50, FR+50
- Wave 98: net-new=50, ES+50, FR+50
- Wave 99: net-new=50, ES+50, FR+50
- Wave 100: net-new=50, ES+50, FR+50
- Wave 101: net-new=50, ES+50, FR+50
- Wave 102: net-new=50, ES+50, FR+50
- Wave 103: net-new=50, ES+50, FR+50
- Wave 104: net-new=50, ES+50, FR+50
- Wave 105: net-new=50, ES+50, FR+50
- Wave 106: net-new=50, ES+50, FR+50
- Wave 107: net-new=50, ES+50, FR+50
- Wave 108: net-new=50, ES+50, FR+50
- Wave 109: net-new=50, ES+50, FR+50
- Wave 110: net-new=50, ES+50, FR+50
- Wave 111: net-new=50, ES+50, FR+50
- Wave 112: net-new=50, ES+50, FR+50
- Wave 113: net-new=50, ES+50, FR+50
- Wave 114: net-new=50, ES+50, FR+50
- Wave 115: net-new=50, ES+50, FR+50
- Wave 116: net-new=50, ES+50, FR+50
- Wave 117: net-new=50, ES+50, FR+50
- Wave 118: net-new=50, ES+50, FR+50
- Wave 119: net-new=50, ES+50, FR+50
- Wave 120: net-new=50, ES+50, FR+50
- Wave 121: net-new=50, ES+50, FR+50
- Wave 122: net-new=50, ES+50, FR+50
- Wave 123: net-new=50, ES+50, FR+50
- Wave 124: net-new=50, ES+50, FR+50
- Wave 125: net-new=50, ES+50, FR+50
- Wave 126: net-new=50, ES+50, FR+50
- Wave 127: net-new=50, ES+50, FR+50
- Wave 128: net-new=50, ES+50, FR+50
- Wave 129: net-new=50, ES+50, FR+50
- Wave 130: net-new=50, ES+50, FR+50
- Wave 131: net-new=50, ES+50, FR+50
- Wave 132: net-new=50, ES+50, FR+50
- Wave 133: net-new=50, ES+50, FR+50
- Wave 134: net-new=50, ES+50, FR+50
- Wave 135: net-new=50, ES+50, FR+50
- Wave 136: net-new=50, ES+50, FR+50
- Wave 137: net-new=50, ES+50, FR+50
- Wave 138: net-new=50, ES+50, FR+50
- Wave 139: net-new=50, ES+50, FR+50
- Wave 140: net-new=50, ES+50, FR+50
- Wave 141: net-new=50, ES+50, FR+50
- Wave 142: net-new=50, ES+50, FR+50
- Wave 143: net-new=50, ES+50, FR+50
- Wave 144: net-new=50, ES+50, FR+50
- Wave 145: net-new=50, ES+50, FR+50
- Wave 146: net-new=50, ES+50, FR+50
- Wave 147: net-new=50, ES+50, FR+50
- Wave 148: net-new=50, ES+50, FR+50
- Wave 149: net-new=50, ES+50, FR+50
- Wave 150: net-new=50, ES+50, FR+50
- Wave 151: net-new=50, ES+50, FR+50
- Wave 152: net-new=50, ES+50, FR+50
- Wave 153: net-new=50, ES+50, FR+50
- Wave 154: net-new=50, ES+50, FR+50
- Wave 155: net-new=50, ES+50, FR+50
- Wave 156: net-new=50, ES+50, FR+50
- Wave 157: net-new=50, ES+50, FR+50
- Wave 158: net-new=50, ES+50, FR+50
- Wave 159: net-new=50, ES+50, FR+50
- Wave 160: net-new=50, ES+50, FR+50

## Tier audit

| Tier | Count |
|------|-------|
| A | 13838 |
| B | 0 |
| C | 0 |
| D | 2062 |
| Publishable A+B | 13838 |

## Rollback per wave

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-{N}';
```
