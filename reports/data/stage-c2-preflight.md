# Stage C2 preflight

**Date:** 2026-05-31  
**Stage:** C2 — extend static enrichment to providers, resources, essays, compare hubs  
**Production base (C1):** https://scholarshiptop.com

---

## Current HEAD

```
02027a3 feat(compare): polish external enrichment cards
```

Prior enrichment commits on `origin/main`:

| Hash | Message |
|------|---------|
| `05d1b56` | `feat(compare): add static external enrichment data` |
| `02027a3` | `feat(compare): polish external enrichment cards` |

---

## Dirty unrelated files (do not stage for C2)

Working tree contains many unrelated changes outside C2 scope, including:

- `lib/i18n/homePageCopy.ts`, `scholarshipsFilterPanelsUiCopy.ts`, `scholarshipsMoreFiltersUiCopy.ts`
- `reports/seo/*` (i18n autopilot, stage reports, GSC audits)
- `data/content/*`, `lib/content-hub/*` polish scripts
- `.env.local.bak-stage4d`, `.env.local.prod-backup`, `.cursor/settings.json`

**C2 commit must stage only:** `lib/external-data/*`, `components/compare/*`, `components/providers/*`, `components/resources/*`, `components/essays/*`, `components/content-hub/ExternalReferenceContextCard.tsx`, scoped `app/*` page wiring, and `reports/data/stage-c2-*.md`.

---

## Data validation result

Command: `npm run data:validate-enrichment`

**Result: PASS**

```
OK: school_enrichment.json: 6197 rows
OK: state_affordability.json: 52 rows
OK: city_affordability.json: 2759 rows
OK: location_crosswalk.json: 2704 rows
OK: total data size 4.88 MB (< 15 MB)
WARN: school name+state duplicate keys: 40 (documented)
WARN: city_affordability city+state duplicate keys: 1 (Bayamón|PR — Stage A)
Validation passed.
```

No new data sources added. Existing package: `data/external/scholarshiptop-enrichment/`.

---

## Stage C1 live smoke reference

From `reports/data/stage-c1-post-deploy-smoke.md` — **PASS** on commit `02027a3`:

| URL | Status |
|-----|--------|
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 |
| `/compare/states/california-vs-texas` | 200 |
| `/compare/states/nebraska-vs-utah` | 200 |
| `/compare/universities` | 200 |
| `/compare/states` | 200 |

Compare detail enrichment UI (C1 cards) verified live. Hub pages had no enrichment teasers pre-C2.

---

## Planned scope — no Supabase / Auth / Payments

| Area | C2 plan |
|------|---------|
| Supabase schema | **No changes** |
| Supabase writes | **None** |
| RLS / Auth | **Untouched** |
| Payments / billing | **Untouched** |
| robots / canonical / noindex | **No policy changes** |
| New data sources | **None** |
| Migrations | **None** |

C2 uses server-only reads from static JSON via `lib/external-data/` helpers.

---

## Preflight verdict

**GO** — validation PASS, C1 production baseline confirmed, C2 scoped to server components and helpers only.
