# Stage 9.0 — VPS reboot / autostart hardening

**Дата:** 2026-06-24  
**Production:** https://scholarshiptop.com → Cloudflare Full (strict) → VPS `213.155.22.74`  
**Context:** Post-incident [091](091-vps-reboot-526-ssl-incident-2026-06-24.md) — host nginx grabbed :80/:443 after reboot

## Verdict: **PASS_WITH_WARNINGS**

Autostart hardened and controlled reboot **passed**. Brief **~30–60s** window after boot returns Cloudflare **521** until `scholarshiptop-site` healthcheck completes; then **200** / smoke **PASS**. No 526.

---

## VPS resources (post-upgrade)

| Resource | Value |
|----------|-------|
| Hostname | `40559` |
| CPU | 4 vCPU |
| RAM | 3.8 GiB total (~2.7 GiB available idle) |
| Disk `/` | 79G total, 14G used (18%) |
| Swap | 4 GiB |
| Docker Compose | v5.1.4 |

---

## Step 1 — Pre-hardening state

| Check | Result |
|-------|--------|
| `systemctl is-enabled nginx` | **disabled** |
| `systemctl is-active nginx` | **inactive** |
| Ports :80/:443 | **docker-proxy** (Docker nginx) |
| `docker ps` | `scholarshiptop-site` (healthy), `scholarshiptop-nginx` only |
| `scholarshiptop-site.service` | not installed |

---

## Step 2 — Host nginx permanently disabled

```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
sudo systemctl mask nginx
```

| Check | Result |
|-------|--------|
| `systemctl is-enabled nginx` | **masked** |
| `systemctl is-active nginx` | **inactive** |

Host nginx will **not** start on future reboots.

---

## Step 3 — Systemd unit installed

**Path:** `/etc/systemd/system/scholarshiptop-site.service`  
**Repo copy:** `ops/vps/systemd/scholarshiptop-site.service`

| Property | Value |
|----------|-------|
| Type | `oneshot` + `RemainAfterExit=yes` |
| WorkingDirectory | `/opt/scholarshiptop` |
| ExecStart | `/usr/bin/docker compose --profile site up -d` |
| ExecStop | `/usr/bin/docker compose --profile site down` |
| After | `docker.service`, `network-online.target` |
| WantedBy | `multi-user.target` |
| Enabled | **yes** |

**Profile:** `site` only — starts **site + nginx together** on compose network. Jobs profiles **not** started. No cron installed.

```bash
sudo systemctl daemon-reload
sudo systemctl enable scholarshiptop-site.service
```

---

## Step 4 — Unit restart test (no reboot)

```bash
sudo systemctl restart scholarshiptop-site.service
```

| Check | Result |
|-------|--------|
| Unit status | **active (exited)** |
| `scholarshiptop-site` | healthy |
| `scholarshiptop-nginx` | running |
| Ports :80/:443 | docker-proxy |
| Jobs | no scholarshiptop cron; only 2 containers |

---

## Step 5 — Pre-reboot production smoke

| URL | Status |
|-----|--------|
| `/` | 200 |
| `/sitemap.xml` | 200 |
| `/sitemaps/scholarships-0.xml` | 200 |
| `/scholarships/no-essay` | 200, **index, follow** |
| `/scholarships/closing-soon` | 200, **index, follow** |
| `/scholarships/california` | 200, **noindex, follow** |
| 526/525/502 | none |

`node scripts/vps-migration/stage-7-post-cutover-smoke.mjs` → **PASS**

---

## Step 6 — Controlled reboot test

**Pre-reboot (UTC 14:49:32):**

| Item | Value |
|------|-------|
| `scholarshiptop-site.service` | enabled |
| `nginx` | masked |
| Containers | site healthy, nginx up |

```bash
sudo reboot
```

**Post-reboot (~14:50:29 UTC, uptime 0 min):**

| Check | Result |
|-------|--------|
| `scholarshiptop-site.service` | **active** (compose finished ~10s after boot) |
| `nginx` (host) | **masked**, inactive |
| `scholarshiptop-site` | healthy |
| `scholarshiptop-nginx` | running |
| Ports :80/:443 | docker-proxy |
| Origin curl | HTTP/2 **200** |
| Jobs | OFF |

Compose recreated containers on fresh network (expected after `down` on previous shutdown path).

**Warning:** Smoke run at **t+10s** after boot → Cloudflare **521** (origin still starting). At **t+60s** → **PASS**.

---

## Step 7 — Post-reboot production smoke (t+60s)

| URL | Status |
|-----|--------|
| `/` | 200 |
| `/sitemap.xml` | 200 |
| `/scholarships/no-essay` | 200, **index, follow** |
| `/scholarships/closing-soon` | 200, **index, follow** |
| 526 | **none** |

`stage-7-post-cutover-smoke.mjs` → **PASS**

---

## Active containers (final)

```text
scholarshiptop-site    Up (healthy)   127.0.0.1:3000->3000/tcp
scholarshiptop-nginx   Up             0.0.0.0:80->80, 0.0.0.0:443->443
```

**Jobs OFF:** no `/etc/cron.d/scholarshiptop-*`; no job containers.

---

## Constraints honored

| Constraint | Status |
|------------|--------|
| Supabase | not touched |
| DNS | not changed |
| Cloudflare SSL mode | not changed (Full strict) |
| VPS jobs/cron | not started |
| Railway jobs | not touched |
| SEO Audit migration | not run |
| Secrets/env | not printed |

---

## Recovery commands

If site does not come up after reboot:

```bash
sudo systemctl stop nginx || true
sudo systemctl disable nginx || true
sudo systemctl mask nginx || true

sudo systemctl start scholarshiptop-site.service
# or manually:
cd /opt/scholarshiptop
sudo docker compose --profile site up -d

sudo docker ps
sudo docker logs --tail=100 scholarshiptop-nginx
sudo docker logs --tail=100 scholarshiptop-site
```

If **526** (wrong cert / wrong process on :443):

```bash
sudo ss -tulpn | grep -E ':(80|443)'
sudo docker exec scholarshiptop-nginx nginx -t
sudo ls -l /opt/scholarshiptop/secrets/cloudflare-origin.*
```

Do **not** change Cloudflare SSL mode without explicit approval.

**Note:** Allow **~60 seconds** after reboot before external smoke — site healthcheck + nginx start take ~10–15s.

---

## Repo artifacts added

| File | Purpose |
|------|---------|
| `ops/vps/systemd/scholarshiptop-site.service` | systemd unit template |
| `ops/vps/scripts/stage-90-install-autostart.sh` | install + mask + enable |
| `ops/vps/scripts/stage-90-post-reboot-check.sh` | post-reboot verification |

---

## Acceptance criteria

| Criterion | Met |
|-----------|-----|
| host nginx masked/inactive | ✓ |
| `scholarshiptop-site` unit enabled | ✓ |
| controlled reboot passed | ✓ |
| site auto-restored after reboot | ✓ |
| Cloudflare Full strict (no 526) | ✓ |
| production smoke PASS | ✓ (after boot window) |
| jobs OFF | ✓ |
| Railway jobs untouched | ✓ |
| Supabase untouched | ✓ |

**Warning:** ~30–60s post-reboot availability gap (521) until healthcheck passes — document for future job migrations; consider `TimeoutStartSec` / health wait if zero-downtime reboot required.
