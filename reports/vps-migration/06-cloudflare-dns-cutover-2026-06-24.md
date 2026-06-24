# Stage 6 — Cloudflare SSL prep & DNS cutover readiness

**Дата:** 2026-06-24  
**Production (live):** https://scholarshiptop.com → Railway via Cloudflare  
**VPS origin:** https://scholarshiptop.com @ `213.155.22.74` (tested via `--resolve`, DNS **не меняли**)  
**Cloudflare SSL mode:** Full (strict) — per operator

## Verdict: **PASS**

Origin certificate установлен, HTTPS на VPS работает, production env применён, SEO parity **PASS**. Готовность к DNS cutover подтверждена.

---

## 0) Local cert file protection

| Check | Result |
|-------|--------|
| Source file | `Key Cloud.txt` (project root) |
| `.gitignore` | `*Key Cloud*` + cloudflare/origin masks added |
| `git check-ignore -v Key Cloud.txt` | `.gitignore:86:*Key Cloud*` |
| Committed to git | **no** |
| Printed in terminal/report | **no** |

---

## 1) Origin certificate on VPS

| Item | Status |
|------|--------|
| Directory | `/opt/scholarshiptop/secrets/` (`chmod 700`) |
| Certificate | `/opt/scholarshiptop/secrets/cloudflare-origin.pem` (`chmod 644`, root) |
| Private key | `/opt/scholarshiptop/secrets/cloudflare-origin.key` (`chmod 600`, root) |
| Installed | **yes** |
| Content logged | **no** |

Install script: `scripts/vps-migration/install-cloudflare-origin-cert.mjs` (parses local file once, SCP to VPS, deletes temp).

---

## 2) Nginx HTTPS configuration

| Item | Value |
|------|-------|
| HTTP `scholarshiptop.com` / `www` | **301 → HTTPS** |
| HTTP default (`_`, IP staging) | proxy to site (parity smoke on `http://213.155.22.74`) |
| HTTPS `:443` | `scholarshiptop.com`, `www.scholarshiptop.com` |
| Cert mount | `./secrets` → `/etc/nginx/secrets:ro` |
| Proxy includes | `./nginx/includes/` (not `conf.d/` — avoids nginx `location` at http level) |
| Upstream | `scholarshiptop-site:3000` |
| Jobs | **not started** |

Files updated in repo:

- `ops/vps/nginx/conf.d/scholarshiptop-site.conf`
- `ops/vps/nginx/includes/scholarshiptop-proxy-locations.conf`
- `ops/vps/docker-compose.yml` (secrets + includes mounts)

---

## 3) Production env on VPS

| Key | Present | Notes |
|-----|---------|-------|
| `SITE_URL` | yes | set to `https://scholarshiptop.com` |
| `NEXT_PUBLIC_SITE_URL` | yes | set to `https://scholarshiptop.com` |
| Values printed | **no** | |

Actions:

1. Backup: `/opt/scholarshiptop/backups/site.env.pre-ssl-*`
2. Host rebuild: `npm run build` with `.env.production` from `NEXT_PUBLIC_*`
3. Docker image rebuild + `site` + `nginx` restart
4. Fixed `.next` ownership (`EACCES` on first attempt)

---

## 4) HTTPS `--resolve` tests (pre-DNS)

Command pattern: `curl -Ik --resolve scholarshiptop.com:443:213.155.22.74 https://scholarshiptop.com/...`

Script: `scripts/vps-migration/stage-6-https-resolve-smoke.mjs` (uses `-k` for Cloudflare origin cert trust locally; Cloudflare Full strict validates at edge).

| URL | HTTP | robots / notes |
|-----|------|----------------|
| `/` | **200** | OK |
| `/sitemap.xml` | **200** | valid XML, 83 loc |
| `/sitemaps/scholarships-0.xml` | **200** | valid XML, loc count matches Railway (parity smoke) |
| `/scholarships/no-essay` | **200** | **index, follow** |
| `/scholarships/closing-soon` | **200** | **index, follow** |
| `/scholarships/california` | **200** | **noindex, follow** |

| Risk | Result |
|------|--------|
| Cloudflare 525/526 (origin SSL) | **not observed** — TLS handshake succeeds on `:443` |
| DNS changed | **no** |

---

## 5) SEO verification

| Script | Result |
|--------|--------|
| `stage-46-verify-noindex-fix.mjs` | **PASS** (`stagingOk: true`) |
| `seo-parity-smoke.mjs` | **PASS** (0 issues) |

Confirmed:

- `/scholarships/no-essay` → index, follow
- `/scholarships/closing-soon` → index, follow, 1 H1
- `/scholarships/california` → noindex, follow
- `/sitemap.xml` valid XML
- scholarships sitemap loc count **matches Railway** (post-rebuild parity)
- sample sitemap URLs 200, no accidental noindex
- canonical uses `https://scholarshiptop.com/...`

---

## 6) Active containers

```
scholarshiptop-site
scholarshiptop-nginx
```

**Jobs OFF** — no scripts, seo-*, mailing*, content-hub, translation containers.

---

## 7) DNS cutover readiness

| Prerequisite | Status |
|--------------|--------|
| VPS site healthy | yes |
| SEO parity PASS | yes |
| no-essay index/follow | yes |
| Origin TLS on VPS :443 | yes |
| Cloudflare Full (strict) compatible | yes (origin cert installed) |
| Production `SITE_URL` / `NEXT_PUBLIC_*` | yes |
| Railway still live | yes |
| DNS changed | **no** (Stage 6 = prep only) |

### Next step (Stage 7 / cutover execution)

In Cloudflare DNS (orange cloud / proxied):

1. Change **origin** for `scholarshiptop.com` → `213.155.22.74`
2. Align `www` with current behavior (301 → apex)
3. Keep SSL mode **Full (strict)**
4. Keep Railway running for rollback
5. Post-switch: verify via live domain (not just `--resolve`)
6. Monitor 24–48h

See also: `reports/vps-migration/05-cloudflare-dns-cutover-plan-2026-06-24.md`

### Rollback (unchanged)

1. Restore previous Cloudflare origin (Railway)
2. Do not touch Supabase
3. Leave VPS running for debug or stop after Railway confirmed

---

## 8) Constraints confirmed

- DNS: **not changed**
- Railway: **not disabled**
- Supabase: **not modified**
- VPS jobs: **not started**
- Certificate / private key: **not printed, not committed**
- Env values: **not printed**

---

## Artifacts

| Path | Purpose |
|------|---------|
| `scripts/vps-migration/install-cloudflare-origin-cert.mjs` | VPS cert install |
| `scripts/vps-migration/vps-ssl-prep-deploy.sh` | nginx + env + nginx restart |
| `scripts/vps-migration/vps-host-rebuild-site.sh` | host build + site image |
| `scripts/vps-migration/stage-6-https-resolve-smoke.mjs` | pre-DNS HTTPS checks |
