# Stage 5E-7 — Autopilot title/sitemap eligibility audit (2026-05-23)

## Final verdict

| Question | Answer |
|----------|--------|
| Title/sitemap gap fixed? | **Yes** (code fix; deploy + revalidate required for live sitemap 616) |
| Safe to run Wave 11? | **Yes** after deploy of this fix and post-deploy sitemap verify |
| Production title backfill? | **Not needed** (0 rows with empty `translated_title`) |

---

## 1. DB audit — empty `translated_title`

Filter: `scholarship_detail`, `es`/`fr`, `published`, `machine_model` like `stage5e-scholarship-autopilot-wave-%`, empty title.

| Metric | Count |
|--------|------:|
| Affected rows | **0** |
| ES | 0 |
| FR | 0 |

**Conclusion:** The 5E-6 handoff hypothesis (empty `translated_title`) was **incorrect** for autopilot rows. Titles are populated with the official catalog name (same as generator).

---

## 2. Real root cause — sitemap list pagination

| Metric | Before fix | After fix (local) |
|--------|------------|-------------------|
| Published ES rows (DB) | 616 | 616 |
| `listPublishedScholarshipDetailTranslations` ES | **499** | **616** |
| Gap | **117** | **0** |

**Cause:** `listPublishedScholarshipDetailTranslations()` loaded `content_translations` in a **single query** without pagination. PostgREST returns at most **1000 rows**; with 616 ES + 616 FR = **1232** published rows, the tail (~232 rows) was dropped. Those rows skewed to newer autopilot waves (**7, 8, 9**), which looked like a “title” or “eligibility” problem.

**Not the cause:** empty `translated_title`, missing body, or generator omitting the field.

Sample gap slug (wave 8) had full title + body; excluded only because it was beyond the 1000-row cap.

---

## 3. Why Wave 1–10 smoke passed

- Route checks use direct DB-backed gates → **200** for published rows.
- Post–5E-6 smoke compared counts to **sitemap-eligible** totals that used the same truncated list (499), so counts “matched” while ~117 published scholarships were missing from XML.
- Per-slug sitemap XML checks were limited to eligible/listed slugs after hardening.

---

## 4. Fix applied (no DB backfill)

### Code

1. **`lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations.ts`** — paginate `content_translations` in pages of 1000 until exhausted.
2. **Generator hardening** — reject empty `translated_title` in `validateScholarshipPilotSeedRows`, `generate-overlays`, and seed builder (`officialTitle.trim() || slug`).
3. **`scripts/i18n/scholarship-detail-autopilot/backfill-translated-titles.ts`** — dry-run by default; **0 rows** to update (kept for future safety).

### Backfill

| Step | Result |
|------|--------|
| Dry-run | **0** rows would change |
| Production write | **Skipped** (nothing to backfill) |

---

## 5. Sitemap before / after

| | ES | FR |
|---|----|----|
| Live before 5E-7 deploy | 499 | 501 |
| Expected after deploy + revalidate | **616** | **616** |

After local fix, eligibility audit shows **616/616** alignment. Live XML will catch up once this commit is deployed and detail sitemaps are revalidated (`revalidate-detail-sitemaps.ts`).

---

## 6. Tests / smoke

| Gate | Result |
|------|--------|
| `npm run build` | PASS |
| `npx tsc --noEmit` | PASS |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | PASS (93 tests) |
| `backfill-translated-titles.ts` (dry-run) | 0 affected |
| `audit-all-sitemap-gap.ts` | gap **0** post-fix |

---

## 7. Rollback

**No DB changes made.** Rollback N/A.

If pagination fix is reverted, only code deploy rollback is needed.

---

## 8. Wave 11 readiness

**Safe to proceed** after:

1. Deploy this commit to production.
2. `npx tsx scripts/i18n/scholarship-detail-autopilot/revalidate-detail-sitemaps.ts`
3. Confirm live `locale-*-scholarships-detail-db.xml` counts ≈ **616** each.
4. Optional: `npx tsx scripts/i18n/scholarship-detail-autopilot/run-autopilot.ts --smoke-only-wave=10`

Do **not** run Wave 11 until live sitemap shows full published eligible set.

---

## Artifacts

- `scripts/i18n/scholarship-detail-autopilot/audit-empty-translated-titles.ts`
- `scripts/i18n/scholarship-detail-autopilot/audit-all-sitemap-gap.ts`
- `scripts/i18n/scholarship-detail-autopilot/backfill-translated-titles.ts`
- `reports/seo/i18n-stage5e-7-empty-title-audit-2026-05-23.md`
- `reports/seo/i18n-stage5e-7-sitemap-gap-audit-2026-05-23.md`
