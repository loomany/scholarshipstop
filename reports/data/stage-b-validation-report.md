# Stage B validation report

**Date:** 2026-05-31  
**Command:** `npx tsx scripts/data/validate-static-enrichment.ts`  
**npm script:** `npm run data:validate-enrichment`

## Results

| Check | Status |
|-------|--------|
| All 4 JSON readable | pass |
| Row counts vs MANIFEST | pass |
| `school_enrichment` unit_id duplicates | 0 |
| `school_enrichment` name+state duplicates | 40 keys (warn only — multiple campuses / naming variants) |
| `state_affordability` state_code duplicates | 0 |
| `city_affordability` city+state duplicates | 1 (`Bayamón\|PR`, documented in Stage A) |
| `location_crosswalk` location_key duplicates | 0 |
| Total size < 15 MB | pass (4.88 MB) |
| Secrets-like strings | none |
| `C:\dev\adek` paths in JSON | none (after meta sanitization on copy) |

## Row counts

| File | Expected | Actual |
|------|----------|--------|
| school_enrichment.json | 6197 | 6197 |
| state_affordability.json | 52 | 52 |
| city_affordability.json | 2759 | 2759 |
| location_crosswalk.json | 2704 | 2704 |

## Typecheck / build

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **pass** (exit 0) |
| `npm run build` | not run (full build skipped; typecheck sufficient for Stage B) |

## Duplicate notes

- **School name+state:** 40 duplicate keys are mostly multi-campus or renamed institutions sharing a display name in Scorecard (e.g. multiple beauty colleges). Lookup uses first indexed row; Stage C may add OPEID/unit_id joins from Supabase institutions.
- **City Bayamón, PR:** single documented duplicate from Stage A pipeline.

## Exit code

Validation script exit code: **0** (passed with warnings).
