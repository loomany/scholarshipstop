# Stage 5D-1 — Provider route gate post-deploy smoke

Date: 2026-05-22  
Commit: `0532d99` on `main`  
Base URL: `https://scholarshiptop.com`

## Production smoke (`i18n-stage5d-provider-route-gate-smoke.ts`)

| Check | Expected | Actual |
|-------|----------|--------|
| `/providers/loyola-university-chicago` | 200 | 200 |
| `/es/providers/loyola-university-chicago` | 404 | 404 |
| `/fr/providers/loyola-university-chicago` | 404 | 404 |
| `/es/providers` | 200 | 200 |
| `/fr/providers` | 200 | 200 |
| `/en` | 404 | 404 |
| `/es/scholarships/category/stem` | 200 | 200 |
| `/fr/scholarships/category/stem` | 200 | 200 |
| `/es/scholarships/category/hobbies` | 404 | 404 |
| `/fr/scholarships/category/hobbies` | 404 | 404 |
| `/es/resources/how-to-apply-for-scholarships` | 200 | 200 |
| `/fr/resources/how-to-apply-for-scholarships` | 200 | 200 |
| Untranslated resource slug | 404 | 404 |
| ES scholarship detail without translation | 404 | 404 |
| `locale-es-providers-db.xml` | absent or empty | absent (404) |

**Result: PASS** — all checks passed.

## Notes

- ES/FR provider detail 404 before any `provider_profile` seed is expected and correct.
- Category and resource pilots unchanged.
- No production DB writes performed in this deploy step.

## Next

1. Human-review draft `provider_profile` rows (start with 3 providers × ES/FR = 6 rows).
2. Publish with `quality_score >= 85` only after QA.
3. Re-run smoke with `I18N_PROVIDER_PILOT_SLUG` set after first published pilot.
