# P0 hotfix post-deploy smoke — 2026-05-21

## Commit and push

| Item | Value |
|------|--------|
| Commit | `7e05078` |
| Message | `fix(i18n): restore ES/FR hub parity and language switcher` |
| Branch | `main` |
| Push | `c7dbdec..7e05078` → `origin/main` |
| Files in commit | **19** (P0 only) |

### P0 files committed (confirmed)

- `app/[locale]/compare/states/page.tsx`
- `app/[locale]/compare/universities/page.tsx`
- `components/compare/CompareIndexPageContent.tsx`
- `components/content-hub/ResourcesIndexPageContent.tsx`
- `components/essays/EssaysIndexPageContent.tsx`
- `components/i18n/EnglishZoneNotice.tsx`
- `components/ui/Footer/SiteFooterNav.tsx`
- `components/ui/Navbar/NavbarUserSlot.tsx`
- `components/ui/Navbar/Navlinks.tsx`
- `lib/i18n/__tests__/languageSwitcher.test.ts`
- `lib/i18n/hubUiCopy.ts`
- `lib/i18n/localizedHref.ts`
- `lib/i18n/resolveNavLocale.ts`
- `lib/i18n/staticCompareHub.ts`
- `lib/i18n/staticEssayGuideCards.ts`
- `lib/i18n/staticEssayHub.ts`
- `lib/i18n/staticResourceHub.ts`
- `reports/seo/i18n-p0-production-regression-compare-resources-essays-switcher-2026-05-21.md`
- `scripts/seo/i18n-p0-live-regression-smoke.ts`

### Excluded from commit (still in working tree)

- `lib/seo/sitemaps.ts`, `app/resources/[slug]/page.tsx`, `app/[locale]/resources/`, `lib/i18n/resourcePilot/**`, Stage 4D scripts/reports, env files, regenerated audit JSON/MD.

---

## Production smoke timing

Smoke target: **https://scholarshiptop.com**

Runs: immediately after push, then **~45s later** (to allow deploy propagation).

**Verdict at time of report:** Production has **not fully picked up** commit `7e05078` yet. Re-run smoke after the hosting deploy finishes.

---

## HTTP status (production)

| URL | Expected | Observed |
|-----|----------|----------|
| `/compare` | 200 | 200 |
| `/es/compare` | 200 | 200 |
| `/fr/compare` | 200 | 200 |
| `/es/compare/universities` | 200 | **404** (new routes — not deployed yet) |
| `/fr/compare/universities` | 200 | **404** |
| `/es/compare/states` | 200 | **404** |
| `/resources` | 200 | 200 |
| `/es/resources` | 200 | 200 |
| `/fr/resources` | 200 | 200 |
| `/essays` | 200 | 200 |
| `/es/essays` | 200 | 200 |
| `/fr/essays` | 200 | 200 |
| `/es/scholarships/category/stem` | 200 | 200 |
| `/fr/scholarships/category/stem` | 200 | 200 |
| `/es/scholarships/category/hobbies` | 404 | 404 |
| `/en` | 404 | **404** |

Category pilot regression on production: **unchanged / OK** (stem 200, hobbies 404).

---

## P0 functional checks (production HTML fetch)

Script: `SCREENSHOT_BASE_URL=https://scholarshiptop.com npx tsx scripts/seo/i18n-p0-live-regression-smoke.ts`

| Check | Result | Notes |
|-------|--------|-------|
| Switcher href logic (server-side helper) | **PASS** | `getStage2LanguageSwitcherItems` paths correct in HTML policy |
| Compare subhub hrefs in hub HTML | **PASS** on `/es/compare`, `/fr/compare` | `compare/universities` + `compare/states` present |
| Compare search toolbar (`Buscar comparaciones`) | **FAIL** | Not in SSR HTML yet — likely **pre-deploy build** or toolbar still client-only until new bundle live |
| Resources/essays search toolbar | **FAIL** | Same |
| ES/FR essays — no English card titles | **FAIL** | Still sees `Scholarship Essay Examples`, etc. |
| Compare subhub routes | **FAIL** | 404 — routes from commit not live |

### Spot checks

| Page | Signal |
|------|--------|
| `/es/compare` | `Universidades` **present** in HTML (partial nav/copy may be cached or mixed deploy) |
| `/es/compare` | `Buscar comparaciones` **absent** |
| `/es/essays` | English guide titles **still present** |
| `/en` | **404** |

---

## Expected after deploy completes

When `7e05078` is live on production:

1. **`/es/compare/universities`** and **`/es/compare/states`** → 200 with English-zone notice.
2. **Compare dropdown (ES/FR):** Universidades / Estados (FR: Universités / États) — not evergreen-only dropdown labels.
3. **Hubs:** Search/category toolbar on ES/FR compare, resources, essays (SSR should include localized toolbar copy per local gate).
4. **Essays:** Featured static cards use localized titles (no `Scholarship Essay Examples` in main grid).
5. **Language switcher:** Active label follows pathname (English on `/compare` after leaving `/es/compare`).

### Re-run commands

```powershell
$env:SCREENSHOT_BASE_URL='https://scholarshiptop.com'
npx tsx scripts/seo/i18n-p0-live-regression-smoke.ts
```

Optional Playwright (UI switcher clicks):

```powershell
$env:SCREENSHOT_BASE_URL='https://scholarshiptop.com'
npx tsx scripts/i18n-language-switcher-audit.ts
```

---

## Local gate reference (pre-push)

On **fresh local build** after `7e05078` (documented in `i18n-p0-production-regression-compare-resources-essays-switcher-2026-05-21.md`):

- `npm run build` — PASS
- P0 smoke on `http://localhost:3020` — **all checks passed**
- Global i18n audits — PASS

---

## Summary

| Milestone | Status |
|-----------|--------|
| P0-only commit | **Done** (`7e05078`) |
| Push to `main` | **Done** |
| Stage 4D excluded | **Confirmed** |
| Production fully verified | **Pending deploy** — re-run smoke when live |
| `/en` on production | **404** (OK) |

**Action:** Wait for production deploy of `7e05078`, then re-run `i18n-p0-live-regression-smoke.ts` against `https://scholarshiptop.com` and update this report or close the deploy gate.

---

## Build fix follow-up (Railpack failure)

**Issue:** Deploy build failed — `ResourcesIndexPageContent.tsx` and `localizedHref.ts` in commit `7e05078` imported `@/lib/i18n/resourcePilot/*`, which were **not** in the P0 commit (Stage 4D only).

**Fix commit:** (pushed after this report section) — removed `resourcePilot` imports; ES/FR resources hub keeps static guides + toolbar only (`showLocaleDbGrid = locale === 'en'`).

**Local `npm run build`:** PASS after fix.
