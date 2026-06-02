# P0 ES/FR UI static cleanup — post-deploy smoke (2026-05-21)

**Production:** https://scholarshiptop.com  
**Commit:** `252a4c4` — `fix(i18n): localize ES FR UI chrome across public hubs`  
**Pushed:** `main` → `origin/main` (`18c91b7..252a4c4`)  
**Deploy detected:** ~30s after push (`Becas activas` on `/es/providers` SSR)

---

## Pre-commit safety (confirmed)

| Check | Result |
| --- | --- |
| `.env` / secrets staged | **No** |
| Migrations / DB seeds | **No** |
| Auth / payment / Lemon | **No** |
| `/en` route added | **No** |
| Staged scope | 27 files — P0 UI + `i18n-p0-ui-static-cleanup-2026-05-21.md` only |
| Left unstaged | Audit JSON churn, `.env*.bak`, cloudflare scripts, other reports |

---

## Production smoke — routes

| Route | Expected | Result |
| --- | ---: | --- |
| `/es/scholarships` | 200 | **200** |
| `/fr/scholarships` | 200 | **200** |
| `/es/providers` | 200 | **200** |
| `/fr/providers` | 200 | **200** |
| `/es/compare` | 200 | **200** |
| `/fr/compare` | 200 | **200** |
| `/es/compare/universities` | 200 | **200** |
| `/fr/compare/universities` | 200 | **200** |
| `/es/resources` | 200 | **200** |
| `/fr/resources` | 200 | **200** |
| `/es/essays` | 200 | **200** |
| `/fr/essays` | 200 | **200** |
| `/es/subscription` | 200 | **200** |
| `/fr/subscription` | 200 | **200** |
| `/es/resources/how-to-apply-for-scholarships` | 200 | **200** |
| `/fr/resources/how-to-apply-for-scholarships` | 200 | **200** |
| `/en` | 404 | **404** |

---

## P0 English UI chrome markers (HTML fetch)

Script: `scripts/seo/i18n-ui-static-cleanup-smoke.ts` (local, not in commit)

**All listed routes:** no blocking P0 chrome markers in initial HTML  
(Award Amount, View Profile, Countries, Read more →, Filters, Categories, Showing, Best for, Effort, Source, Continue your scholarship search, Explore, Active Scholarships, etc.)

**Note:** Client-hydrated scholarship listings may still show English **DB** requirement summaries; that is allowed (Zone C).

---

## Regression smoke

Script: `scripts/seo/i18n-p0-live-regression-smoke.ts`

| Area | Result |
| --- | --- |
| Compare subhubs EN/ES/FR | **Pass** |
| Category pilot STEM ES/FR | **200** |
| Category hobbies ES | **404** (expected) |
| Language switcher (5 cases) | **Pass** — no `/en` hrefs |
| Hub search/toolbar localized | **Pass** |
| `/es/essays` static cards | **Pass** — no English guide titles in HTML |

---

## SEO / pilots / sitemap

| Check | Result |
| --- | --- |
| `/sitemap.xml` | **200** |
| `/sitemaps/locale-es-categories.xml` | **200** |
| `/sitemaps/locale-fr-categories.xml` | **200** |
| Resource pilot ES/FR article | **200** |
| Non-pilot resource slug | **404** |
| Category hobbies FR | **404** |

---

## Verdict

| Criterion | Status |
| --- | --- |
| P0 UI chrome on production | **Pass** |
| DB / entity names allowed | **Yes** (titles, amounts, EN descriptions unchanged) |
| Language switcher | **Pass** |
| Category pilot | **Pass** |
| Resource article pilot | **Pass** |
| Sitemap | **Pass** |
| `/en` | **404** |

**Production deploy for P0 UI chrome: successful.**

Remaining English on ES/FR is expected in **DB/CMS bodies**, compare DB card titles, and non-pilot static resource guide titles — out of scope for this commit.

---

## Commands used

```powershell
$env:SCREENSHOT_BASE_URL='https://scholarshiptop.com'
npx tsx scripts/seo/i18n-ui-static-cleanup-smoke.ts
npx tsx scripts/seo/i18n-p0-live-regression-smoke.ts
```
