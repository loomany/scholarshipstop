# Этап 0 — Railway services inventory

**Дата:** 2026-06-24  
**Проект:** Сайт/Контент Хаб (`bf7ec9f5-cc2e-4827-be34-78f034594575`)  
**Environment:** production  
**Workspace:** loomany's Projects  
**Режим:** read-only аудит (без deploy, без изменений env, без запуска jobs)

## Статус миграции (трекер)

| Поле | Значение |
|------|----------|
| Этап | 0 — инвентаризация Railway |
| Railway | активен |
| VPS | не production |
| Supabase | не переносим (этап 1) |
| Первый перенос | только сайт |
| Jobs на VPS | запрещены до отдельного разрешения |
| DNS | не трогали |
| Commit baseline | `366ff3ab` (большинство сервисов), `98074d8d` (Перевод) |

---

## Сводка

| # | Сервис | Тип | Статус | Cron | Одновременно с VPS |
|---|--------|-----|--------|------|-------------------|
| 1 | Сайт | web | Online | — | да (низкий риск, до DNS cutover) |
| 2 | Скрипты | cron | Completed / stopped | `0 */2 * * *` | **нет** |
| 3 | Сео генерация | cron | Completed / stopped | `0 */3 * * *` | **нет** |
| 4 | Сео индексация | cron | Completed / stopped | `0 */4 * * *` | **нет** |
| 5 | Сео Аудит | cron | Completed / stopped | `0 9 * * *` | осторожно (низкий/средний) |
| 6 | Рассылка | cron | Completed / stopped | `30 0 * * *` | **нет** |
| 7 | Рассылка провайдеры | worker | **Online** | — | **нет** |
| 8 | Контент Хаб | worker | Completed / stopped | — | **нет** |
| 9 | Перевод | worker | Completed / stopped | — | **нет** |

**Активно сейчас:** `Сайт` (1 replica RUNNING), `Рассылка провайдеры` (1 replica RUNNING, sleep после outreach).

**Volumes:** ни у одного сервиса нет persistent volumes.

**Region:** `europe-west4-drams3a` (все сервисы).

**Builder:** RAILPACK, Node 22.22.3, `nodeRuntime: next`.

---

## 1. Сайт

| Поле | Значение |
|------|----------|
| Service ID | `cf579132-2472-489a-879b-f6fea4b6fae9` |
| Статус | SUCCESS, Online, 1 RUNNING |
| Deploy source | `loomany/scholarshipstop` |
| Branch | `main` |
| Commit | `366ff3abb1415bb0ff8d1204356d29a771e12c52` |
| Root directory | repo root |
| Build command | *(default RAILPACK)* → `npm run build` → `next build --experimental-app-only` |
| Start command | *(default RAILPACK)* → `npm start` → `next start` |
| Cron / schedule | — |
| Healthcheck | не настроен |
| Restart policy | `ON_FAILURE`, max retries 10 |
| Volumes | нет |
| Public URL | https://scholarshiptop.com |
| DB writes | да (API, webhooks, auth) |
| Supabase service role | да |
| Email / рассылка | да (Resend, transactional) |
| Параллельно с VPS | **низкий риск** — read-heavy; дубли webhook возможны только при двойном трафике |

---

## 2. Скрипты

| Поле | Значение |
|------|----------|
| Service ID | `760ff2aa-1b06-4154-8d40-c002db5e120e` |
| Статус | SUCCESS, deployment stopped, cron active |
| Deploy source | `loomany/scholarshipstop` @ `main` |
| Build command | *(default RAILPACK)* |
| Start command | `bash scripts/railway-cron.sh all` |
| Cron / schedule | `0 */2 * * *` (каждые 2 часа) |
| Healthcheck | не настроен |
| Restart policy | `NEVER` |
| Volumes | нет |
| Subtasks (`all`) | `enrich-providers`, `essay-pipeline`, `manual-essay-guides` |
| DB writes | **да** (providers, essays, guides) |
| Supabase service role | да |
| OpenAI / FAL | да |
| Email | нет (в `all`) |
| Параллельно с VPS | **нет** — высокий риск дублирования DB writes |

---

## 3. Сео генерация

| Поле | Значение |
|------|----------|
| Service ID | `498672c3-6406-4a46-a0a4-d5df095db8ad` |
| Статус | SUCCESS, deployment stopped, cron active |
| Deploy source | `loomany/scholarshipstop` @ `main` |
| Build command | *(default RAILPACK)* |
| Start command | `bash scripts/railway-cron.sh seo-generation-http` |
| Cron / schedule | `0 */3 * * *` |
| Restart policy | `NEVER` |
| Internal flow | `scripts/cron-seo-generation-http.ts` → HTTP POST к `/api/internal/seo/*` на `PUBLIC_URL` |
| DB writes | **да** (SEO pages, meta) |
| Supabase service role | да |
| GSC / indexing secrets | да (`GOOGLE_INDEXING_SECRET`) |
| Параллельно с VPS | **нет** — высокий риск |

---

## 4. Сео индексация

| Поле | Значение |
|------|----------|
| Service ID | `c0acd619-ecac-4bba-8490-55c259388a4a` |
| Статус | SUCCESS, deployment stopped, cron active |
| Deploy source | `loomany/scholarshipstop` @ `main` |
| Start command | `bash scripts/railway-cron.sh google-indexing-flush && bash scripts/railway-cron.sh seo-url-inspection` |
| Cron / schedule | `0 */4 * * *` |
| Restart policy | `NEVER` |
| Subtasks | `cron-google-indexing-flush.ts`, `cron-check-index-worker.ts`, `cron-scan-indexing.ts` |
| DB writes | **да** (`google_indexing_queue`, inspection state) |
| Google Indexing API | да |
| URL Inspection API | да |
| Параллельно с VPS | **нет** — высокий риск (quota + duplicate indexing) |

---

## 5. Сео Аудит

| Поле | Значение |
|------|----------|
| Service ID | `1bcdbfab-8a9c-4c72-93fa-9a2e37c70858` |
| Статус | SUCCESS, deployment stopped, cron active |
| Deploy source | `loomany/scholarshipstop` @ `main` |
| Start command | `npm run audit:jsonld-sitemap:prod` |
| Cron / schedule | `0 9 * * *` (09:00 UTC daily) |
| Restart policy | `NEVER` |
| DB writes | нет (read-only HTTP audit + Telegram) |
| Supabase service role | нет |
| Telegram | да |
| Параллельно с VPS | **осторожно** — можно при другом `JSONLD_AUDIT_BASE_URL`, иначе дубли Telegram-алертов |

---

## 6. Рассылка

| Поле | Значение |
|------|----------|
| Service ID | `b08cc9ff-735d-424f-9563-7bd3d74862ec` |
| Статус | SUCCESS, deployment stopped, cron active |
| Deploy source | `loomany/scholarshipstop` @ `main` |
| Start command | `bash scripts/railway-cron.sh grant-notifications` |
| Cron / schedule | `30 0 * * *` (00:30 UTC daily) |
| Restart policy | `NEVER` |
| Script | `scripts/cron-grant-notifications.ts` |
| DB writes | да (digest state, cooldowns) |
| Supabase service role | да |
| Email (Resend) | **да** |
| Параллельно с VPS | **нет** — высокий риск повторной рассылки |

---

## 7. Рассылка провайдеры

| Поле | Значение |
|------|----------|
| Service ID | `b8df79b8-3d4c-48e0-b536-979b98e8c7be` |
| Статус | **SUCCESS, Online**, 1 RUNNING |
| Deploy source | `loomany/scholarshipstop` @ `main` |
| Start command | `npx --yes tsx scripts/send-provider-outreach-emails.ts && echo "..." && tail -f /dev/null` |
| Cron / schedule | — (one-shot + sleep) |
| Restart policy | `ON_FAILURE` |
| DB writes | да (outreach tracking) |
| Supabase service role | да |
| Email (Resend) | **да** |
| Параллельно с VPS | **нет** — сейчас активен на Railway |

---

## 8. Контент Хаб

| Поле | Значение |
|------|----------|
| Service ID | `cbbc0b60-9a84-46b8-9e59-b466452eb12e` |
| Статус | SUCCESS, deployment stopped |
| Deploy source | `loomany/scholarshipstop` @ `main` |
| Root directory | `services/content-hub` |
| Build command | `npm install && npm run build` |
| Start command | `npm run content:run-once` |
| Cron / schedule | — (one-shot worker) |
| Restart policy | `ON_FAILURE` |
| DB writes | **да** (`content_posts`, topics) |
| Supabase service role | да (`SUPABASE_URL` + key) |
| OpenAI / FAL | да |
| Параллельно с VPS | **нет** — риск дублирования публикаций |

---

## 9. Перевод

| Поле | Значение |
|------|----------|
| Service ID | `db1e0669-5f3d-4849-a7f0-50859100d7ef` |
| Статус | SUCCESS, deployment stopped |
| Deploy source | `loomany/scholarshipstop` @ `main` |
| Commit | `98074d8d` *(отстаёт от остальных)* |
| Build command | *(default RAILPACK)* |
| Start command | `npm run i18n:scholarship-autopilot:railway` |
| Cron / schedule | — (one-shot worker) |
| Restart policy | `ON_FAILURE` |
| Lock | `i18n_scholarship_autopilot` DB lock |
| DB writes | **да** (i18n scholarship_detail) |
| Supabase service role | да |
| Production guards | `I18N_SCHOLARSHIP_AUTOPILOT=1`, `I18N_PILOT_ALLOW_DB_WRITES=1`, `I18N_PILOT_ALLOW_PRODUCTION=1` |
| Параллельно с VPS | **нет** — высокий риск (lock помогает, но не при двух воркерах одновременно) |

---

## Архитектура (текущая)

```
Cloudflare → Railway (Сайт) → Supabase (remote, без изменений)
                ↓
         Cron / Workers (9 сервисов, общий repo)
```

## Следующие шаги

- [x] Этап 0 — этот отчёт
- [x] Этап 1 — `01-env-inventory-2026-06-24.md` + `ops/env/*.env.example`
- [x] Этап 2 — `02-job-risk-map-2026-06-24.md`
- [ ] Этап 3 — подготовка VPS (только site ON)
- [ ] Этап 4 — smoke на временном домене/IP
- [ ] Этап 5–7 — Cloudflare, DNS, jobs по одному

## Примечания

- Cron-сервисы на Railway имеют `restartPolicy: NEVER` — контейнер стартует по расписанию, выполняет start command и завершается.
- `Рассылка провайдеры` — единственный worker кроме сайта, который сейчас держит RUNNING replica (sleep после завершения outreach).
- Env key names собраны отдельно; **значения не включены** в этот отчёт.
