# Stage 8C — Railway `Сайт` service stop

**Дата:** 2026-06-24  
**Production:** https://scholarshiptop.com → Cloudflare → VPS `213.155.22.74`  
**Action:** stop Railway service **Сайт** only (cost reduction + rollback preserved)

## Verdict: **PASS**

Production остаётся на VPS. Railway jobs не тронуты. Rollback возможен через redeploy.

---

## Step 1 — Pre-stop smoke

| Check | Result |
|-------|--------|
| `https://scholarshiptop.com/` | **200** |
| `/sitemap.xml` | **200**, valid XML |
| `/sitemaps/scholarships-0.xml` | **200**, 765 loc |
| `/scholarships/no-essay` | **200**, **index, follow** |
| `/scholarships/closing-soon` | **200**, **index, follow** |
| 500/502/525/526 | **none** |

**VPS `docker ps`:** `scholarshiptop-site` (healthy), `scholarshiptop-nginx` only.

---

## Step 2 — Railway `Сайт` stopped

| Item | Value |
|------|-------|
| Command | `railway down -s "Сайт" -y` |
| Method | remove active deployment (reversible, not service delete) |
| Service ID | `cf579132-2472-489a-879b-f6fea4b6fae9` |
| Before | **Online** (`56f1e3f3…`) |
| After | **Failed / no running deployment** (`d96b8ad6…`) — expected after `down` |
| Railway env | **not deleted** |
| Project | **not deleted** |

### Railway services NOT touched

| Service | Status after |
|---------|--------------|
| Скрипты | Completed (cron active) |
| Сео генерация | Completed (cron active) |
| Сео индексация | Completed (cron active) |
| Сео Аудит | Completed (cron active) |
| Рассылка | Completed (cron active) |
| **Рассылка провайдеры** | **Online** |
| Контент Хаб | Completed |
| Перевод | Completed |

---

## Step 3 — Post-stop smoke

| URL | Status | SEO |
|-----|--------|-----|
| `/` | 200 | OK |
| `/sitemap.xml` | 200 | valid |
| `/sitemaps/scholarships-0.xml` | 200 | 765 loc |
| `/scholarships/no-essay` | 200 | **index, follow** |
| `/scholarships/closing-soon` | 200 | **index, follow** |
| `/scholarships/california` | 200 | **noindex, follow** |
| 500/502/525/526 | **none** | |

**Nginx access log:** Cloudflare source IPs → **HTTP/2.0 200** on production paths (post-stop smoke + live traffic).

**VPS containers:** only `scholarshiptop-site` + `scholarshiptop-nginx`. **Jobs OFF.**

---

## Step 4 — Rollback plan

If production breaks:

1. **Redeploy Railway `Сайт`:** `railway redeploy -s "Сайт"` or `railway up -s "Сайт"` from repo (env intact on Railway).
2. If needed: Cloudflare origin back to Railway (DNS currently points to VPS — only if VPS failure).
3. **Do not** change Supabase.
4. Leave VPS running for diagnosis.

Rollback env on VPS already at `/opt/scholarshiptop/env/site.env` (not required if only Railway redeploy).

---

## Constraints confirmed

| Constraint | OK |
|------------|-----|
| Only `Сайт` stopped | yes |
| Jobs on Railway still scheduled / providers Online | yes |
| Supabase untouched | yes |
| DNS unchanged | yes |
| VPS jobs not started | yes |
| Env values not printed | yes |
| Irreversible delete | no |

---

## Related reports

- `07-cloudflare-dns-cutover-execution-2026-06-24.md`
- `08b-vps-all-env-transfer-2026-06-24.md`
