# Stage 7 — Cloudflare DNS cutover execution & post-cutover smoke

**Дата:** 2026-06-24  
**DNS change:** выполнен вручную в Cloudflare (operator)  
**Origin:** `213.155.22.74` (Proxied)  
**Live domain:** https://scholarshiptop.com

## Verdict: **PASS**

Production traffic обслуживается VPS через Cloudflare. SEO, TLS и инфраструктурные проверки пройдены.

---

## DNS change applied

| Record | Type | Target | Proxy |
|--------|------|--------|-------|
| `scholarshiptop.com` | A | `213.155.22.74` | Proxied (orange) |
| `www.scholarshiptop.com` | A | `213.155.22.74` | Proxied (orange) |

**www behavior:** `https://www.scholarshiptop.com/` → **301** → `https://scholarshiptop.com/` (unchanged).

---

## Live URL checks (post-cutover)

| URL | Status | robots | canonical | notes |
|-----|--------|--------|-----------|-------|
| `/` | **200** | — | `https://scholarshiptop.com` | `cf-ray` present |
| `/sitemap.xml` | **200** | — | — | valid XML, 83 loc |
| `/sitemaps/scholarships-0.xml` | **200** | — | — | valid XML, 765 loc |
| `/scholarships/no-essay` | **200** | **index, follow** | `https://scholarshiptop.com/scholarships/no-essay` | 1 H1 |
| `/scholarships/closing-soon` | **200** | **index, follow** | `https://scholarshiptop.com/scholarships/closing-soon` | 1 H1 |
| `/scholarships/category/no-essay` | **308** | noindex, follow | category canonical | → `/scholarships/no-essay` |
| `/scholarships/engineering` | **200** | index, follow | `https://scholarshiptop.com/...` | OK |
| `/scholarships/california` | **200** | **noindex, follow** | `https://scholarshiptop.com/...` | expected |

### Error codes

| Code | Seen |
|------|------|
| 500 / 502 | **no** |
| 525 / 526 (CF origin SSL) | **no** |

All responses: `server: cloudflare` + `cf-ray` (edge OK). Origin TLS Full (strict) working.

---

## SEO parity (post-cutover)

`node scripts/vps-migration/seo-parity-smoke.mjs` → **PASS** (0 issues, 0 warnings)

Railway vs live VPS parity on key routes confirmed after cutover.

---

## VPS infrastructure

### Active containers

```
scholarshiptop-site   Up (healthy)
scholarshiptop-nginx  Up
```

**Jobs OFF** — no job/worker/cron containers.

### Nginx access log (traffic hits VPS)

Sample lines from `/opt/scholarshiptop/logs/nginx/scholarshiptop-access.log`:

- Cloudflare source IPs (`172.71.x`, `172.69.x`, `104.22.x`) → **HTTP/2.0 200**
- Post-cutover smoke: `Stage7PostCutover/1.0` → `GET /` **200**, `GET /sitemap.xml` **200**
- Live bot traffic (AhrefsBot, GPTBot, Applebot, SemrushBot) → **200**

**Conclusion:** production traffic reaches VPS nginx, not stale Railway-only path.

---

## Rollback & external services

| Item | Status |
|------|--------|
| Railway | **left running** for rollback (not disabled by this stage) |
| Supabase | **untouched** |
| VPS jobs | **not started** |
| Env values / secrets | **not printed** |

### Rollback procedure (if needed)

1. Cloudflare DNS: restore previous Railway origin target
2. Verify `https://scholarshiptop.com/` serves Railway
3. Do not modify Supabase
4. VPS can stay up for debugging

---

## Monitoring (next 24–48h)

- [ ] GSC crawl errors / indexing
- [ ] Cloudflare analytics 5xx rate
- [ ] VPS nginx error log + `docker compose ps`
- [ ] No accidental VPS job startup
- [ ] Response times (KZ VPS + EN audience via CF CDN)

---

## Scripts used

| Script | Result |
|--------|--------|
| `scripts/vps-migration/stage-7-post-cutover-smoke.mjs` | PASS |
| `scripts/vps-migration/seo-parity-smoke.mjs` | PASS |

---

## Constraints confirmed

- DNS: **changed** (operator, Cloudflare → VPS)
- Railway: **not disabled**
- Supabase: **not modified**
- VPS jobs: **not started**
- Certificate / private key / env values: **not exposed**
