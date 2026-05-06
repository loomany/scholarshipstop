# Cross-country SEO rollout — final smoke / audit (Step 2E)

**Date:** 2026-05-06  
**Scope:** Audit only — no code changes in this step.  
**Environment notes:** HTTP checks used `http://localhost:3000` with a running `next dev`. Sitemap XML used the same origin; `<loc>` values use production host `https://scholarshiptop.com` (from `getURL()` / `NEXT_PUBLIC_SITE_URL` / fallback), which is expected.

---

## Summary

Cross-country URLs resolve and render when present in the manifest; SEO bucket sitemap contains **28** cross-country-style URLs matching `listCrossCountrySitemapEntries()`, including India→US and Canada→US, excluding Ukraine→Germany and US→Congo-Kinshasa examples. Automated checks confirm **no `?` in any `<loc>`** in `seo.xml`. Legacy hub and 2-segment country URLs returned **HTTP 200** in the same run.

**Gaps / warnings:** (1) Browser-only checks (visible H1 in viewport, filter chips, first scholarship cards) were **not** automated here; confirm manually once. (2) Unknown pair URL returned **HTTP 200** in **dev** while HTML indicated `NEXT_NOT_FOUND` / `next-error=not-found` — see **Issues** below; verify **production** returns **404** if strict HTTP semantics are required.

---

## Build / tests (automated)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | Pass |
| `npx tsx --test lib/scholarships/__tests__/seoCrossCountryResolve.test.ts lib/scholarships/__tests__/crossCountrySeoRobots.test.ts lib/seo/__tests__/crossCountrySitemap.test.ts` | **22** passed |
| `npm run build` | Pass |

---

## 1. Approved / indexable URLs

| URL | HTTP | Notes |
|-----|------|--------|
| `/scholarships/for-students-from/india/study-in/united-states` | **200** | Manifest: `status: approved`, `robots: index,follow`, `includeInSitemap: true` |
| `/scholarships/for-students-from/canada/study-in/united-states` | **200** | Same pattern |
| `/scholarships/for-students-from/united-kingdom/study-in/united-states` | **200** | Same pattern |

**Manifest expectations (India → US)** — from `data/seo-cross-country-routes.json`:

- **H1:** `Scholarships for Indian Students to Study in the USA`
- **metaTitle:** `Indian Students: Scholarships to Study in the USA | ScholarshipTop`
- **metaDescription:** `Find scholarships for students from India who want to study in United States. Compare deadlines, award amounts, eligibility notes, and requirements before applying.`
- **Canonical (policy):** `https://scholarshiptop.com/scholarships/for-students-from/india/study-in/united-states` (via `getCanonical(entry.href)` in layout metadata — Step 2C)
- **Robots (policy):** `index, follow` (`crossCountryListingRobotsFromManifest`)

**Not verified in this run (manual):** visible listing count, first cards, “I’m from” / “Study in” filter chips (requires browser / Playwright).

---

## 2. Manual review / noindex URL

| URL | HTTP | Sitemap |
|-----|------|---------|
| `/scholarships/for-students-from/ukraine/study-in/germany` | **200** | **Absent** from `seo.xml` cross-country set |

**Manifest:** `manual_review`, `robots: noindex,follow`, `includeInSitemap: false` — SSR still allowed when `enabled: true` (Step 2B/2C).

---

## 3. Published noindex / low-count URL

| URL | HTTP | Sitemap |
|-----|------|---------|
| `/scholarships/for-students-from/united-states/study-in/congo-kinshasa` | **200** | **Absent** (stable example: `published_noindex`, `includeInSitemap: false`) |

---

## 4. Unknown pair

| URL | HTTP (dev) | Notes |
|-----|------------|--------|
| `/scholarships/for-students-from/not-a-real-country/study-in/fake-country` | **200** | Response HTML included `NEXT_NOT_FOUND` / `meta name="next-error" content="not-found"` and `robots: noindex`. **Does not** resolve as `cross_country_seo` (resolver unit test uses different fake slugs; this path is still absent from manifest). |

→ Listed under **Issues** (HTTP status vs strict 404 expectation).

---

## 5. Query noise

**Policy (code):** `app/scholarships/[[...slugPath]]/page.tsx` — if `isSeoNoiseQuery(searchParams)` (includes `sort`, `app_cc`, `host_cc`, …), page metadata sets **`robots: noindex, follow`** and **`alternates.canonical`** to the path **without** query string.

| URL | HTTP |
|-----|------|
| `.../india/study-in/united-states?sort=most_recent` | **200** |
| `.../india/study-in/united-states?app_cc=IN&host_cc=US` | **200** |

**Sitemap:** No `<loc>` entries contain `?` (parsed **1626** total locs in `seo.xml` sample).

**Manual:** Confirm merged `<head>` in DevTools for canonical + robots on query URLs.

---

## 6. Existing SEO pages

| URL | HTTP |
|-----|------|
| `/scholarships/for-students-from/united-kingdom` | **200** |
| `/scholarships/study-in/united-kingdom` | **200** |
| `/scholarships/hub/easy-apply` | **200** |
| `/scholarships/hub/best-matches` | **200** |

No regressions detected at HTTP level in this pass.

---

## 7. Sitemap audit (`/sitemaps/seo.xml`)

| Metric | Value |
|--------|------:|
| Total `<loc>` in file (sample) | 1626 |
| Cross-country pattern count `…/for-students-from/{slug}/study-in/{slug}` | **28** |
| `listCrossCountrySitemapEntries().length` (helper) | **28** |
| Germany (`/study-in/germany`) cross-country URLs in that set | **6** |
| India→US present | **Yes** |
| Canada→US present | **Yes** |
| Ukraine→Germany present | **No** |
| US→Congo-Kinshasa present | **No** |
| Any `?sort=`, `?app_cc=`, `?host_cc=` in `<loc>` | **No** |

**Included examples (first 5 from parsed set):**

1. `https://scholarshiptop.com/scholarships/for-students-from/united-states/study-in/united-states`
2. `https://scholarshiptop.com/scholarships/for-students-from/canada/study-in/canada`
3. `https://scholarshiptop.com/scholarships/for-students-from/united-kingdom/study-in/united-kingdom`
4. `https://scholarshiptop.com/scholarships/for-students-from/canada/study-in/united-states`
5. `https://scholarshiptop.com/scholarships/for-students-from/united-states/study-in/germany`

**Drip:** Cross-country paths use `canonicalPathAllowedInSeoSitemap(entry.canonicalPath)` like other SEO listings; if a path is both in the drip queue and not yet “visible”, it could be omitted (same as manifest SEO). With drip inactive or path not queued, count stays **28**.

---

## Issues found (no fix applied — await approve)

### Issue A — Unknown cross-country pair: HTTP 200 in dev with not-found UI

- **URL:** `/scholarships/for-students-from/not-a-real-country/study-in/fake-country`
- **Expected (acceptance text):** `notFound` / **404**
- **Actual (next dev):** **HTTP 200**, HTML indicates `NEXT_NOT_FOUND` / `next-error=not-found`, `robots: noindex`
- **Likely cause:** Next.js App Router **dev** streaming / RSC shell behavior for `notFound()` (may differ from production).
- **Risk:** Monitoring tools that only check HTTP status may misclassify “soft” not-found in dev; crawlers typically rely on production behavior.
- **Minimal fix proposal (if prod also returns 200):** Confirm with `npm run build && npm run start` + `curl -I`; then adjust routing/not-found handling only after repro in **production** mode — **out of scope** until approved.

---

## Final recommendation

**Ready with warnings**

- Ship criteria for **data + sitemap + resolver + metadata policy** are aligned with tests and sampled `seo.xml`.
- Complete **UI/filter/card** confirmation and **production** `notFound` HTTP status check before calling rollout “fully verified.”

---

## Stop condition

Step 2E complete: report filed. **No code changes** in this step. Await explicit approval before any fix for Issue A or follow-up QA automation.
