# ScholarshipTop VPS scaffold (stage 3)

Site-only deployment kit. Copy to `/opt/scholarshiptop/` via `scripts/setup-vps.sh`.

## Layout on VPS

```text
/opt/scholarshiptop/
  app/                  # git clone (loomany/scholarshipstop)
  env/site.env          # chmod 600 — from Railway service Сайт
  logs/
  backups/
  nginx/conf.d/
  nginx/certs/          # TLS (staging subdomain / IP test)
  docker-compose.yml
  Dockerfile
  scripts/
```

## Quick start (on VPS)

```bash
export SCHOLARSHIPTOP_ROOT=/opt/scholarshiptop
bash ops/vps/scripts/setup-vps.sh          # once
bash /opt/scholarshiptop/scripts/pull-site-env-from-railway.sh
bash /opt/scholarshiptop/scripts/deploy-site.sh
SMOKE_BASE_URL=http://YOUR_VPS_IP bash /opt/scholarshiptop/scripts/smoke-site.sh
```

## Safety

- Only `--profile site` is used in deploy scripts.
- `--profile jobs-disabled` services exit immediately if accidentally started.
- Do **not** enable cron or job env files until per-job migration.
- Production DNS (`scholarshiptop.com`) stays on Railway until stage 6.

## Rollback

```bash
bash /opt/scholarshiptop/scripts/rollback-site.sh
```
