# Stage C4 preflight

**Date:** 2026-05-31  
**Stage:** C4 — scholarship pages static enrichment sidebars  
**Production base:** https://scholarshiptop.com

---

## Current HEAD

```
7e083d0 feat(data): extend enrichment context to localized content
```

Recent commits on `origin/main`:

| Hash | Message |
|------|---------|
| `7e083d0` | `feat(data): extend enrichment context to localized content` |
| `9bd739f` | `feat(data): expand static enrichment to site sections` |
| `02027a3` | `feat(compare): polish external enrichment cards` |
| `05d1b56` | `feat(compare): add static external enrichment data` |

---

## Stage C3 smoke reference

**PASS** (manual production check post-`7e083d0`):

- Generic resource/essay pages hide cards
- Texas resource shows state context
- Provider strict match (Loyola/Tarleton show; Alamo foundation hidden)
- Localized `es`/`fr` routes work
- `/ru/` → 404 (expected — not a pilot locale)

---

## Dirty unrelated files (do not stage for C4)

- `lib/i18n/*` modifications
- `reports/seo/*`
- `data/content/*`, `.env.local.*`, `.cursor/settings.json`
- `reports/data/stage-c2-post-deploy-smoke.md` (untracked)

**C4 commit scope:** scholarship sidebar components, `scholarshipPageEnrichment.ts`, `scholarshipsSlugPathPageBody.tsx`, `UniversityHubPageContent.tsx`, `lib/external-data/index.ts`, `reports/data/stage-c4-*.md` only.

---

## Data validation result

Command: `npm run data:validate-enrichment`

**Result: PASS** — 6197/52/2759/2704 rows, 4.88 MB, documented WARN only.

---

## Planned scope — no Supabase / Auth / Payments / SEO policy

| Area | C4 plan |
|------|---------|
| Supabase schema / writes | **No changes** |
| RLS / Auth / Payments | **Untouched** |
| robots / canonical / noindex | **No changes** |
| sitemap | **No changes** |
| Scholarship ranking/listing queries | **No changes** |
| New data sources | **None** |

---

## Preflight verdict

**GO** — C3 production baseline confirmed, validation PASS, C4 scoped to server sidebars only.
