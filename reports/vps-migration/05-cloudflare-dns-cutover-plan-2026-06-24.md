# Stage 5 — Cloudflare / DNS cutover preparation

**Дата:** 2026-06-24  
**Production (live):** https://scholarshiptop.com → Railway (via Cloudflare)  
**VPS origin (ready, not live):** http://213.155.22.74  
**Режим:** planning only — **DNS не меняли**

## Verdict: **PASS**

Cutover plan готов. Критичная информация собрана; DNS/Cloudflare **не изменялись**.

---

## Prerequisites (completed)

| Gate | Status |
|------|--------|
| VPS site smoke (Stage 4) | PASS_WITH_WARNINGS → operational |
| SEO parity smoke (Stage 4.5) | **PASS** |
| no-essay noindex blocker (Stage 4.6) | **PASS** (runtime `data/` COPY fix) |
| VPS jobs | **OFF** (site + nginx only) |
| Supabase | external, unchanged |
| Railway | production, unchanged |
| Docker data COPY fix committed | yes — see §1 |

---

## 1) Committed Docker data COPY fix

**Commit:** `ae5f280` — `fix(vps): copy runtime SEO data dirs into Docker site image`

| Path | In git | Role |
|------|--------|------|
| `ops/vps/Dockerfile` | yes (new) | full in-container build path |
| `ops/vps/Dockerfile.prebuilt` | yes (new) | host-prebuilt path (current VPS) |
| `data/long-tail-seo/` | yes (tracked) | runtime SEO bundles for legacy long-tail |
| `data/seo-scholarship-content/` | yes (tracked) | runtime SEO content for manifest routes |
| `data/seo-pending-queue.json` | yes (tracked) | SEO drip queue (optional at runtime) |

Runtime COPY lines (both Dockerfiles):

```dockerfile
COPY app/data/long-tail-seo ./data/long-tail-seo
COPY app/data/seo-scholarship-content ./data/seo-scholarship-content
COPY app/data/seo-pending-queue.json ./data/seo-pending-queue.json
```

**VPS already rebuilt** with this fix (Stage 4.6). Repo commit ensures future deploys keep parity.

---

## 2) Current DNS / Cloudflare inventory (read-only)

Collected 2026-06-24 via public DNS + HTTP probes. **Cloudflare dashboard not accessed** — SSL mode and exact origin target must be confirmed there before cutover.

### Public DNS (resolver view)

| Host | Type | Answers | TTL (observed) | Proxy |
|------|------|---------|----------------|-------|
| `scholarshiptop.com` | A | `104.21.44.105`, `172.67.198.186` | ~262s | **Cloudflare proxied** (anycast) |
| `scholarshiptop.com` | AAAA | `2606:4700:3035::ac43:c6ba`, `2606:4700:3031::6815:2c69` | ~262s | **Cloudflare proxied** |
| `www.scholarshiptop.com` | A | same Cloudflare anycast IPs | ~262s | **Cloudflare proxied** |

**Interpretation:** Public A/AAAA are **Cloudflare edge**, not Railway or VPS directly. Cutover = change **origin target inside Cloudflare** (DNS content / origin rule), not public anycast IPs.

**Origin target (Railway):** not visible in public DNS while proxied. In Cloudflare → DNS → `scholarshiptop.com` / `www` record **content** (likely CNAME to Railway hostname or A to Railway IP). **Record before change** for rollback.

### HTTP / redirect behavior (production)

| Request | Status | Behavior |
|---------|--------|----------|
| `http://scholarshiptop.com/` | 301 | → `https://scholarshiptop.com/` |
| `http://www.scholarshiptop.com/` | 301 | → `https://www.scholarshiptop.com/` |
| `https://scholarshiptop.com/` | 200 | apex serves site |
| `https://www.scholarshiptop.com/` | **301** | → **`https://scholarshiptop.com/`** (www → apex) |
| `http://213.155.22.74/` | 200 | VPS direct (`server: nginx/1.27.5`, no `cf-ray`) |

**Production canonical host:** **apex** `scholarshiptop.com`. **www** redirects to apex.

### Cloudflare signals

| Signal | Value |
|--------|-------|
| `server` header (production) | `cloudflare` |
| `cf-ray` | present (e.g. `…-AKX`) |
| `cf-cache-status` | `DYNAMIC` on HTML |
| VPS direct | no Cloudflare headers |

### SSL (to confirm in Cloudflare dashboard)

| Item | Public observation | Action before cutover |
|------|-------------------|----------------------|
| Edge SSL (browser ↔ CF) | HTTPS works on production | keep enabled |
| SSL mode (CF ↔ origin) | **unknown** — check dashboard | see §5 SSL prep |
| VPS origin TLS | **HTTP :80 only** (nginx); `:443` block commented | install **Cloudflare Origin Certificate** OR use Flexible temporarily |
| Cert on edge | Google Trust Services / Cloudflare (browser) | unchanged |

**Recommended SSL mode after origin cert on VPS:** **Full (strict)**.  
**Minimum without origin cert:** **Flexible** (CF → HTTP `213.155.22.74:80`) — acceptable for test cutover, weaker origin leg.

### TTL notes

- Public TTL ~**300s** on proxied records (auto).
- With **orange cloud (proxied)**, DNS change at Cloudflare typically propagates at edge in **minutes**, not hours.
- If any record is **DNS-only (grey cloud)**, lower TTL to **300s** 24h before cutover.

---

## 3) Architecture at cutover

```text
[User] --HTTPS--> [Cloudflare edge] --??--> [Origin]
                         |                      |
                    (unchanged)          TODAY: Railway
                                         TARGET: VPS 213.155.22.74:80
```

**Unchanged:** Supabase (external), Railway service (rollback), VPS jobs OFF.

---

## 4) Pre-cutover commands (run on VPS, ~30–60 min before DNS)

**Do not run until Stage 6 go/no-go.** No env values printed below — edit `site.env` on VPS only.

### 4.1 Set production URLs in env (key names only)

```bash
# On VPS as deploy/ubuntu with sudo where needed
ROOT=/opt/scholarshiptop
ENV_FILE="${ROOT}/env/site.env"

# Backup first
sudo cp "${ENV_FILE}" "${ROOT}/backups/site.env.pre-cutover-$(date -u +%Y%m%dT%H%M%SZ)"

# Update keys (use editor or sed — do not log values)
# SITE_URL=https://scholarshiptop.com
# NEXT_PUBLIC_SITE_URL=https://scholarshiptop.com
sudo nano "${ENV_FILE}"
sudo chmod 600 "${ENV_FILE}"
```

### 4.2 Rebuild Next.js with new NEXT_PUBLIC_* (host build)

VPS uses host prebuild + `Dockerfile.prebuilt`. `NEXT_PUBLIC_*` is baked at build time.

```bash
cd "${ROOT}/app"
sudo grep '^NEXT_PUBLIC_' "${ROOT}/env/site.env" | sudo tee "${ROOT}/app/.env.production" >/dev/null

export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
export GENERATE_SOURCEMAP=false
npm run build
```

### 4.3 Rebuild and restart site only

```bash
cd "${ROOT}"
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site build site
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site up -d --no-deps site nginx
sleep 10
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site ps
```

### 4.4 Confirm jobs still OFF

```bash
sudo docker ps --format '{{.Names}}'
# Expected: scholarshiptop-site, scholarshiptop-nginx ONLY
# Must NOT see: scripts, seo-*, mailing*, content-hub, translation
```

### 4.5 Smoke from operator machine (read-only)

```bash
# From dev machine / CI (repo root)
node scripts/vps-migration/stage-46-verify-noindex-fix.mjs
node scripts/vps-migration/seo-parity-smoke.mjs
```

**Pass criteria:**

- `/scholarships/no-essay` → `index, follow`
- `/scholarships/closing-soon` → `index, follow`, 1 H1
- `/sitemap.xml` → 200 valid XML
- `/sitemaps/scholarships-0.xml` → loc count **851**
- VPS vs Railway parity smoke → **PASS**

### 4.6 Optional: pre-cutover via Cloudflare (no DNS switch)

Before changing origin, test with Cloudflare **Origin Rule** or temporary **staging subdomain** (`staging.scholarshiptop.com` → VPS, grey cloud) — does not affect apex production.

---

## 5) SSL prep on VPS (before or during cutover)

VPS nginx currently listens on **:80** only (`ops/vps/nginx/conf.d/scholarshiptop-site.conf`).

**Recommended path:**

1. Cloudflare → SSL/TLS → Origin Server → **Create Certificate** (15y, `scholarshiptop.com` + `*.scholarshiptop.com`)
2. Install cert on VPS: `/opt/scholarshiptop/nginx/certs/fullchain.pem`, `privkey.pem`
3. Uncomment TLS `server` block in nginx conf (port 443)
4. Cloudflare SSL mode → **Full (strict)**
5. Cloudflare origin: `https://213.155.22.74:443` or keep port 443 default

**Fallback (faster, less ideal):** SSL mode **Flexible**, origin `http://213.155.22.74:80`.

---

## 6) DNS cutover checklist (Stage 6 — execute later)

### T−24h (optional)

- [ ] Screenshot / export current Cloudflare DNS records (apex + www)
- [ ] Note current origin target (Railway hostname/IP)
- [ ] If any record is DNS-only (grey cloud): set TTL **300**
- [ ] Confirm VPS pre-cutover commands (§4) **PASS**

### T−0 (cutover window)

- [ ] Railway **still running** (do not disable)
- [ ] VPS site healthy (`docker compose ps`, healthcheck)
- [ ] Cloudflare DNS:
  - [ ] `scholarshiptop.com` origin → **`213.155.22.74`** (proxied / orange cloud)
  - [ ] `www.scholarshiptop.com` → same origin **or** CNAME to apex per current setup
  - [ ] Preserve **www → apex 301** (currently: `https://www` → `https://scholarshiptop.com`)
- [ ] SSL mode verified (Flexible or Full strict per §5)
- [ ] Do **not** change Supabase URLs / keys

### T+0 verification (first 15 min)

- [ ] `https://scholarshiptop.com/` → 200, `cf-ray` present
- [ ] `https://www.scholarshiptop.com/` → 301 to apex
- [ ] `/scholarships/no-essay` → `index, follow`
- [ ] `/scholarships/closing-soon` → `index, follow`
- [ ] `/sitemap.xml` → 200, valid XML
- [ ] `/sitemaps/scholarships-0.xml` → loc count 851
- [ ] Sample scholarship URL from sitemap → 200, no accidental noindex
- [ ] Login / auth smoke (Supabase external — should work unchanged)
- [ ] `sudo docker ps` → jobs still OFF

### T+24–48h monitoring

- [ ] GSC crawl errors / indexing (noindex regressions)
- [ ] 5xx rate at Cloudflare + nginx logs on VPS
- [ ] Response time (KZ VPS + EN audience — Cloudflare CDN helps)
- [ ] No duplicate job runs (Railway cron still on Railway only)
- [ ] Error budget: if sustained 5xx or SEO robots regression → rollback §7

---

## 7) Rollback checklist

**Trigger:** sustained 5xx, auth broken, SEO noindex regression, unacceptable latency.

### Immediate rollback (target &lt;5 min at CF edge)

1. [ ] Cloudflare DNS: restore **previous origin** (Railway hostname/IP from screenshot)
2. [ ] Do **not** disable Railway service
3. [ ] Do **not** change Supabase
4. [ ] Verify `https://scholarshiptop.com/` serves Railway again (check `cf-ray` + content fingerprint / commit)
5. [ ] Re-run quick checks: home 200, no-essay index, sitemap 200

### After rollback confirmed

- [ ] VPS site: **leave running** for debugging OR stop only after root-cause documented
- [ ] Do **not** start VPS jobs during rollback
- [ ] Post-mortem: nginx logs, docker logs, parity smoke diff

### What rollback does NOT do

- Does not revert Supabase data
- Does not stop Railway cron/workers (they never moved)
- Does not require VPS env revert unless debugging (Railway unaffected by VPS env)

---

## 8) Post-cutover job migration (out of scope for Stage 5)

Jobs remain on Railway per `02-job-risk-map-2026-06-24.md`. Migrate one-by-one **after** 24–48h stable site traffic on VPS.

**Never** `docker compose --profile jobs up` until explicit per-job approval.

---

## 9) Open items (dashboard-only — not blockers for plan)

| Item | Why | When |
|------|-----|------|
| Cloudflare SSL mode exact value | not visible via public HTTP | confirm in dashboard before T−0 |
| Railway origin hostname/IP in CF DNS | hidden behind proxy | screenshot before cutover |
| Cloudflare WAF / Page Rules | may affect origin | review dashboard |
| Origin Certificate install | VPS :443 not live yet | Stage 6 prep |

---

## 10) Constraints confirmed

- DNS: **not changed** in Stage 5
- Railway: **not disabled**
- Supabase: **not modified**
- VPS jobs: **not started**
- Env values: **not printed**
- Secrets: **not committed**

---

## Related reports

| Stage | Report |
|-------|--------|
| 4 | `04-vps-staging-smoke-2026-06-24.md` |
| 4.5 | `045-vps-seo-parity-smoke-2026-06-24.md` |
| 4.6 | `046-noessay-noindex-investigation-2026-06-24.md` |
| 6 | DNS cutover execution (future) |
