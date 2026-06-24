# Stage 8a — Railway services inventory (post-DNS cutover)

**Дата:** 2026-06-24  
**Проект:** Сайт/Контент Хаб (`bf7ec9f5-cc2e-4827-be34-78f034594575`)  
**Environment:** production  
**Production traffic:** `scholarshiptop.com` → Cloudflare → **VPS** `213.155.22.74`  
**Режим:** read-only (Railway settings не менялись)

## Verdict context

Инвентаризация для Stage 8 env transfer. Сервисы на Railway **не останавливались** в этом этапе.

---

## Summary

| # | Service | Type | Railway status | Schedule | Active replica | Migrate later |
|---|---------|------|----------------|----------|----------------|---------------|
| 1 | Сайт | web | **Online** | — | yes | rollback only* |
| 2 | Скрипты | cron | Completed | `0 */2 * * *` | no (cron) | **yes** |
| 3 | Сео генерация | cron | Completed | `0 */3 * * *` | no (cron) | **yes** |
| 4 | Сео индексация | cron | Completed | `0 */4 * * *` | no (cron) | **yes** |
| 5 | Сео Аудит | cron | Completed | `0 9 * * *` | no (cron) | **yes** |
| 6 | Рассылка | cron | Completed | `30 0 * * *` | no (cron) | **yes** |
| 7 | Рассылка провайдеры | worker | **Online** | — | yes | **yes** |
| 8 | Контент Хаб | worker | Completed | — | no | **yes** |
| 9 | Перевод | worker | Completed | — | no | **yes** |

\*Сайт на Railway оставлен для rollback; production HTTP обслуживает VPS.

**Cron next run (Railway UI, snapshot):** Скрипты ~11 min · Сео генерация ~1h · Сео индексация ~2h · Рассылка ~10h · Сео Аудит ~19h

---

## Per-service detail

### 1. Сайт

| Field | Value |
|-------|-------|
| Service ID | `cf579132-2472-489a-879b-f6fea4b6fae9` |
| Status | **Online** |
| Deploy | `loomany/scholarshipstop` @ `main` (`366ff3ab`) |
| Build | RAILPACK default → `npm run build` |
| Start | `npm start` |
| DB writes | yes |
| Email | transactional (Resend) |
| GSC/indexing secrets | yes (in site env) |
| Safe to stop now? | **after rollback window** — keep until jobs migrated |
| Must migrate later? | production already on VPS |

### 2. Скрипты

| Field | Value |
|-------|-------|
| Service ID | `760ff2aa-1b06-4154-8d40-c002db5e120e` |
| Status | Completed (cron active) |
| Schedule | `0 */2 * * *` |
| Start | `bash scripts/railway-cron.sh all` |
| DB writes | **yes** |
| Email | no |
| GSC/indexing | no |
| Safe to stop now? | pause cron before VPS equivalent |
| Must migrate later? | **yes** (high risk if dual-run) |

### 3. Сео генерация

| Field | Value |
|-------|-------|
| Service ID | `498672c3-6406-4a46-a0a4-d5df095db8ad` |
| Status | Completed (cron active) |
| Schedule | `0 */3 * * *` |
| Start | `bash scripts/railway-cron.sh seo-generation-http` |
| DB writes | **yes** |
| Calls indexing/GSC | via site internal API |
| Safe to stop now? | pause before VPS run |
| Must migrate later? | **yes** |

### 4. Сео индексация

| Field | Value |
|-------|-------|
| Service ID | `c0acd619-ecac-4bba-8490-55c259388a4a` |
| Status | Completed (cron active) |
| Schedule | `0 */4 * * *` |
| Start | `google-indexing-flush` + `seo-url-inspection` |
| DB writes | **yes** |
| GSC / Indexing API | **yes** |
| Safe to stop now? | pause before VPS run |
| Must migrate later? | **yes** |

### 5. Сео Аудит

| Field | Value |
|-------|-------|
| Service ID | `1bcdbfab-8a9c-4c72-93fa-9a2e37c70858` |
| Status | Completed (cron active) |
| Schedule | `0 9 * * *` |
| Start | `npm run audit:jsonld-sitemap:prod` |
| DB writes | no (read-only HTTP + Telegram) |
| Safe to stop now? | low risk; pause to avoid duplicate Telegram |
| Must migrate later? | **yes** (low/medium risk) |

### 6. Рассылка

| Field | Value |
|-------|-------|
| Service ID | `b08cc9ff-735d-424f-9563-7bd3d74862ec` |
| Status | Completed (cron active) |
| Schedule | `30 0 * * *` |
| Start | `bash scripts/railway-cron.sh grant-notifications` |
| DB writes | yes |
| Email | **yes** |
| Safe to stop now? | pause before any VPS mailing |
| Must migrate later? | **yes** |

### 7. Рассылка провайдеры

| Field | Value |
|-------|-------|
| Service ID | `b8df79b8-3d4c-48e0-b536-979b98e8c7be` |
| Status | **Online** |
| Start | `send-provider-outreach-emails.ts` + sleep |
| DB writes | yes |
| Email | **yes** |
| Safe to stop now? | **stop before VPS outreach** |
| Must migrate later? | **yes** |

### 8. Контент Хаб

| Field | Value |
|-------|-------|
| Service ID | `cbbc0b60-9a84-46b8-9e59-b466452eb12e` |
| Status | Completed |
| Root | `services/content-hub` |
| Start | `npm run content:run-once` |
| DB writes | **yes** |
| Safe to stop now? | yes (not running) |
| Must migrate later? | **yes** |

### 9. Перевод

| Field | Value |
|-------|-------|
| Service ID | `db1e0669-5f3d-4849-a7f0-50859100d7ef` |
| Status | Completed |
| Start | `npm run i18n:scholarship-autopilot:railway` |
| DB writes | **yes** (DB lock) |
| Safe to stop now? | yes (not running) |
| Must migrate later? | **yes** |

---

## Architecture (current)

```text
Users → Cloudflare → VPS (site/nginx) → Supabase
Jobs  → Railway (cron/workers, still scheduled) → Supabase
```

---

## Related

- Stage 0 inventory: `00-railway-services-inventory-2026-06-24.md`
- Job risk map: `02-job-risk-map-2026-06-24.md`
- Env transfer: `08b-vps-all-env-transfer-2026-06-24.md`
