# ScholarshipTop static enrichment data (Stage A)

These four JSON files are **read-only static data** produced by the Stage A pipeline in `scholarshiptop-data-lab`:

`C:\dev\scholarshiptop-data-lab\stage-a-static-data-pipeline`

## What this is

- A small, typed enrichment layer for compare pages, scholarship hubs, and future stat blocks
- **Not** stored in Supabase — loaded at build/runtime on the server only
- **Not** a copy of the MedResidency customer package or raw source dumps

## Files

| File | Rows | Purpose |
|------|------|---------|
| `school_enrichment.json` | 6,197 | College Scorecard + optional OpenAlex/ROR joins |
| `state_affordability.json` | 52 | Census ACS, HUD FMR, MIT living wage, BLS, FBI aggregate context |
| `city_affordability.json` | 2,759 | City-level affordability (HUD uses state metro averages when city FMR unavailable) |
| `location_crosswalk.json` | 2,704 | City/state/county join keys |

Total on-disk size is about **4.88 MB**.

## Regenerating

Rebuild from data-lab (requires permission to read the customer package on the build machine):

```bash
cd C:\dev\scholarshiptop-data-lab\stage-a-static-data-pipeline
python 02_working/build_stage_a.py
```

Then copy only the four outputs from `03_outputs/` into this folder and re-run:

```bash
npx tsx scripts/data/validate-static-enrichment.ts
```

## Usage in the site

Import helpers from `@/lib/external-data` in **server components or scripts only** — do not import in client components (bundle size).

See `reports/data/stage-b-static-enrichment-integration-report.md` for integration status.
