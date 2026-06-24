# Stage 4.6 — no-essay noindex investigation & fix

**Дата:** 2026-06-24  
**Production:** https://scholarshiptop.com  
**VPS staging:** http://213.155.22.74  
**Режим:** read-only HTTP + site-only deploy fix (no DNS/Railway/Supabase/jobs)

## Verdict: **PASS**

`/scholarships/no-essay` на VPS после fix: **`index, follow`** — parity с Railway. Cutover blocker снят.

---

## Executive summary

| Question | Answer |
|----------|--------|
| Staging/IP-host protection? | **No** — canonical уже был `https://scholarshiptop.com/...` при `noindex`; Host header не влияет |
| Real regression after DNS? | **Yes (deploy artifact)** — runtime `data/` не попадал в Docker image |
| Fix | `Dockerfile.prebuilt` + `Dockerfile`: COPY runtime SEO JSON dirs |
| Separate production-host candidate? | **Not required** — post-fix staging на IP = production-host behavior (см. §5) |

---

## 1) VPS site env keys (names only, no values)

**Файл:** `/opt/scholarshiptop/env/site.env` — **63 keys** total.

| Key | Present |
|-----|---------|
| `SITE_URL` | yes |
| `NEXT_PUBLIC_SITE_URL` | yes |
| `NODE_ENV` | not in `site.env` — set in `docker-compose.yml` as `production` |
| `SEO_DRIP_ENABLED` | yes |
| `SEO_DRIP_START_DATE` | yes |
| `SEO_PAGES_PER_HOUR` | yes |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | yes |
| `GOOGLE_INDEXING_*` (6 keys) | yes |
| `INDEXNOW_SECRET` | yes |
| `OPENAI_SEO_MODEL` | yes |

**No staging/noindex/IP-protection flags** found in env key names.

---

## 2) Code path — source of noindex

`/scholarships/no-essay` resolves as **`legacy_long_tail`** (not curated manifest row; `closing-soon` is manifest `GOOD`).

Metadata chain (`app/scholarships/scholarshipSlugLayoutMetadata.ts`):

1. `readLongTailSeoBundle('no-essay')` → reads `data/long-tail-seo/no-essay.json` at **runtime**
2. `getScholarshipSeoRouteQualityPolicy()` (`lib/seo/scholarshipSeoQualityPolicy.ts`):
   - `routeFamily: legacy_long_tail`
   - `PRIORITY_LOW_COMPETITION_LONG_TAIL_SLUGS` includes `no-essay`
   - Requires **≥120 words** in SEO bundle
   - If bundle missing → `legacy_long_tail_below_visible_content_threshold` → **`noindex, follow`**

Related symbols (not host-based):

| Symbol | Role |
|--------|------|
| `noindexNow` | manifest field; `dynamic_route` entries default `noindexNow: true` |
| `qualityBucket` | `GOOD` manifest routes index without runtime JSON |
| `reasonCodes` | e.g. `legacy_long_tail_below_visible_content_threshold` |
| `dynamic_route` | dynamic filter URLs (not no-essay) |
| `SITE_URL` / `NEXT_PUBLIC_SITE_URL` | canonical URLs only (`lib/seo/canonical.ts`) — **no robots gating by host** |

**Why `closing-soon` was index on broken VPS:** manifest row `indexable: true`, `qualityBucket: GOOD` — indexes without runtime JSON. **`no-essay` has no manifest row** → depends on runtime `data/long-tail-seo/`.

---

## 3) HTML comparison (before fix)

| Signal | Railway | VPS (before) |
|--------|---------|--------------|
| robots | `index, follow` | **`noindex, follow`** |
| canonical | `https://scholarshiptop.com/scholarships/no-essay` | same (already production URL) |
| title | No Essay Scholarships USA \| Find & Apply | No Essay Scholarships 2026 (PRESET_COPY fallback) |
| H1 | No Essay Scholarships USA \| Find & Apply | No Essay Scholarships 2026 |

**Evidence:** canonical pointed to production domain while robots were `noindex` → **not** IP/staging protection.

**Container check (before fix):**

```
docker exec scholarshiptop-site ls /app/data
→ No such file or directory
```

Host had files at `/opt/scholarshiptop/app/data/long-tail-seo/no-essay.json` but image did not COPY them.

---

## 4) Root cause (category B)

`ops/vps/Dockerfile.prebuilt` copied only:

- `package.json`, `node_modules`, `public`, `.next`

Railway RAILPACK runs with full repo filesystem → `data/` available at runtime.

VPS slim image → `readLongTailSeoBundle()` returned `null` → quality policy noindex.

---

## 5) Fix applied

### Code change (repo)

`ops/vps/Dockerfile.prebuilt` and `ops/vps/Dockerfile` — added runtime COPY:

- `data/long-tail-seo/`
- `data/seo-scholarship-content/`
- `data/seo-pending-queue.json`

### VPS deploy (site only)

1. SCP updated `Dockerfile.prebuilt` → `/opt/scholarshiptop/`
2. `docker compose --profile site build site`
3. `docker compose --profile site up -d --no-deps site`
4. Verified in container: `/app/data/long-tail-seo/no-essay.json` exists

**Jobs:** only `scholarshiptop-site` + `scholarshiptop-nginx` running.

### Production-host candidate verification

Separate candidate container on alt port **not required**:

- Pre-fix: `noindex` on IP **with** production canonical → not host-gated
- Post-fix: `index, follow` on `http://213.155.22.74/scholarships/no-essay` with same `SITE_URL`/`NEXT_PUBLIC_SITE_URL` as cutover target

This confirms production-host behavior without DNS change.

---

## 6) Post-fix verification

| Check | VPS (after fix) | Railway | Match |
|-------|-----------------|---------|-------|
| `/scholarships/no-essay` robots | `index, follow` | `index, follow` | yes |
| `/scholarships/no-essay` canonical | `/scholarships/no-essay` | same | yes |
| `/scholarships/no-essay` title/H1 | USA \| Find & Apply | same | yes |
| `/scholarships/category/no-essay` | 308 → `/scholarships/no-essay` | same | yes |
| `/scholarships/closing-soon` | `index, follow`, 1 H1 | same | yes |
| `/sitemap.xml` | 200, valid XML | same | yes |
| `/sitemaps/scholarships-0.xml` loc count | **851** | **851** | yes |
| VPS jobs | site + nginx only | — | OK |

**Stage 4.5 parity smoke re-run:** **PASS** (0 issues) — see `045-vps-seo-parity-smoke-2026-06-24.md`.

---

## 7) Pre-cutover checklist (DNS / Cloudflare)

Before DNS switch:

1. Ensure Docker image includes runtime `data/` COPY (this fix)
2. Set `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to `https://scholarshiptop.com` in `/opt/scholarshiptop/env/site.env`
3. Rebuild image if `.next` was built with different `NEXT_PUBLIC_*` (host build uses `site.env` → `.env.production`)
4. `docker compose --profile site up -d --no-deps site nginx`
5. Run:
   - `node scripts/vps-migration/stage-46-verify-noindex-fix.mjs`
   - `node scripts/vps-migration/seo-parity-smoke.mjs`
6. Confirm `/scholarships/no-essay` → `index, follow`
7. Confirm jobs profile still **not** started

---

## 8) Constraints confirmed

- DNS: not changed
- Railway: not modified (read-only fetches only)
- Supabase: not modified
- VPS jobs/workers/cron: not started
- Env values: not printed
- Secrets: not committed

---

## Files touched

| File | Change |
|------|--------|
| `ops/vps/Dockerfile.prebuilt` | COPY runtime `data/` dirs |
| `ops/vps/Dockerfile` | same for full build path |
| `scripts/vps-migration/investigate-noessay-noindex.mjs` | HTML compare helper |
| `scripts/vps-migration/stage-46-verify-noindex-fix.mjs` | post-fix verification |
| VPS `/opt/scholarshiptop/Dockerfile.prebuilt` | deployed |
