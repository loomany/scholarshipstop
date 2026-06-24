# Этап 3 — VPS scaffold (site only, jobs OFF)

**Дата:** 2026-06-24  
**Режим:** scaffold в репозитории + скрипты для VPS; production Railway не тронут.

## Целевое состояние

| Компонент | Статус |
|-----------|--------|
| Railway production | работает как раньше |
| VPS site | scaffold готов, **деплой на VPS ожидает хост** |
| VPS jobs | OFF (by design) |
| Supabase | не изменён |
| DNS | не изменён |
| Secrets в отчёте | не раскрыты |

---

## Что создано в репозитории

```text
ops/vps/
  Dockerfile
  docker-compose.yml          # profile site only
  nginx/conf.d/scholarshiptop-site.conf
  scripts/
    setup-vps.sh
    pull-site-env-from-railway.sh
    deploy-site.sh
    rollback-site.sh
    smoke-site.sh
  README.md
```

### Docker Compose

- Активный profile: **`site`** (`site` + `nginx`)
- Jobs: profile **`jobs-disabled`** — контейнеры завершаются с ошибкой при случайном запуске
- `env_file`: `/opt/scholarshiptop/env/site.env` only
- Site bind: `127.0.0.1:3000` (nginx на 80/443)

### Nginx

- Reverse proxy на `site:3000`
- Cache headers для `/_next/static/`
- `no-store` для `/api`, `/admin`, `/account`, `/auth`
- TLS block закомментирован до staging cert
- **Production `scholarshiptop.com` DNS не переключался**

### Deploy / rollback

| Script | Назначение |
|--------|------------|
| `setup-vps.sh` | создаёт `/opt/scholarshiptop/` layout |
| `pull-site-env-from-railway.sh` | Railway `Сайт` → `env/site.env` (chmod 600) |
| `deploy-site.sh` | git pull, build, backup commit, restart site+nginx |
| `rollback-site.sh` | откат к `backups/site-prev-commit.txt` |
| `smoke-site.sh` | HTTP smoke по списку URL |

---

## VPS deployment status

| Item | Status |
|------|--------|
| VPS host / SSH | **не предоставлен в сессии** |
| `/opt/scholarshiptop/env/site.env` | не создан на VPS (скрипт готов) |
| Docker build на VPS | не выполнялся |
| Smoke на IP/тест-домене | не выполнялся (нет VPS) |

### Инструкция для деплоя (когда VPS готов)

```bash
# на VPS (root)
export SCHOLARSHIPTOP_ROOT=/opt/scholarshiptop
bash ops/vps/scripts/setup-vps.sh
railway login   # если CLI ещё не авторизован на VPS
bash /opt/scholarshiptop/scripts/pull-site-env-from-railway.sh
bash /opt/scholarshiptop/scripts/deploy-site.sh
SMOKE_BASE_URL=http://YOUR_VPS_IP bash /opt/scholarshiptop/scripts/smoke-site.sh
```

**Важно для `site.env` на VPS:** после pull из Railway обновить `NEXT_PUBLIC_SITE_URL` и `SITE_URL` на staging origin (IP или `staging.*`), чтобы canonical/sitemap smoke не путались с production — без изменения Railway env.

---

## Env-файлы

| Файл | Создан | Источник |
|------|--------|----------|
| `/opt/scholarshiptop/env/site.env` | нет (VPS недоступен) | Railway `Сайт` via script |
| `ops/env/site.env.example` | ранее (этап 1) | placeholders |
| Другие job env | не создавались | — |

---

## Контейнеры (ожидаемые после деплоя)

| Container | Profile | Expected |
|-----------|---------|----------|
| `scholarshiptop-site` | site | running |
| `scholarshiptop-nginx` | site | running |
| scripts / seo-* / mailing* / content-hub / translation | jobs-disabled | **must not run** |

---

## Smoke checklist (для выполнения на VPS)

```text
/
/sitemap.xml
/sitemaps/scholarships-0.xml
/scholarships/no-essay
/scholarships/closing-soon
/scholarships/category/no-essay
/scholarships/engineering
/scholarships/california
```

Проверки: HTTP 200/redirect, no 500, sitemap XML, no job containers, no email/indexing side effects.

---

## Риски / проблемы

| Risk | Severity | Mitigation |
|------|----------|------------|
| VPS host не задан | blocker для runtime smoke | предоставить IP/SSH |
| `NEXT_PUBLIC_*` baked at build | medium | site.env must be present **before** `docker compose build` |
| Git history secrets (этап 2.5) | high | key rotation (отдельная задача) |
| `Рассылка провайдеры` RUNNING на Railway | info | не связано с VPS site, но не запускать mailing на VPS |
| Kazakhstan VPS + EN audience | medium | Cloudflare CDN на этапе 5 |

---

## Стоп-факторы (мониторинг при деплое)

Остановиться, если:

- site container не стартует
- sitemap 404/500
- Supabase connection error в логах
- случайно стартовал job container
- DB writes от job-сервисов
- email / indexing activity от VPS
- DNS изменён

---

## Acceptance

| Критерий | Статус |
|----------|--------|
| Scaffold `/opt/scholarshiptop/` структура в repo | **PASS** |
| docker-compose site only, jobs OFF | **PASS** |
| Nginx config | **PASS** |
| deploy + rollback scripts | **PASS** |
| pull-site-env без печати secrets | **PASS** (script) |
| Site поднят на VPS | **PENDING** |
| Smoke на IP/тест-домене | **PENDING** |
| Railway production | **PASS** (не тронут) |
| DNS | **PASS** (не тронут) |

## Вердикт

**PASS_WITH_WARNINGS**

Scaffold и скрипты готовы в репозитории. Runtime-деплой и smoke на VPS не выполнены — нет доступа к VPS в этой сессии. После предоставления хоста: `setup-vps` → `pull-site-env` → `deploy-site` → `smoke-site` → обновить этот отчёт до **PASS**.

---

## Связанные отчёты

- `00-railway-services-inventory-2026-06-24.md`
- `01-env-inventory-2026-06-24.md`
- `02-job-risk-map-2026-06-24.md`
- `025-root-env-example-sanitized-2026-06-24.md`
