# Stage C3 preflight

**Date:** 2026-05-31  
**Stage:** C3 — localized routes + richer resource/essay context mapping  
**Production base:** https://scholarshiptop.com

---

## Current HEAD

```
9bd739f feat(data): expand static enrichment to site sections
```

Recent commits on `origin/main`:

| Hash | Message |
|------|---------|
| `9bd739f` | `feat(data): expand static enrichment to site sections` |
| `02027a3` | `feat(compare): polish external enrichment cards` |
| `05d1b56` | `feat(compare): add static external enrichment data` |

---

## Dirty unrelated files (do not stage for C3)

Working tree contains unrelated changes outside C3 scope:

- `lib/i18n/homePageCopy.ts`, `scholarshipsFilterPanelsUiCopy.ts`, `scholarshipsMoreFiltersUiCopy.ts`
- `reports/seo/*` (i18n autopilot reports)
- `data/content/*`, `.env.local.*`, `.cursor/settings.json`
- `reports/data/stage-c2-post-deploy-smoke.md` (untracked smoke from C2 deploy)

**C3 commit must stage only:** scoped `lib/external-data/*`, content/provider components, scoped `app/*` and `app/[locale]/*` wiring, `reports/data/stage-c3-*.md`.

---

## Stage C2 smoke reference

From `reports/data/stage-c2-post-deploy-smoke.md` — **PASS** on commit `9bd739f`:

- Compare hubs: C2 teasers live
- Providers Loyola/Tarleton: context cards with correct college match
- Generic resources/essays: cards correctly hidden
- Compare detail C1 regression: OK
- Rollback: **No**

---

## Data validation result

Command: `npm run data:validate-enrichment`

**Result: PASS**

```
OK: 6197 school / 52 state / 2759 city / 2704 crosswalk rows
OK: 4.88 MB total
WARN: documented duplicate keys only
Validation passed.
```

No new data sources. Existing package unchanged.

---

## Planned scope — no Supabase / Auth / Payments

| Area | C3 plan |
|------|---------|
| Supabase schema / writes | **No changes** |
| RLS / Auth / Payments | **Untouched** |
| robots / canonical / noindex | **No policy changes** |
| New data sources | **None** |
| Migrations | **None** |
| Locale routing | **Preserve existing pilot locale gates** |

---

## Preflight verdict

**GO** — C2 production baseline confirmed, validation PASS, C3 scoped to resolver + localized wiring only.
