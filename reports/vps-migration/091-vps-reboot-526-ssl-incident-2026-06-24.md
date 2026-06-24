# Incident 091 — VPS reboot 526 SSL certificate

**Дата:** 2026-06-24  
**Severity:** P0 — production down  
**Symptom:** Cloudflare **526 Invalid SSL certificate** on https://scholarshiptop.com  
**Trigger:** VPS plan upgrade (4 CPU / 4 GB RAM / 80 GB disk) + **reboot**

## Verdict: **RESOLVED**

Production restored on VPS. No DNS change. No Cloudflare SSL mode change (remained **Full strict**). No jobs started.

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| ~14:41 | After reboot, host `nginx` (systemd) auto-started and bound **:80 / :443** |
| ~14:41 | Docker `scholarshiptop-nginx` **Exited (128)** — port conflict / later upstream DNS failure |
| ~14:41 | Cloudflare → origin TLS handshake failed → **526** |
| ~14:43 | Host nginx stopped + disabled; `docker compose --profile site up -d` |
| ~14:44 | Origin HTTPS **200**; Cloudflare smoke **PASS** |

---

## Root cause

**Not missing Cloudflare Origin cert files.** Certs were present:

```text
/opt/scholarshiptop/secrets/cloudflare-origin.pem  (644)
/opt/scholarshiptop/secrets/cloudflare-origin.key  (600)
```

**Actual failure (two parts):**

1. **Host nginx vs Docker nginx** — Ubuntu `nginx` service enabled on boot. After reboot it claimed **:80/:443** with default/wrong certificate. Cloudflare Full (strict) rejected the origin cert → **526**.

2. **Docker nginx crash loop** — `scholarshiptop-nginx` could not resolve upstream `site:3000` (`host not found in upstream`) because containers were started individually after reboot, **not** via `docker compose`, so nginx was off the compose network.

Secondary (non-blocking): `scholarshiptop-site` logs showed `EACCES` on `.next/cache/fetch-cache/*` — cache write permissions; site still served pages after compose recreate.

---

## Diagnostics (VPS)

| Check | Result |
|-------|--------|
| `docker ps` | `scholarshiptop-site` healthy; `scholarshiptop-nginx` **Exited** |
| `ss :443` | **host nginx** listening (before fix) |
| `ss :80` | **host nginx** listening (before fix) |
| `/opt/scholarshiptop/secrets/cloudflare-origin.*` | **present** (glob without sudo failed; files exist) |
| `docker exec nginx ls /etc/nginx/secrets` | mount OK after container up |
| `nginx -t` | **ok** after compose up |
| `systemctl is-active nginx` | **active** (before fix) → **inactive** + **disabled** (after) |

---

## Fix applied

```bash
# 1. Stop conflicting host nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# 2. Recreate stack on compose network (site + nginx only)
cd /opt/scholarshiptop
sudo docker compose --profile site up -d
```

No cert reinstall required. No env/secrets printed or changed.

---

## Verification

### From VPS (origin IP)

```bash
curl -Ik --resolve scholarshiptop.com:443:213.155.22.74 https://scholarshiptop.com/          # HTTP/2 200
curl -Ik --resolve scholarshiptop.com:443:213.155.22.74 https://scholarshiptop.com/sitemap.xml  # HTTP/2 200
```

### Via Cloudflare (public)

`node scripts/vps-migration/stage-7-post-cutover-smoke.mjs` → **PASS**

| URL | Status | SEO |
|-----|--------|-----|
| `/` | 200 | OK |
| `/sitemap.xml` | 200 | valid |
| `/scholarships/no-essay` | 200 | **index, follow** |
| `/scholarships/closing-soon` | 200 | **index, follow** |
| 526/502/525 | **none** | |

### Containers

Only:

- `scholarshiptop-site` (healthy)
- `scholarshiptop-nginx` (up, :80/:443)

Jobs/cron: **OFF** (`/etc/cron.d/` — no scholarshiptop job entries)

---

## Prevent recurrence

1. **Keep host nginx disabled:** `systemctl is-enabled nginx` → `disabled` ✓  
2. **After reboot**, always start site via compose:
   ```bash
   cd /opt/scholarshiptop && sudo docker compose --profile site up -d
   ```
   Do **not** `docker start scholarshiptop-nginx` alone.
3. Optional: add `@reboot` systemd unit or cron for compose up (site profile only) — not implemented in this incident fix.

---

## Rollback / emergency options (not used)

- Cloudflare SSL **Full** (non-strict): **not needed**
- DNS revert to Railway: **not needed**
- Cert reinstall from `Key Cloud.txt`: **not needed** (files intact)

---

## Constraints honored

- Supabase: not touched  
- Jobs/workers/cron: not started  
- SEO logic: not changed  
- Secrets/env values: not printed
