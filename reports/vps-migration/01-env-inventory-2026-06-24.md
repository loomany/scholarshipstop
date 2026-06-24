# Этап 1 — Env inventory (key names only)

**Дата:** 2026-06-24  
**Источник:** `railway variable list --json` per service (read-only)  
**Правило:** значения env **не** выводятся. Только имена ключей, категории, required/optional.

## Файлы-шаблоны (без секретов)

| Service slug | Railway name | Template |
|--------------|--------------|----------|
| `site` | Сайт | `ops/env/site.env.example` |
| `scripts` | Скрипты | `ops/env/scripts.env.example` |
| `seo-generation` | Сео генерация | `ops/env/seo-generation.env.example` |
| `seo-indexing` | Сео индексация | `ops/env/seo-indexing.env.example` |
| `seo-audit` | Сео Аудит | `ops/env/seo-audit.env.example` |
| `mailing` | Рассылка | `ops/env/mailing.env.example` |
| `mailing-providers` | Рассылка провайдеры | `ops/env/mailing-providers.env.example` |
| `content-hub` | Контент Хаб | `ops/env/content-hub.env.example` |
| `translation` | Перевод | `ops/env/translation.env.example` |

Формат в шаблонах:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=REQUIRED_SET_ON_VPS
CACHE_BUST=OPTIONAL_SET_ON_VPS
```

Генератор (read-only): `node scripts/vps-migration/generate-env-examples.mjs`

---

## Сводка по количеству ключей (без RAILWAY_*)

| Service | Keys count | Service role | Resend | OpenAI | GSC/indexing |
|---------|------------|--------------|--------|--------|--------------|
| site | 62 | yes | yes | yes | yes |
| scripts | 17 | yes | no | yes | no |
| seo-generation | 16 | yes | no | yes | yes |
| seo-indexing | 20 | yes | no | no | yes |
| seo-audit | 10 | no | no | no | partial |
| mailing | 15 | yes | yes | no | no |
| mailing-providers | 11 | yes | yes | no | no |
| content-hub | 38 | yes | no | yes | no |
| translation | 15 | yes | no | no | no |

`RAILWAY_*` системные переменные присутствуют на всех сервисах — **не копировать на VPS** (автогенерируются Railway или не нужны).

---

## site → env map

| Key | Category | Required | Used by |
|-----|----------|----------|---------|
| CACHE_BUST | unknown / legacy | optional | Сайт |
| CONTENT_ARTICLE_MATCH_SECRET | worker flags | required | Сайт |
| GOOGLE_INDEXING_CLIENT_EMAIL | GSC / indexing | required | Сайт |
| GOOGLE_INDEXING_IMMEDIATE_SHARE_PERCENT | GSC / indexing | optional | Сайт |
| GOOGLE_INDEXING_MAX_PUBLISH_PER_DAY | GSC / indexing | optional | Сайт |
| GOOGLE_INDEXING_PRIVATE_KEY | GSC / indexing | required | Сайт |
| GOOGLE_INDEXING_SCHOLARSHIP_SHARE_PERCENT | GSC / indexing | optional | Сайт |
| GOOGLE_INDEXING_SECRET | GSC / indexing | required | Сайт |
| GOOGLE_SEARCH_CONSOLE_SITE_URL | unknown / legacy | required | Сайт |
| GPTZERO_API_KEY | OpenAI / AI | required | Сайт |
| GPTZERO_MODEL_VERSION | OpenAI / AI | required | Сайт |
| GPT_SEARCH_API_TOKEN | OpenAI / AI | optional | Сайт |
| GRANT_NOTIFICATION_CRON_SECRET | mailing / email provider | required | Сайт |
| GRANT_NOTIFICATION_TEST_SAMPLE_* | mailing / email provider | optional | Сайт (3 keys) |
| INDEXNOW_SECRET | unknown / legacy | required | Сайт |
| LEMONSQUEEZY_* / LEMON_SQUEEZY_SECRET | unknown / legacy | required | Сайт (billing) |
| NEXT_PUBLIC_GTM_ID | public NEXT_PUBLIC_* | required | Сайт |
| NEXT_PUBLIC_LS_* | public NEXT_PUBLIC_* | required | Сайт |
| NEXT_PUBLIC_SCHOLARSHIPS_HUB_SIDEBAR_DEBUG | public NEXT_PUBLIC_* | optional | Сайт |
| NEXT_PUBLIC_SCHOLARSHIPTOP_NAVIGATOR_URL | public NEXT_PUBLIC_* | required | Сайт |
| NEXT_PUBLIC_SITE_URL | public NEXT_PUBLIC_* | required | Сайт |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon | required | Сайт |
| NEXT_PUBLIC_SUPABASE_URL | Supabase anon | required | Сайт |
| OPENAI_API_KEY | OpenAI / AI | required | Сайт |
| OPENAI_ESSAY_MODEL | OpenAI / AI | required | Сайт |
| OPENAI_HUMANIZE_MODEL | OpenAI / AI | required | Сайт |
| OPENAI_INTERVIEWER_MODEL | OpenAI / AI | required | Сайт |
| OPENAI_SEO_MODEL | OpenAI / AI | required | Сайт |
| OPENAI_VOICE_CLEANUP_MODEL | OpenAI / AI | required | Сайт |
| OPENAI_WHISPER_MODEL | OpenAI / AI | required | Сайт |
| PROVIDERS_REVALIDATE_SECRET | worker flags | required | Сайт |
| RESEND_API_KEY | mailing / email provider | required | Сайт |
| RESEND_FROM | mailing / email provider | required | Сайт |
| SCHOLARSHIPS_HUB_SIDEBAR_DEBUG | unknown / legacy | optional | Сайт |
| SCHOLARSHIPS_V2_READ_PATH | unknown / legacy | required | Сайт |
| SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET | unknown / legacy | required | Сайт |
| SEO_DRIP_ENABLED | SEO / sitemap / canonical | optional | Сайт |
| SEO_DRIP_START_DATE | SEO / sitemap / canonical | optional | Сайт |
| SEO_PAGES_PER_HOUR | SEO / sitemap / canonical | optional | Сайт |
| SITE_URL | unknown / legacy | required | Сайт |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role | required | Сайт |
| TELEGRAM_* | unknown / legacy | required | Сайт (5 keys) |
| UNDETECTABLE_API_KEY | OpenAI / AI | required | Сайт |
| UNDETECTABLE_MODEL | OpenAI / AI | required | Сайт |

---

## scripts → env map

| Key | Category | Required |
|-----|----------|----------|
| ESSAY_HUB_HERO_FAL_BACKEND | worker flags | required |
| ESSAY_HUB_HERO_REUSE_ONLY | worker flags | optional |
| ESSAY_HUB_OPENAI_MODEL | worker flags | optional |
| FAL_KEY | OpenAI / AI | required |
| GRANT_NOTIFICATION_CRON_SECRET | mailing / email provider | required |
| NEXT_PUBLIC_SITE_URL | public NEXT_PUBLIC_* | required |
| NEXT_PUBLIC_SUPABASE_URL | Supabase anon | required |
| OPENAI_API_KEY | OpenAI / AI | required |
| OPENAI_PROVIDER_ENRICH_MODEL | OpenAI / AI | optional |
| PROVIDERS_REVALIDATE_SECRET | worker flags | required |
| PUBLIC_URL | unknown / legacy | required |
| SITE_URL | unknown / legacy | required |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role | required |
| TELEGRAM_BOT_TOKEN | unknown / legacy | required |
| TELEGRAM_ADMIN_IDS | unknown / legacy | required |

---

## seo-generation → env map

| Key | Category | Required |
|-----|----------|----------|
| GOOGLE_INDEXING_CLIENT_EMAIL | GSC / indexing | required |
| GOOGLE_INDEXING_PRIVATE_KEY | GSC / indexing | required |
| GOOGLE_INDEXING_SECRET | GSC / indexing | required |
| GOOGLE_SEARCH_CONSOLE_SITE_URL | unknown / legacy | required |
| NEXT_PUBLIC_SITE_URL | public NEXT_PUBLIC_* | required |
| NEXT_PUBLIC_SUPABASE_URL | Supabase anon | required |
| OPENAI_API_KEY | OpenAI / AI | required |
| OPENAI_SEO_MODEL | OpenAI / AI | required |
| SEO_AI_META_BATCH | SEO / sitemap / canonical | optional |
| SEO_AI_META_ENABLED | SEO / sitemap / canonical | optional |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role | required |

*Код также читает `PUBLIC_URL`, `SEO_WORKER_GENERATE_LIMIT` — на Railway не заданы (defaults в коде).*

---

## seo-indexing → env map

| Key | Category | Required |
|-----|----------|----------|
| GOOGLE_INDEXING_CLIENT_EMAIL | GSC / indexing | required |
| GOOGLE_INDEXING_FLUSH_LIMIT | GSC / indexing | optional |
| GOOGLE_INDEXING_IMMEDIATE_SHARE_PERCENT | GSC / indexing | optional |
| GOOGLE_INDEXING_MAX_PUBLISH_PER_DAY | GSC / indexing | optional |
| GOOGLE_INDEXING_PRIVATE_KEY | GSC / indexing | required |
| GOOGLE_INDEXING_SCHOLARSHIP_SHARE_PERCENT | GSC / indexing | optional |
| GOOGLE_INDEXING_SECRET | GSC / indexing | required |
| GOOGLE_SEARCH_CONSOLE_SITE_URL | unknown / legacy | required |
| NEXT_PUBLIC_SITE_URL | public NEXT_PUBLIC_* | required |
| NEXT_PUBLIC_SUPABASE_URL | Supabase anon | required |
| PUBLIC_URL | unknown / legacy | required |
| SITE_URL | unknown / legacy | required |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role | required |
| URL_INSPECTION_MAX_PER_RUN | GSC / indexing | optional |
| URL_INSPECTION_PENDING_BATCH | GSC / indexing | optional |
| URL_INSPECTION_SUBMITTED_BATCH | GSC / indexing | optional |
| TELEGRAM_BOT_TOKEN | unknown / legacy | required |
| TELEGRAM_ADMIN_IDS | unknown / legacy | required |

---

## seo-audit → env map

| Key | Category | Required |
|-----|----------|----------|
| JSONLD_AUDIT_BASE_URL | GSC / indexing | required |
| JSONLD_AUDIT_EXIT_NONZERO | GSC / indexing | optional |
| JSONLD_AUDIT_SCHOLARSHIP_SAMPLE | GSC / indexing | optional |
| TELEGRAM_BOT_TOKEN | unknown / legacy | required |
| TELEGRAM_ADMIN_IDS | unknown / legacy | required |

*Fallback: `NEXT_PUBLIC_SITE_URL` / `SITE_URL` если `JSONLD_AUDIT_BASE_URL` не задан — на Railway задан явно.*

---

## mailing → env map

| Key | Category | Required |
|-----|----------|----------|
| GRANT_DIGEST_EMAIL_MAX_ITEMS | mailing / email provider | optional |
| GRANT_NOTIFICATION_CRON_SECRET | mailing / email provider | required |
| GRANT_NOTIFICATION_EMAIL_COOLDOWN_HOURS | mailing / email provider | optional |
| GRANT_NOTIFICATION_LOOKBACK_HOURS | mailing / email provider | optional |
| GRANT_NOTIFICATION_MAX_OPS | mailing / email provider | optional |
| GRANT_NOTIFICATION_MAX_PROFILES | mailing / email provider | optional |
| GRANT_NOTIFICATION_MAX_SCHOLARSHIPS | mailing / email provider | optional |
| NEXT_PUBLIC_SITE_URL | public NEXT_PUBLIC_* | required |
| NEXT_PUBLIC_SUPABASE_URL | Supabase anon | required |
| RESEND_API_KEY | mailing / email provider | required |
| RESEND_FROM | mailing / email provider | required |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role | required |

---

## mailing-providers → env map

| Key | Category | Required |
|-----|----------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase anon | required |
| PROVIDER_OUTREACH_MS_BETWEEN | mailing / email provider | optional |
| PROVIDER_OUTREACH_PUBLIC_SITE | mailing / email provider | required |
| PROVIDER_OUTREACH_TELEGRAM_NOTIFY | mailing / email provider | optional |
| RESEND_API_KEY | mailing / email provider | required |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role | required |
| TELEGRAM_BOT_TOKEN | unknown / legacy | required |
| TELEGRAM_ADMIN_IDS | unknown / legacy | required |

---

## content-hub → env map

38 ключей — полный список в `ops/env/content-hub.env.example`.

Основные группы:

| Group | Keys (examples) |
|-------|-----------------|
| Supabase service role | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| OpenAI / AI | `OPENAI_API_KEY`, `OPENAI_MODEL_*`, `OPENAI_REQUEST_TIMEOUT_MS` |
| FAL (optional fallback) | `FAL_KEY`, `FAL_*`, `FLUX_*` |
| Content Hub flags | `CONTENT_HUB_*` (publish, covers, linking limits) |
| Site callback | `SITE_URL`, `CONTENT_ARTICLE_MATCH_SECRET`, `CONTENT_ARTICLE_MATCH_PATH` |
| Process modes | `CONTINUOUS_MODE`, `PROCESS_*`, `RUN_REPROCESS_ON_START` |

*Отдельный root: `services/content-hub` — env не совпадает 1:1 с main site.*

---

## translation → env map

| Key | Category | Required |
|-----|----------|----------|
| I18N_PILOT_ALLOW_DB_WRITES | worker flags | required (prod) |
| I18N_PILOT_ALLOW_PRODUCTION | worker flags | required (prod) |
| I18N_SCHOLARSHIP_AUTOPILOT | worker flags | required (prod) |
| I18N_WORKER_MAX_RUNTIME_MINUTES | worker flags | optional |
| I18N_WORKER_REQUIRE_LOCK | worker flags | optional |
| I18N_WORKER_START_WAVE | worker flags | required |
| I18N_WORKER_TARGET | worker flags | optional |
| I18N_WORKER_WAVE_SIZE | worker flags | optional |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon | required |
| NEXT_PUBLIC_SUPABASE_URL | Supabase anon | required |
| SITE_URL | unknown / legacy | required |
| SMOKE_BASE_URL | unknown / legacy | optional |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role | required |

*Код также поддерживает `I18N_WORKER_DRY_RUN`, `I18N_WORKER_FORCE_START_WAVE`, `I18N_WORKER_RESUME_MODE` — не заданы на Railway (defaults).*

---

## Shared secrets (пересечения между сервисами)

| Key | Services using it |
|-----|-------------------|
| SUPABASE_SERVICE_ROLE_KEY | site, scripts, seo-*, mailing*, content-hub, translation |
| NEXT_PUBLIC_SUPABASE_URL | почти все |
| NEXT_PUBLIC_SITE_URL / SITE_URL / PUBLIC_URL | site, scripts, seo-*, mailing |
| GOOGLE_INDEXING_* | site, seo-generation, seo-indexing |
| OPENAI_API_KEY | site, scripts, seo-generation, content-hub |
| RESEND_API_KEY | site, mailing, mailing-providers |
| TELEGRAM_BOT_TOKEN | site, scripts, seo-indexing, seo-audit, mailing-providers |

**На VPS:** для site достаточно `site.env`. Jobs получают свой файл + могут наследовать shared secrets через secret manager (не дублировать в git).

---

## Безопасность

- [x] Значения env не включены в отчёт
- [x] `ops/env/*.env.example` содержат только placeholders
- [ ] На VPS: `chmod 600 /opt/scholarshiptop/env/*.env`
- [ ] **Не коммитить** заполненные `.env` файлы
- [ ] Перед cutover: сверить key names с Railway dashboard вручную

## Machine-readable snapshot

`reports/vps-migration/_env-keys-snapshot.json` — key names + categories (без values).
