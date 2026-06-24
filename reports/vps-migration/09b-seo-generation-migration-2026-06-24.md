# Stage 9B — SEO Generation migration (Railway → VPS)

**Дата:** 2026-06-24  
**Scope:** только Railway `Сео генерация` → VPS job `seo-generation`  
**Production:** https://scholarshiptop.com → Cloudflare Full (strict) → VPS `213.155.22.74`

## Verdict: **PASS**

VPS SEO Generation migrated. Railway `Сео генерация` down. VPS cron `0 */3 * * *` enabled. Dry-run and controlled production run **PASS**. Production smoke **PASS**. Sitemap loc counts unchanged. Site remained **healthy**.

---

## Step 1 — Railway pre-state (read-only)

| Item | Value |
|------|-------|
| Service | **Сео генерация** |
| Service ID | `498672c3-6406-4a46-a0a4-d5df095db8ad` |
| Type | Cron job |
| Schedule | `0 */3 * * *` (every 3 hours UTC) |
| Start command | `bash scripts/railway-cron.sh seo-generation-http` |
| Internal flow | `scripts/cron-seo-generation-http.ts` → HTTP POST to `/api/internal/seo/worker-generate` + `/api/internal/seo/meta-generate` on live `PUBLIC_URL` |
| Idle status (snapshot) | **Completed** |
| Next run (snapshot) | ~2h |
| Last run (logs) | **SUCCESS** @ `2026-06-24T15:02:42Z` |
| Env keys (Railway export) | **11** |
| DB writes | **да** — `seo_generation_queue`, `seo_hub_content`, compare tables, `seo_meta_*` via meta-generate |
| Local files | **нет** (HTTP client only on Railway) |
| Git commit/push | **нет** |
| OpenAI/API | **да** — via site internal API (`worker-generate`, `meta-generate`) |
| Sitemap impact | **да** — generated hub pages feed `seo_generation_sitemap_paths` RPC |
| Last run body (logs) | `worker-generate`: `fetched=0`, `limit=1`; `meta-generate`: `selected=0`, `completed=0` |

---

## Step 2 — VPS env

| Check | Result |
|-------|--------|
| `/opt/scholarshiptop/env/seo-generation.env` | **present**, `chmod 600` |
| Key count | **11** |
| Key names | `GOOGLE_INDEXING_CLIENT_EMAIL`, `GOOGLE_INDEXING_PRIVATE_KEY`, `GOOGLE_INDEXING_SECRET`, `GOOGLE_SEARCH_CONSOLE_SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `OPENAI_API_KEY`, `OPENAI_SEO_MODEL`, `SEO_AI_META_BATCH`, `SEO_AI_META_ENABLED`, `SUPABASE_SERVICE_ROLE_KEY` |
| `GOOGLE_INDEXING_SECRET` vs `site.env` | present in both (values not logged) |

**Note:** `PUBLIC_URL` is **not** in env file; wrapper sets `PUBLIC_URL=http://127.0.0.1:3000` at runtime (loopback, same pattern as SEO Audit).

---

## Step 3 — Dry-run availability

| Capability | Available? | Mechanism |
|------------|------------|-----------|
| Worker dry-run | **yes** | API `POST /api/internal/seo/worker-generate` accepts `{ dryRun: true }`; `runSeoWorkerGenerate` skips all DB/OpenAI writes |
| Meta dry-run | **no** | `meta-generate` has no dry-run; **skipped entirely** when cron runs with `--dry-run` |
| Disable meta via env | partial | `SEO_AI_META_ENABLED` on **site** container controls runtime meta resolution; batch processor has no global off-switch |
| Disable OpenAI in dry-run | **yes** | `dryRun: true` on worker |
| Redirect output | n/a | HTTP job; logs only |

**Code change (repo):** `scripts/cron-seo-generation-http.ts` — added `--dry-run` flag:
- dry-run: only `worker-generate` with `{ dryRun: true, limit: ≤50 }`
- production: both endpoints (same as Railway)

---

## Step 4 — VPS wrapper (no cron until step 8)

| Artifact | Path |
|----------|------|
| One-shot wrapper | `/opt/scholarshiptop/scripts/run-seo-generation-once.sh` |
| Cron template (repo) | `ops/vps/scripts/run-seo-generation-once.sh` |
| Cron schedule file (repo) | `ops/vps/cron/scholarshiptop-seo-generation` |
| Updated cron entrypoint | `/opt/scholarshiptop/app/scripts/cron-seo-generation-http.ts` |

Wrapper rules: uses `seo-generation.env`, sets loopback `PUBLIC_URL`, logs to `/opt/scholarshiptop/logs/seo-generation-run-*.log`, non-zero exit on failure, never prints env values.

---

## Step 5 — Safe dry-run (Railway still active)

```bash
sudo bash /opt/scholarshiptop/scripts/run-seo-generation-once.sh --dry-run
```

| Item | Result |
|------|--------|
| Exit code | **0** |
| Duration | ~606 ms |
| Log | `/opt/scholarshiptop/logs/seo-generation-run-20260624T153535Z.log` |
| worker-generate | HTTP **200**, `fetched=0`, `dryRun=true`, `limit=1` |
| meta-generate | **not called** (dry-run mode) |
| DB writes | **none** (queue empty + dry-run) |
| Local file changes | **none** |
| Site health after | `scholarshiptop-site` **healthy** |
| Loopback smoke | `/`, `/sitemap.xml`, `/scholarships/no-essay` → **200** |

---

## Step 6 — Railway disabled

```bash
railway down -s "Сео генерация" -y
```

| Item | Result |
|------|--------|
| Post-down status | **Failed** (deployment stopped; schedule preserved `0 */3 * * *`) |
| Service deleted | **no** |
| Env preserved | **yes** |
| Other Railway services | **untouched** |

---

## Step 7 — Controlled VPS production run

```bash
sudo bash /opt/scholarshiptop/scripts/run-seo-generation-once.sh
```

| Item | Result |
|------|--------|
| Exit code | **0** |
| Duration | ~896 ms |
| Log | `/opt/scholarshiptop/logs/seo-generation-run-20260624T153617Z.log` |
| worker-generate | HTTP **200**, `fetched=0`, `dryRun=false`, `limit=1` |
| meta-generate | HTTP **200**, `selected=0`, `completed=0`, `failed=0`, `limit=20` |
| DB writes | **none** (both queues empty — same as last Railway run) |
| CPU/RAM (post-run) | site ~34% CPU, ~1.24 GiB RAM; nginx ~15 MiB |
| Site health | **healthy** |

### Sitemap loc count before / after

| URL | Before | After |
|-----|--------|-------|
| `/sitemap.xml` | **83** | **83** |
| `/sitemaps/scholarships-0.xml` | **765** | **765** |

### Production smoke (post-run)

`node scripts/vps-migration/stage-7-post-cutover-smoke.mjs` → **PASS**

| URL | Status | SEO |
|-----|--------|-----|
| `/` | 200 | OK |
| `/sitemap.xml` | 200 | valid XML |
| `/sitemaps/scholarships-0.xml` | 200 | valid XML |
| `/scholarships/no-essay` | 200 | **index, follow** |
| `/scholarships/closing-soon` | 200 | **index, follow** |
| `/scholarships/california` | 200 | **noindex, follow** |
| 500/502/525/526 | **none** | |

---

## Step 8 — VPS schedule enabled

| Item | Value |
|------|-------|
| Cron file | `/etc/cron.d/scholarshiptop-seo-generation` |
| Schedule | `0 */3 * * *` (matches Railway) |
| Command | `/opt/scholarshiptop/scripts/run-seo-generation-once.sh` |
| Log | `/opt/scholarshiptop/logs/seo-generation-cron.log` |

**Other VPS crons unchanged:** `scholarshiptop-seo-audit` only (+ this new one).  
**Not enabled:** scripts, seo-indexing, mailing, content-hub, translation, mailing-providers.

---

## Active state after migration

### VPS containers

| Container | Status |
|-----------|--------|
| `scholarshiptop-site` | Up, **healthy** |
| `scholarshiptop-nginx` | Up |

### VPS cron

| Job | Schedule | Status |
|-----|----------|--------|
| seo-audit | `0 9 * * *` | enabled |
| **seo-generation** | `0 */3 * * *` | **enabled** |

### Railway

| Service | Status |
|---------|--------|
| Сео генерация | **down** (Failed) |
| Сео Аудит | down (from 9A-bis) |
| Сайт | down (from 8C) |
| Скрипты, Сео индексация, Рассылка, … | still active |

---

## Rollback

```bash
# Disable VPS seo-generation cron
sudo rm -f /etc/cron.d/scholarshiptop-seo-generation

# Restore Railway service
railway redeploy -s "Сео генерация" --from-source -y
railway service status -s "Сео генерация"   # expect SUCCESS

# Verify schedule
railway status   # Сео генерация: Completed, 0 */3 * * *
```

Production site remains on VPS (no DNS change).

---

## Files touched (repo)

| Path | Purpose |
|------|---------|
| `scripts/cron-seo-generation-http.ts` | `--dry-run` support |
| `ops/vps/scripts/run-seo-generation-once.sh` | VPS one-shot runner |
| `ops/vps/cron/scholarshiptop-seo-generation` | Cron template |

No secrets committed. No Supabase/DNS/other Railway services modified (except `Сео генерация` down).

---

## Notes

1. **Loopback origin:** wrapper sets `PUBLIC_URL=http://127.0.0.1:3000` so generation hits the local site container, not Cloudflare (avoids timeout/loop risk from VPS).
2. **`limit=1`:** matches last Railway runs in logs (`fetched=0`). Queue was empty; no generation work this cycle.
3. **Deploy tip:** when SCP scripts from Windows, run `perl -pi -e 's/\r$//'` on VPS before executing bash scripts.
