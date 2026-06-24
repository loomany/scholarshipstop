# Stage 4 — Real VPS staging deploy + smoke

**Дата:** 2026-06-24  
**VPS IPv4:** `213.155.22.74` (Astana KZ, Ubuntu 24.04)  
**Staging URL:** http://213.155.22.74  
**Режим:** site only, jobs OFF

---

## 0) Защита приватных файлов

| Проверка | Статус |
|----------|--------|
| `vps.txt` в `.gitignore` | да |
| `vps.txt` не коммитился | да |
| Пароль/содержимое `vps.txt` в отчёте | нет |

---

## 1) SSH-key доступ

| Параметр | Значение |
|----------|----------|
| SSH-key настроен | **да** |
| Ключ (локально) | `~/.ssh/scholarshiptop_vps` (ed25519) |
| Пользователи с ключом | `ubuntu`, `deploy` |
| Passwordless login | **да** (`BatchMode=yes`) |
| Пароль из `vps.txt` | использован **один раз** только для bootstrap ключа |

**Warning:** у `deploy` нет passwordless `sudo` — админ-операции выполнялись через `ubuntu` (NOPASSWD sudo).

---

## 2) VPS система

| Параметр | Значение |
|----------|----------|
| OS | Ubuntu 24.04.4 LTS (Noble) |
| Hostname | `40559` |
| RAM | 961 MiB |
| Swap | **4 GiB** (`/swapfile`, active) |
| Disk | 20 GB, ~20% used |

---

## 3) Docker / Nginx

| Компонент | Статус |
|-----------|--------|
| Docker | 29.6.0 |
| Docker Compose plugin | установлен |
| Node (host build) | v22.23.0 |
| Nginx | docker `nginx:1.27-alpine` на `:80` |
| Host nginx (systemd) | **остановлен** (освобождён порт 80) |

---

## 4) Deploy (site only)

| Параметр | Значение |
|----------|----------|
| Источник app | tarball из локального repo (без `.git`) |
| Локальный commit baseline | `366ff3a` *(на момент упаковки tarball)* |
| Build strategy | **host `npm run build`** (1 GB RAM) + `Dockerfile.prebuilt` runtime image |
| Docker build in-container | **не удался** (OOM на 1 GB) |
| `SITE_URL` | `http://213.155.22.74` |
| `NEXT_PUBLIC_SITE_URL` | `http://213.155.22.74` |
| Env source | Railway service **Сайт** only (63 keys) |
| Env file | `/opt/scholarshiptop/env/site.env` (`chmod 600`) |
| PEM в env | исправлен формат для docker compose (escaped, без вывода значений) |

---

## 5) Активные контейнеры

| Container | Status | Ports |
|-----------|--------|-------|
| `scholarshiptop-site` | Up (healthy) | `127.0.0.1:3000->3000` |
| `scholarshiptop-nginx` | Up | `0.0.0.0:80->80`, `443` |

**Jobs OFF подтверждено:** контейнеров `scripts`, `seo-*`, `mailing*`, `content-hub`, `translation`, cron — **нет**.

---

## 6) Smoke results (`http://213.155.22.74`)

| URL | HTTP |
|-----|------|
| `/` | 200 |
| `/sitemap.xml` | 200 |
| `/sitemaps/scholarships-0.xml` | 200 |
| `/scholarships/no-essay` | 200 |
| `/scholarships/closing-soon` | 200 |
| `/scholarships/category/no-essay` | 308 (redirect, expected) |
| `/scholarships/engineering` | 200 |
| `/scholarships/california` | 200 |

- 500 errors: **не обнаружены**
- Supabase read: страницы scholarship отдают 200 (косвенно OK)
- Email / indexing / jobs: **не запускались**

---

## 7) Ограничения соблюдены

| Правило | Статус |
|---------|--------|
| DNS `scholarshiptop.com` не менялся | да |
| Railway production не трогали | да |
| Supabase schema/data не меняли | да |
| Jobs/workers/cron на VPS | OFF |
| Env values в отчёте | нет |
| Secrets не раскрыты | да |

---

## 8) Warnings / риски

1. **1 GB RAM:** Next.js build только на host со swap (~40+ мин); in-docker build падает по OOM.
2. **Host nginx отключён** — порт 80 занят docker nginx; при rollback учесть.
3. **Deploy через tarball**, не `git clone` на VPS — для следующих деплоев использовать `deploy-site.sh` или повторный tar + prebuilt image flow.
4. **`deploy` без NOPASSWD sudo** — рекомендуется настроить отдельно.
5. **Казахстан VPS** — для EN-аудитории на cutover нужен Cloudflare (этап 5).

---

## 9) Вердикт

**PASS_WITH_WARNINGS**

Site поднят на http://213.155.22.74, smoke пройден, jobs OFF, production Railway/DNS/Supabase не затронуты.

---

## 10) Следующие шаги

- [ ] Этап 5 — Cloudflare CDN перед VPS
- [ ] DNS cutover только после production smoke PASS
- [ ] Jobs переносить по одному (см. `02-job-risk-map-2026-06-24.md`)
- [ ] Рассмотреть upgrade VPS RAM или CI build образа для ускорения деплоев
