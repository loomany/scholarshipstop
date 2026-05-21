# P0 production regression — compare / resources / essays / switcher (2026-05-21)

## Executive summary

P0 hotfix is **implemented and verified on a fresh local build** (`next build` exit 0, including `/sitemap.xml`). Fresh `next start -p 3020` + focused smoke + global i18n audits pass.

**Ready for P0-only push/deploy after your approval:** **yes**

**Pre-deploy note for maintainers:** Clear stale shell `NEXT_PUBLIC_SUPABASE_ANON_KEY` if set in the process environment (see §2). It overrides `.env.local` and breaks `next build` prerender.

---

## 1. Root cause (unchanged from implementation)

| Symptom | Cause |
|--------|--------|
| ES/FR Compare nav shows evergreen guide labels | `LOCALIZED_COMPARE_SUBLINKS` used guide slugs, not Universities/States |
| ES/FR hubs missing search/toolbar | Hubs gated toolbar on `locale === 'en'` only |
| English essay card titles on ES/FR | `EssayCommandCenter` used raw `STATIC_ESSAY_GUIDES` English fields |
| Switcher stuck on Español on `/compare` | Nav locale fell back to SSR `initialLocale` when pathname had no prefix |
| `/es/compare/universities` 404 | No `app/[locale]/compare/universities|states` routes |

DB long-tail grids remain intentionally hidden on ES/FR until translations exist.

---

## 2. Environment / build gate

### `.env.local`

| Check | Result |
|-------|--------|
| File exists | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` host | `qlqlvhgosxhuibzhfsnh.supabase.co` (production) |
| On-disk `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_*` (46 chars) — valid for `content_posts` / `content_translations` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_*` — valid for service reads |
| UTF-8 BOM on `.env.local` | Present (line 1); Next still loads keys |
| Local Docker Supabase | Running in background — **not** referenced by `.env.local` URL |
| `.env` files staged | **No** |

### Build blocker found and resolved (local only)

**Issue:** A **stale process-level** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (JWT `eyJ…`, length 157, **Invalid API key**) overrode `.env.local` during `npm run build`, causing `/sitemap.xml` prerender to throw (`fetchAllPublishedContentPostsForSitemap` → anon client).

**Fix for local verification (do not commit):**

```powershell
Remove-Item Env:NEXT_PUBLIC_SUPABASE_ANON_KEY -ErrorAction SilentlyContinue
```

After clearing, `@next/env` loads on-disk `sb_publishable_*` anon key (46 chars).

**Missing env name:** Not missing — wrong **process** value was overriding the file.

---

## 3. Clean build results

Commands (after clearing process `NEXT_PUBLIC_SUPABASE_ANON_KEY`):

```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm run build
npx tsc --noEmit
npx tsx --test lib/i18n/__tests__/*.test.ts
```

| Step | Result |
|------|--------|
| `npm run build` | **PASS** (exit 0; `○ /sitemap.xml` in route list) |
| `npx tsc --noEmit` | **PASS** |
| i18n unit tests | **PASS** (79/79) |

---

## 4. Fresh server + P0 smoke

```powershell
Remove-Item Env:NEXT_PUBLIC_SUPABASE_ANON_KEY -ErrorAction SilentlyContinue
npx next start -p 3020
$env:SCREENSHOT_BASE_URL='http://localhost:3020'
npx tsx scripts/seo/i18n-p0-live-regression-smoke.ts
```

**Result: All P0 smoke checks passed.**

| Area | Verified |
|------|----------|
| Compare hubs | 200 EN/ES/FR; ES/FR search toolbar (`Buscar comparaciones` / FR equivalent); subhub routes 200 |
| Compare nav intent | `compare/universities` + `compare/states` present in HTML (toolbar/category; client nav hydrates prefixed hrefs) |
| Resources | ES/FR search toolbar for static guides |
| Essays | ES/FR localized static cards (no English example titles in HTML) |
| Switcher (logic) | `/es/compare` → EN `/compare`; `/compare` active EN even if `currentLocale: es`; subhub cluster |
| Category pilot | `/es|fr/.../stem` 200; `/es|fr/.../hobbies` 404 |

**Note:** Playwright switcher UI clicks for `/es/scholarships/category/stem` are covered by unit tests + category pilot smoke patterns; add to Playwright cluster in a follow-up if desired.

---

## 5. Global i18n audits (localhost:3020)

| Audit | Result |
|-------|--------|
| `i18n-visible-text-audit.ts` | **PASS** — 0 pages with errors |
| `i18n-locale-link-audit.ts` | **PASS** — 0 blocking link issues; 18/18 click tests |
| `i18n-language-switcher-audit.ts` | **PASS** — 51/51 pages expecting switcher |

Audit JSON/MD under `reports/seo/*2026-05-19*` were **regenerated** against the fresh server. Optional to commit; not required for the hotfix itself.

---

## 6. SEO checks

| Check | Result |
|-------|--------|
| `/compare`, `/es/compare`, `/fr/compare` | Self canonical + `en`/`es`/`fr`/`x-default` hreflang |
| `/resources`, `/es/resources`, `/fr/resources` | Same |
| `/essays`, `/es/essays`, `/fr/essays` | Same |
| `/en`, `/de/compare` | **404** |
| `/sitemap.xml` | **200** (build + runtime) |
| `/sitemaps/locale-es-categories.xml` | **200** (category pilot unchanged) |
| `/sitemaps/locale-es-resources-db.xml` | **404** (Stage 4D bucket — **excluded** from P0; no published pilot rows in prod read) |
| New DB translated URLs from P0 | **None** — no new sitemap buckets in P0 diff |

English hub metadata and indexing policy unchanged.

---

## 7. Category pilot regression

| URL | Expected | Fresh server |
|-----|----------|--------------|
| `/es/scholarships/category/stem` | 200 | 200 |
| `/fr/scholarships/category/stem` | 200 | 200 |
| `/es/scholarships/category/hobbies` | 404 | 404 |
| `/fr/scholarships/category/hobbies` | 404 | 404 |

---

## 8. Git separation

### A. P0 hotfix — **include in commit**

**Modified (tracked):**

- `components/compare/CompareIndexPageContent.tsx`
- `components/content-hub/ResourcesIndexPageContent.tsx`
- `components/essays/EssaysIndexPageContent.tsx`
- `components/ui/Navbar/Navlinks.tsx`
- `components/ui/Navbar/NavbarUserSlot.tsx`
- `components/ui/Footer/SiteFooterNav.tsx`
- `lib/i18n/localizedHref.ts`
- `lib/i18n/hubUiCopy.ts`
- `lib/i18n/__tests__/languageSwitcher.test.ts`

**New (untracked — stage for P0):**

- `app/[locale]/compare/universities/page.tsx`
- `app/[locale]/compare/states/page.tsx`
- `components/i18n/EnglishZoneNotice.tsx`
- `lib/i18n/resolveNavLocale.ts`
- `lib/i18n/staticCompareHub.ts`
- `lib/i18n/staticEssayGuideCards.ts`
- `lib/i18n/staticEssayHub.ts`
- `lib/i18n/staticResourceHub.ts`
- `scripts/seo/i18n-p0-live-regression-smoke.ts`
- `reports/seo/i18n-p0-production-regression-compare-resources-essays-switcher-2026-05-21.md`

### B. Stage 4D — **exclude from P0 commit**

- `app/resources/[slug]/page.tsx`
- `lib/seo/sitemaps.ts`
- `app/[locale]/resources/[slug]/page.tsx`
- `components/content-hub/LocalizedResourceArticlePage.tsx`
- `lib/i18n/resourcePilot/**`
- `lib/i18n/__tests__/resourcePilot.test.ts`
- `scripts/i18n/seed-resource-pilot-translations.ts`
- `scripts/i18n/sync-resource-pilot-posts-local.ts`
- `scripts/seo/i18n-stage4d-*`
- `reports/seo/i18n-stage4d-*`

### C. Env / local / audit churn — **exclude**

- `.env.local`, `.env.local.prod-backup`, `.env.local.bak-stage4d`
- `.cursor/settings.json`
- Regenerated `reports/seo/i18n-*-audit-2026-05-19.{json,md}` (unless you want audit snapshots in the same PR)

---

## 9. P0-only commit plan (do not run until approved)

```powershell
# Ensure process env does not override .env.local before CI/local build
Remove-Item Env:NEXT_PUBLIC_SUPABASE_ANON_KEY -ErrorAction SilentlyContinue

git add `
  components/compare/CompareIndexPageContent.tsx `
  components/content-hub/ResourcesIndexPageContent.tsx `
  components/essays/EssaysIndexPageContent.tsx `
  components/ui/Navbar/Navlinks.tsx `
  components/ui/Navbar/NavbarUserSlot.tsx `
  components/ui/Footer/SiteFooterNav.tsx `
  components/i18n/EnglishZoneNotice.tsx `
  app/[locale]/compare/universities/page.tsx `
  app/[locale]/compare/states/page.tsx `
  lib/i18n/localizedHref.ts `
  lib/i18n/hubUiCopy.ts `
  lib/i18n/resolveNavLocale.ts `
  lib/i18n/staticCompareHub.ts `
  lib/i18n/staticEssayGuideCards.ts `
  lib/i18n/staticEssayHub.ts `
  lib/i18n/staticResourceHub.ts `
  lib/i18n/__tests__/languageSwitcher.test.ts `
  scripts/seo/i18n-p0-live-regression-smoke.ts `
  reports/seo/i18n-p0-production-regression-compare-resources-essays-switcher-2026-05-21.md

git commit -m "$(cat <<'EOF'
Fix ES/FR compare/resources/essays hub parity and language switcher locale detection.

Restore compare nav Universities/States, static-hub search toolbars, localized essay cards, and pathname-based switcher state; add localized compare subhub routes with English-zone notice.
EOF
)"
```

Post-merge deploy smoke:

```powershell
$env:SCREENSHOT_BASE_URL='https://scholarshiptop.com'
npx tsx scripts/seo/i18n-p0-live-regression-smoke.ts
```

---

## 10. Intentional post-fix differences (ES/FR vs EN)

- No DB compare matchup grid on localized compare hub (English long-tail only).
- No DB resource CMS grid until ≥10 published `resource_article` rows (Stage 4D gate — not enabled in this commit).
- No DB essay long-tail grid on ES/FR.
- `/es|fr/compare/universities|states` show English matchup listings with localized notice banner.

---

## Final verdict

| Question | Answer |
|----------|--------|
| Fresh build fully passes? | **Yes** (after clearing stale process `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| Fresh server P0 smoke passes? | **Yes** |
| Global audits pass? | **Yes** |
| Ready for P0 hotfix push/deploy? | **Yes** — P0-only commit per §9; exclude Stage 4D |
| Remaining blocker? | **No** for code; **CI/local** must not inject stale anon env over `.env.local` |
