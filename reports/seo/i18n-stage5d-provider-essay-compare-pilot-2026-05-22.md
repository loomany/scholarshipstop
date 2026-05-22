# Stage 5D — Provider / essay / compare DB pilots (2026-05-22)

## Status: plan + dry-run only

No production or staging DB writes. OpenAI not used ($0).

## Scripts (dry-run default)

| Script | Planned rows | CSV |
|--------|--------------|-----|
| `scripts/i18n/seed-provider-pilot-translations.ts` | 10 (5 slugs × ES/FR) | `reports/seo/i18n-stage5d-provider-pilot-rows-2026-05-22.csv` |
| `scripts/i18n/seed-essay-pilot-translations.ts` | 10 | `reports/seo/i18n-stage5d-essay-pilot-rows-2026-05-22.csv` |
| `scripts/i18n/seed-compare-pilot-translations.ts` | 20 | `reports/seo/i18n-stage5d-compare-pilot-rows-2026-05-22.csv` |

All rows default `status=review_required`. Upsert requires `I18N_PILOT_ALLOW_DB_WRITES=1`; production also needs `I18N_PILOT_ALLOW_PRODUCTION=1`.

## Next before writes

1. Resolve provider UUIDs + essay/compare slug existence in DB.
2. Map `translated_*` fields per `content_translations` policy.
3. Implement route gates (`404` without published translation) before any `published` status.
4. Manual or reviewed drafts only; no `I18N_OPENAI_TRANSLATION_DRAFTS` until pipeline defined.
