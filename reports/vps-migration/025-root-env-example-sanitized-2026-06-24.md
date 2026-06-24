# Этап 2.5 — Root `.env.example` sanitization

**Дата:** 2026-06-24  
**Режим:** read-only по production; только правка шаблона в репозитории.

## Проверенные файлы

| Файл | Действие |
|------|----------|
| `.env.example` | санитизирован |
| `.gitignore` | обновлён для env-правил |
| `ops/env/*.env.example` | не изменялись (уже placeholders) |
| `scripts/vps-migration/sanitize-root-env-example.mjs` | создан |
| `scripts/vps-migration/verify-env-example-sanitized.mjs` | создан |

## Результат

| Метрика | Значение |
|---------|----------|
| Подозрительных значений заменено | **39** (2 прохода: 35 + 4) |
| Verify script | `ok: true`, `suspiciousKeys: []` |
| Реальные `.env` созданы | нет |
| Railway env изменён | нет |
| Supabase изменён | нет |
| Deploy / jobs запущены | нет |

## Затронутые key names (без значений)

Первый проход (35):

`CONTENT_ARTICLE_MATCH_SECRET`, `FAL_KEY`, `GOOGLE_INDEXING_CLIENT_EMAIL`, `GOOGLE_INDEXING_PRIVATE_KEY`, `GOOGLE_INDEXING_SECRET`, `GPTZERO_API_KEY`, `GRANT_NOTIFICATION_CRON_SECRET`, `GRANT_NOTIFICATION_TEST_SAMPLE_EMAIL`, `GRANT_NOTIFICATION_TEST_SAMPLE_TELEGRAM_CHAT_ID`, `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_IQ_REPORT_VARIANT_ID`, `LEMONSQUEEZY_MONTHLY_VARIANT_ID`, `LEMONSQUEEZY_QUARTERLY_VARIANT_ID`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_SUCCESS_URL`, `LEMONSQUEEZY_YEARLY_VARIANT_ID`, `LEMON_SQUEEZY_SECRET`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_LS_IQ_REPORT_VARIANT_ID`, `NEXT_PUBLIC_LS_MONTHLY_VARIANT_ID`, `NEXT_PUBLIC_LS_QUARTERLY_VARIANT_ID`, `NEXT_PUBLIC_LS_YEARLY_VARIANT_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `OPENAI_API_KEY`, `PROVIDERS_REVALIDATE_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_ADMIN_IDS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_LINK_CODE_SECRET`, `TELEGRAM_WEBHOOK_SECRET`

Второй проход (4):

`LEMONSQUEEZY_CHECKOUT_URL_MONTHLY`, `LEMONSQUEEZY_CHECKOUT_URL_QUARTERLY`, `LEMONSQUEEZY_CHECKOUT_URL_YEARLY`, `UNDETECTABLE_API_KEY`

## `.gitignore` изменения

Добавлено:

```gitignore
.env
.env.*
!.env.example
!*.env.example
ops/vps/runtime/env/*.env
/opt/scholarshiptop/env/*.env
```

`ops/env/*.env.example` остаются trackable через `!*.env.example`.

## Future key rotation

**Рекомендуется:** да.

Причина: корневой `.env.example` ранее содержал значения, похожие на production secrets (Supabase service role, OpenAI, Resend, Telegram, LemonSqueezy, GSC private key, webhook secrets). Даже после санитизации файла, секреты могли попасть в git history.

Рекомендуемый порядок (отдельная задача, не выполнялась здесь):

1. Supabase service role rotation
2. OpenAI / Resend / Telegram / LemonSqueezy keys
3. GSC service account + `GOOGLE_INDEXING_SECRET`
4. Webhook/cron secrets (`GRANT_NOTIFICATION_CRON_SECRET`, `CONTENT_ARTICLE_MATCH_SECRET`, …)

## Acceptance Criteria

| Критерий | Статус |
|----------|--------|
| `.env.example` без secret-like values | **PASS** |
| Реальные `.env` не закоммичены | **PASS** |
| Отчёт создан | **PASS** |
| Railway / Supabase / production не тронуты | **PASS** |
| Jobs / deploy не запускались | **PASS** |

**Вердикт этапа 2.5: PASS**
