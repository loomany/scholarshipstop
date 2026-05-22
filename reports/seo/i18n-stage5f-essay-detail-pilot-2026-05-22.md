# Stage 5F — Essay detail pilot — 2026-05-22

## Status: **not implemented**

## Current behavior

- EN: `app/essays/[slug]/page.tsx` (static + dynamic essays).
- ES/FR: No `app/[locale]/essays/[slug]` route; long-tail essay returns **404** on `/es/essays/…` (verified).
- Stage 2 static essay hubs (`/essays/checklist`, etc.) use UI translation, not DB.

## Planned pilot (max 3 × ES/FR = 6 rows)

1. `how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america`
2. TBD evergreen #2
3. TBD evergreen #3

## Required before seed

- `source_type`: confirm `essay_guide` (or architecture doc type).
- Route gate: 404 without published translation; no English fallback.
- `detailLanguageSwitcher`: add published slug set (mirror scholarship pattern).
- Dry-run seed script (not present).

## Production write

None.
