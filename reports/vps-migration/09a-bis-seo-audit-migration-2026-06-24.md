# Stage 9A-bis — SEO Audit migration (Railway → VPS) — RETRY

**Дата:** 2026-06-24  
**Scope:** только Railway `Сео Аудит` → VPS `seo-audit`  
**Production:** https://scholarshiptop.com → Cloudflare Full (strict) → VPS `213.155.22.74`

## Verdict: **PASS**

VPS SEO Audit migrated. Railway `Сео Аудит` down. VPS cron `0 9 * * *` enabled. Production smoke **PASS**.

---

## Previous attempt (Stage 9A) — root cause

| Issue | Detail |
|-------|--------|
| Fetch path | Audit fetched `https://scholarshiptop.com/sitemap.xml` **through Cloudflare** from VPS |
| Timeout | Node `fetch` aborted at **45s** (origin loop slow/unreliable) |
| Site health | 1 GB RAM VPS; site container sometimes **unhealthy** under load |
| Result | Manual run **exit 1** → rollback to Railway |

---

## Step 1 — Preflight health

| Check | Result |
|-------|--------|
| VPS RAM | 3.8 GiB (~2.9 GiB available) |
| Disk `/` | 79G, 18% used |
| `scholarshiptop-site` | **healthy** |
| `scholarshiptop-nginx` | running |
| `docker stats` | site ~494 MiB, nginx ~15 MiB |
| Production curl | `/` **200**, `/sitemap.xml` **200** |
| `stage-7-post-cutover-smoke.mjs` | **PASS** |
| VPS jobs | no scholarshiptop cron |

---

## Step 2 — Fetch path fix

**Code change:** `scripts/audit-jsonld-sitemap.ts`

| Env (names only) | Purpose |
|------------------|---------|
| `JSONLD_AUDIT_PUBLIC_BASE_URL` | Public origin for reports / sitemap loc parsing (`https://scholarshiptop.com`) |
| `JSONLD_AUDIT_FETCH_BASE_URL` | Internal HTTP origin for fetches (`http://127.0.0.1:3000`) |
| `JSONLD_AUDIT_FETCH_TIMEOUT_MS` | `120000` (was hardcoded 45s) |
| `JSONLD_AUDIT_BASE_URL` | Kept as public origin (backward compatible) |

**Mechanism:** `toFetchUrl()` rewrites public URLs → loopback before `fetch()`. Telegram report and failure URLs use **public** origin. Production `site.env` **not** changed.

**Deployed to VPS:** `/opt/scholarshiptop/app/scripts/audit-jsonld-sitemap.ts`  
**Wrapper:** `/opt/scholarshiptop/scripts/run-seo-audit-once.sh` (supports `--dry-run`)

---

## Step 3 — Manual dry-run (Railway still active)

```bash
sudo bash /opt/scholarshiptop/scripts/run-seo-audit-once.sh --dry-run
```

| Item | Result |
|------|--------|
| Exit code | **0** |
| Duration | ~480s |
| Sampled | 105 pages (100 scholarships + 5 hub/other) |
| JSON-LD issues | **0** |
| Telegram | skipped (`--dry-run`) |
| Site health after | **healthy** |
| Production smoke | **PASS** |

Log: `/opt/scholarshiptop/logs/seo-audit-run-20260624T145700Z.log`

---

## Step 4 — Railway disabled

```bash
railway down -s "Сео Аудит" -y
```

| Item | Result |
|------|--------|
| Service | **Failed** (deployment stopped) |
| Schedule preserved | `0 9 * * *`, next run ~17h (inactive until redeploy) |
| Railway env | **not deleted** |
| Other Railway services | **untouched** |

---

## Step 5 — Controlled VPS run (after Railway down)

```bash
sudo bash /opt/scholarshiptop/scripts/run-seo-audit-once.sh
```

| Item | Result |
|------|--------|
| Exit code | **0** |
| Duration | ~468s |
| Sampled | 105 pages |
| JSON-LD issues | **0** |
| Telegram | sent (production alert) |
| Site health after | **healthy** |
| Other VPS jobs | **not started** |
| Production smoke | **PASS** |

Log: `/opt/scholarshiptop/logs/seo-audit-run-20260624T150817Z.log`

---

## Step 6 — VPS schedule enabled

**File:** `/etc/cron.d/scholarshiptop-seo-audit`  
**Schedule:** `0 9 * * *` (09:00 UTC daily — matches Railway)  
**Command:** `/opt/scholarshiptop/scripts/run-seo-audit-once.sh`  
**Repo template:** `ops/vps/cron/scholarshiptop-seo-audit`

Only SEO Audit cron installed. No generation/indexing/mailing/scripts cron.

---

## Step 7 — Post-migration verification

| Check | Result |
|-------|--------|
| `docker ps` | `scholarshiptop-site` (healthy), `scholarshiptop-nginx` only |
| `/etc/cron.d/scholarshiptop-seo-audit` | **present** |
| Railway `Сео Аудит` | **Failed** (down) |
| Railway other crons | active (untouched) |
| `stage-7-post-cutover-smoke.mjs` | **PASS** |
| `/scholarships/no-essay` | **index, follow** |
| `/scholarships/closing-soon` | **index, follow** |
| `/scholarships/california` | **noindex, follow** |
| 526/525/502 | **none** |

---

## Active state summary

| Component | Status |
|-----------|--------|
| Production site | VPS, Cloudflare Full strict |
| VPS containers | site + nginx only |
| VPS cron | **seo-audit only** (`0 9 * * *`) |
| Railway SEO Audit | **down** |
| Railway other jobs | running as before |
| Supabase | untouched |
| DNS | untouched |

---

## Rollback

If VPS audit fails:

```bash
sudo rm -f /etc/cron.d/scholarshiptop-seo-audit
railway redeploy -s "Сео Аудит" --from-source -y
railway service status -s "Сео Аудит"   # expect SUCCESS
```

Production site remains on VPS.

---

## Repo artifacts

| File | Change |
|------|--------|
| `scripts/audit-jsonld-sitemap.ts` | internal fetch URL rewrite + configurable timeout |
| `ops/vps/scripts/run-seo-audit-once.sh` | `--dry-run` support |
| `ops/vps/scripts/stage-9a-bis-configure-fetch.sh` | VPS env fetch keys |
| `ops/vps/scripts/stage-9a-bis-install-cron.sh` | cron installer |
| `ops/env/seo-audit.env.example` | new optional fetch keys |

No secrets committed or printed.

---

## Notes

- Full audit run takes **~8 minutes** (105 page fetches). Plan monitoring accordingly.
- `JSONLD_AUDIT_EXIT_NONZERO=0` on Railway — audit exits 0 even with JSON-LD issues (unchanged).
- Duplicate Telegram risk during Step 3 avoided via `--dry-run`.
