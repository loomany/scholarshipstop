# Stage 8b — VPS all-env transfer (Railway → private files)

**Дата:** 2026-06-24  
**Режим:** export + upload only — **jobs NOT started**

## Verdict: **PASS**

---

## What was done

1. Read-only Railway inventory refreshed (`railway status`, `railway service list`).
2. All 9 service envs exported via `railway variable list --json` (no values printed).
3. Uploaded to VPS `/opt/scholarshiptop/env/*.env` (`chmod 700` dir, `chmod 600` files).
4. Validated key counts on VPS (names-only audit script).
5. Production smoke — **PASS**.
6. VPS containers — site + nginx only.

**Not done (by design):** DNS change, Railway stop, Supabase change, job/cron start on VPS.

---

## VPS env files

| File | Railway service | Keys |
|------|-----------------|------|
| `site.env` | Сайт | **62** |
| `scripts.env` | Скрипты | **15** |
| `seo-generation.env` | Сео генерация | **11** |
| `seo-indexing.env` | Сео индексация | **18** |
| `seo-audit.env` | Сео Аудит | **5** |
| `mailing.env` | Рассылка | **12** |
| `mailing-providers.env` | Рассылка провайдеры | **8** |
| `content-hub.env` | Контент Хаб | **36** |
| `translation.env` | Перевод | **13** |

**Total:** 9 files, **180** keys across all services.

`site.env` overrides for VPS production:

- `SITE_URL` → `https://scholarshiptop.com`
- `NEXT_PUBLIC_SITE_URL` → `https://scholarshiptop.com`

(Railway `Сайт` env unchanged.)

Multiline secrets (e.g. `GOOGLE_INDEXING_PRIVATE_KEY`) exported as quoted single-line JSON values — safe for Docker `env_file`.

Local staging: `.vps-env-staging/` (gitignored). **Not committed.**

---

## Railway services still active

| Service | Railway status | Notes |
|---------|----------------|-------|
| Сайт | **Online** | rollback; traffic on VPS |
| Рассылка провайдеры | **Online** | stop before VPS outreach |
| Скрипты | cron scheduled | not stopped |
| Сео генерация | cron scheduled | not stopped |
| Сео индексация | cron scheduled | not stopped |
| Сео Аудит | cron scheduled | not stopped |
| Рассылка | cron scheduled | not stopped |
| Контент Хаб | Completed | not stopped |
| Перевод | Completed | not stopped |

---

## VPS prepared but OFF

| Profile | Status |
|---------|--------|
| `scholarshiptop-site` | **running** (production) |
| `scholarshiptop-nginx` | **running** |
| scripts / seo-* / mailing* / content-hub / translation | **env ready, containers NOT started** |

`docker ps` on VPS: only `scholarshiptop-site`, `scholarshiptop-nginx`.

---

## Security confirmations

| Check | Result |
|-------|--------|
| Env values printed to terminal/report | **no** |
| Env files committed to git | **no** |
| `.vps-env-staging/` gitignored | **yes** |
| Supabase touched | **no** |
| DNS changed | **no** |
| Railway env modified | **no** |

**Note:** first export used `--kv` and mis-parsed multiline PEM (garbage pseudo-key). Fixed via `--json` re-export + re-upload before final validation.

---

## Production smoke (post-transfer)

`stage-7-post-cutover-smoke.mjs` on `https://scholarshiptop.com` → **PASS**

| Check | Result |
|-------|--------|
| HTTP 500/502/525/526 | none |
| `/scholarships/no-essay` | index, follow |
| `/scholarships/closing-soon` | index, follow |
| sitemaps | 200, valid XML |
| canonical | `https://scholarshiptop.com/...` |

Site container **not restarted** after env file update (running process unchanged; new env on disk for next deploy/job stage).

---

## Recommended job migration order (Stage 9+)

Per `02-job-risk-map-2026-06-24.md` — **one job at a time**:

| Order | Service | Railway action first | VPS enable |
|-------|---------|----------------------|------------|
| 1 | **Сео Аудит** | pause cron | cron 09:00 UTC |
| 2 | **Сео генерация** | pause cron | cron `0 */3 * * *` |
| 3 | **Перевод** | stop service | one-shot / manual |
| 4 | **Контент Хаб** | stop service | one-shot |
| 5 | **Рассылка провайдеры** | **stop Online worker** | manual only |
| 6 | **Рассылка** | pause cron | cron `30 0 * * *` |
| 7 | **Сео индексация** | pause cron | cron `0 */4 * * *` |
| 8 | **Скрипты** | pause cron | cron `0 */2 * * *` |
| last | **Сайт (Railway)** | stop after stable VPS + jobs moved | rollback only |

Each step: pause/stop Railway → enable VPS profile → one run → verify → report.

---

## Scripts added/used

| Script | Purpose |
|--------|---------|
| `export-railway-service-env.mjs` | single service export |
| `export-all-railway-env.mjs` | all 9 services |
| `upload-env-to-vps.mjs` | SCP to VPS |
| `vps-env-key-audit.sh` | key names/counts on VPS |

---

## Acceptance criteria

| Criterion | Met |
|-----------|-----|
| All envs on VPS separate files | yes |
| chmod 600 | yes |
| No value leak in report | yes |
| VPS jobs OFF | yes |
| Production healthy | yes |
| Railway/Supabase/DNS unchanged | yes |
| Reports created | yes |
