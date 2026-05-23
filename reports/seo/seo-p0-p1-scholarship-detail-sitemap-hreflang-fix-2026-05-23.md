# SEO P0/P1 — scholarship detail sitemap + reciprocal hreflang (2026-05-23)

## Production pre-check (before code deploy)

| URL | Status | Notes |
|-----|--------|-------|
| `https://scholarshiptop.com/sitemap.xml` | **200** | Index still listed `locale-es/fr-scholarships-detail-db` |
| `https://scholarshiptop.com/sitemaps/locale-es-scholarships-detail-db.xml` | **404** | `{"error":"Sitemap not found"}` |
| `https://scholarshiptop.com/sitemaps/locale-fr-scholarships-detail-db.xml` | **404** | Same |

**Verdict:** Audit P0 was **not stale** at fix time. Child scholarship-detail sitemap buckets were broken while the index still referenced them (likely ISR cache + empty `buildLocalizedScholarshipDetailSitemapDocuments()` when service-role lookup failed or returned no rows).

Other child sitemaps (core, resources, providers, locale-es-providers-db, etc.) returned **200**.

---

## Root cause (P0)

`listPublishedScholarshipDetailTranslations()` used the **anon** Supabase client for `content_translations`, then required **service role** only for the `scholarships` slug join. If `SUPABASE_SERVICE_ROLE_KEY` was missing or the anon path returned rows that could not be joined, the function returned `[]`, so:

- `buildLocalizedScholarshipDetailSitemapDocuments()` produced **no documents**
- `getSitemapDocumentBySlug('locale-es-scholarships-detail-db')` → **404**
- Stale cached `sitemap.xml` could still list those buckets from an earlier successful build

---

## Fixes shipped

### 1. `lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations.ts`

- Use **service role only** for both `content_translations` and `scholarships` queries (no anon fallback).
- Select `translated_body` / `translated_summary`; exclude rows without body/summary (aligned with `isPublishedScholarshipDetailTranslation`).
- Keep filters: `published`, `quality_score >= 85` (when set), slug match, `is_indexable !== false`.

### 2. `lib/seo/sitemaps.ts`

- `buildLocalizedScholarshipDetailSitemapDocuments`: set `hasLocalizedBody` from actual translated body/summary (not hard-coded `true`).

### 3. `app/scholarships/scholarshipSlugLayoutMetadata.ts` (P1)

- EN scholarship detail pages call `buildScholarshipDetailAlternates()` so **reciprocal** `en` / `es` / `fr` / `x-default` hreflang is emitted when published translations exist (same gates as localized routes: published, quality ≥ 85, body present).

### 4. Tests & smoke

- `lib/i18n/__tests__/scholarshipDetailHreflang.test.ts` — alternates cluster behavior
- `scripts/seo/seo-p0-p1-scholarship-detail-smoke.ts` — post-deploy production smoke

---

## Query canonical (Task 3) — verified on production (unchanged)

| URL | robots | canonical |
|-----|--------|-----------|
| `/scholarships/{slug}` | `index, follow` | clean path |
| `/scholarships/{slug}?return_to=...` | `noindex, follow` | clean path (no query) |
| `/es/scholarships/{slug}?return_to=...` | `noindex, follow` | clean `/es/...` path |

---

## Local verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | pass |
| `npm run build` | pass |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | 93 pass |
| `npx tsx --test lib/seo/__tests__/*.test.ts` | 37 pass |

---

## Post-deploy actions (required)

1. Deploy this commit to production.
2. Revalidate sitemap cache (paths from `scripts/i18n/scholarship-detail-autopilot/revalidate-detail-sitemaps.ts`):
   - `/sitemap.xml`
   - `/sitemaps/locale-es-scholarships-detail-db.xml`
   - `/sitemaps/locale-fr-scholarships-detail-db.xml`
3. Run production smoke:
   ```bash
   npx tsx scripts/seo/seo-p0-p1-scholarship-detail-smoke.ts
   ```
4. Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in production (required for scholarship-detail sitemap generation).

**Expected after deploy:**

- ES/FR detail sitemap XML **200**
- ES count = FR count = published `scholarship_detail` rows (quality ≥ 85, body present, indexable)
- EN detail sample (`climate-stripes-scholarship-14487`) includes `hreflang` for `es` and `fr`
- Index lists only buckets that return 200 (may need cache TTL up to 1h without manual revalidate)

---

## Final verdict

| Item | Status |
|------|--------|
| **Sitemap P0** | **Fixed in code** — deploy + revalidate required; was broken in prod at audit time |
| **Reciprocal hreflang** | **Fixed in code** — EN detail now uses `buildScholarshipDetailAlternates` |
| **Safe to continue autopilot scaling** | **Yes, after deploy** — verify detail sitemaps 200 and ES/FR counts match DB; monitor GSC sitemap errors for 24–72h |

---

## Files changed

- `lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations.ts`
- `lib/seo/sitemaps.ts`
- `app/scholarships/scholarshipSlugLayoutMetadata.ts`
- `lib/i18n/__tests__/scholarshipDetailHreflang.test.ts`
- `scripts/seo/seo-p0-p1-scholarship-detail-smoke.ts`
- `reports/seo/seo-p0-p1-scholarship-detail-sitemap-hreflang-fix-2026-05-23.md`
