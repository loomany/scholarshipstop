# Stage 9D–9H — Bulk remaining Railway jobs cutover (→ VPS)

**Дата:** 2026-06-24  
**Scope:** Контент Хаб, Рассылка провайдеры, Скрипты, Сео индексация, Рассылка  
**Production:** https://scholarshiptop.com → Cloudflare → VPS `213.155.22.74`

## Verdict: **PASS_WITH_WARNINGS**

All five remaining Railway jobs prepared on VPS. Railway counterparts **down** (Failed / NO DEPLOYMENT). Scheduled jobs enabled on VPS cron. One-shot services (Контент Хаб, Рассылка провайдеры) have **manual wrappers only, no cron**. Pre- and post-cutover production smoke **PASS**. No production mailing send or Google indexing submit during validation.

---

## Step 1 — Railway inventory (before cutover)

| Service | Type | Status (before) | Command | Schedule | Env keys |
|---------|------|-----------------|---------|----------|----------|
| **Контент Хаб** | one-shot worker | Completed / STOPPED | `npm run content:run-once` | **none** | **36** |
| **Рассылка провайдеры** | long-running worker | **Online / SUCCESS** | `npx tsx scripts/send-provider-outreach-emails.ts` + sleep | **none** | **8** |
| **Скрипты** | cron | Completed / STOPPED | `bash scripts/railway-cron.sh all` | `0 */2 * * *` | **15** |
| **Сео индексация** | cron | Completed / STOPPED | `google-indexing-flush` + `seo-url-inspection` | `0 */4 * * *` | **18** |
| **Рассылка** | cron | Completed / STOPPED | `bash scripts/railway-cron.sh grant-notifications` | `30 0 * * *` | **12** |

**Скрипты `all` tasks:** `enrich-providers`, `essay-pipeline`, `manual-essay-guides` (indexing moved to separate service).

**Сео индексация subtasks:** `cron-google-indexing-flush.ts`, `cron-check-index-worker.ts`, `cron-scan-indexing.ts`.

**DB writes:** all five yes (Supabase). **Email:** Рассылка + Рассылка провайдеры. **Google API:** Сео индексация only.

---

## Step 2 — VPS env files

| File | Keys |
|------|------|
| `/opt/scholarshiptop/env/content-hub.env` | **36** |
| `/opt/scholarshiptop/env/mailing-providers.env` | **8** |
| `/opt/scholarshiptop/env/scripts.env` | **15** |
| `/opt/scholarshiptop/env/seo-indexing.env` | **18** |
| `/opt/scholarshiptop/env/mailing.env` | **12** |

All present, `chmod 600`. Values not logged.

---

## Step 3 — VPS wrappers created

| Wrapper | Env | Command |
|---------|-----|---------|
| `run-content-hub-once.sh` | `content-hub.env` | `tsx src/jobs/runContentJob.ts` in `services/content-hub` |
| `run-mailing-providers-once.sh` | `mailing-providers.env` | `send-provider-outreach-emails.ts` (`--dry-run` supported) |
| `run-scripts-once.sh` | `scripts.env` | `railway-cron.sh all` via loopback `PUBLIC_URL=http://127.0.0.1:3000` |
| `run-seo-indexing-once.sh` | `seo-indexing.env` | `google-indexing-flush` then `seo-url-inspection` |
| `run-mailing-once.sh` | `mailing.env` | `railway-cron.sh grant-notifications` |

Repo templates: `ops/vps/scripts/run-*.sh`

**Note:** Content-hub `dist/` not built on VPS; wrapper uses root `tsx` on `src/jobs/runContentJob.ts` (same entrypoint as Railway, without pre-build).

**CRLF:** Windows SCP initially introduced `\r`; fixed by deploying LF-only copies before install.

---

## Step 4 — Cron files prepared (staged → enabled in Step 8)

| Staged file | Schedule | Railway match |
|-------------|----------|---------------|
| `scholarshiptop-scripts` | `0 */2 * * *` | yes |
| `scholarshiptop-seo-indexing` | `0 */4 * * *` | yes |
| `scholarshiptop-mailing` | `30 0 * * *` | yes |

**No cron created for:**

- **Контент Хаб** — confirmed one-shot / Completed
- **Рассылка провайдеры** — no Railway schedule (was Online worker; manual trigger on VPS)
- **Перевод** — already manual-only from Stage 9C

---

## Step 5 — Lightweight validation

| Check | Result |
|-------|--------|
| `bash -n` all 5 wrappers | **PASS** (after LF fix) |
| Env files exist | **PASS** |
| Command paths exist | **PASS** |
| `/opt/scholarshiptop/logs` writable | **PASS** |
| Рассылка — production send | **not run** |
| Сео индексация — Google submit | **not run** (syntax only) |
| Рассылка провайдеры `--dry-run` | **PASS** exit **0**, 594 processed / **0 sent** / 594 skipped |

Dry-run log: `/opt/scholarshiptop/logs/mailing-providers-run-20260624T163558Z.log`

---

## Step 6 — Pre-cutover smoke

`node scripts/vps-migration/stage-7-post-cutover-smoke.mjs` → **PASS**

`scholarshiptop-site` healthy, `scholarshiptop-nginx` running.

---

## Step 7 — Bulk Railway down

```bash
railway down -s "Контент Хаб" -y
railway down -s "Рассылка провайдеры" -y
railway down -s "Скрипты" -y
railway down -s "Сео индексация" -y
railway down -s "Рассылка" -y
```

| Service | After |
|---------|-------|
| Контент Хаб | **Failed** |
| Рассылка провайдеры | **Failed** |
| Скрипты | **Failed** (schedule preserved) |
| Сео индексация | **Failed** (schedule preserved) |
| Рассылка | **Failed** (schedule preserved) |

Services **not deleted**. Env preserved. Already-migrated services untouched.

---

## Step 8 — VPS crons enabled

Installed to `/etc/cron.d/`:

| File | Schedule |
|------|----------|
| `scholarshiptop-seo-audit` | `0 9 * * *` *(existing)* |
| `scholarshiptop-seo-generation` | `0 */3 * * *` *(existing)* |
| `scholarshiptop-scripts` | `0 */2 * * *` **new** |
| `scholarshiptop-seo-indexing` | `0 */4 * * *` **new** |
| `scholarshiptop-mailing` | `30 0 * * *` **new** |

---

## Step 9 — Post-cutover checks

| Check | Result |
|-------|--------|
| Active VPS crons | 5 files (see above) |
| `docker ps` | `scholarshiptop-site` **healthy**, `scholarshiptop-nginx` up |
| `stage-7-post-cutover-smoke.mjs` | **PASS** |
| `/scholarships/no-essay` | 200, **index, follow** |
| `/scholarships/closing-soon` | 200, **index, follow** |
| 500/502/521/525/526 | **none** |
| Duplicate Railway schedules | **no** (all counterparts Failed) |

---

## Manual-only VPS jobs (no cron)

| Service | Wrapper | When to run |
|---------|---------|-------------|
| Контент Хаб | `run-content-hub-once.sh` | Manual publish batch |
| Рассылка провайдеры | `run-mailing-providers-once.sh` | Manual outreach (`--dry-run` for test) |
| Перевод | `run-translation-once.sh` | Manual translation wave |

---

## Warnings

1. **CRLF on Windows SCP** — deploy wrappers with LF-only copies or `sed 's/\r//g'` before install.
2. **Content-hub** — no `dist/` on VPS; uses `tsx` on source (verify before first manual run).
3. **Рассылка провайдеры** was **Online** on Railway until cutover; stopped in batch down.
4. **No controlled production run** for cron jobs at cutover time — first real runs happen on next schedule tick.
5. **Do not dual-run** Railway redeploy + VPS cron for any job.

---

## Rollback (per job)

```bash
# Example: rollback Скрипты only
sudo rm -f /etc/cron.d/scholarshiptop-scripts
railway redeploy -s "Скрипты" --from-source -y
railway service status -s "Скрипты"
```

| Job | Rollback cron remove | Railway restore |
|-----|---------------------|-----------------|
| Скрипты | `scholarshiptop-scripts` | `railway redeploy -s "Скрипты" --from-source -y` |
| Сео индексация | `scholarshiptop-seo-indexing` | `railway redeploy -s "Сео индексация" --from-source -y` |
| Рассылка | `scholarshiptop-mailing` | `railway redeploy -s "Рассылка" --from-source -y` |
| Контент Хаб | *(no cron)* | `railway redeploy -s "Контент Хаб" --from-source -y` |
| Рассылка провайдеры | *(no cron)* | `railway redeploy -s "Рассылка провайдеры" --from-source -y` |

Production site remains on VPS (no DNS change).

---

## Files touched (repo)

| Path |
|------|
| `ops/vps/scripts/run-content-hub-once.sh` |
| `ops/vps/scripts/run-mailing-providers-once.sh` |
| `ops/vps/scripts/run-scripts-once.sh` |
| `ops/vps/scripts/run-seo-indexing-once.sh` |
| `ops/vps/scripts/run-mailing-once.sh` |
| `ops/vps/cron/scholarshiptop-scripts` |
| `ops/vps/cron/scholarshiptop-seo-indexing` |
| `ops/vps/cron/scholarshiptop-mailing` |

No secrets committed. No Supabase/DNS/SSL changes.

---

## Full VPS job state after bulk cutover

| Job | VPS | Railway |
|-----|-----|---------|
| Сайт | docker site+nginx | down |
| Сео Аудит | cron | down |
| Сео генерация | cron | down |
| Скрипты | **cron** | down |
| Сео индексация | **cron** | down |
| Рассылка | **cron** | down |
| Контент Хаб | manual wrapper | down |
| Рассылка провайдеры | manual wrapper | down |
| Перевод | manual wrapper | offline |
