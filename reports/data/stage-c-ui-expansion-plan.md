# Stage C UI expansion plan

**Follows:** Stage B static data layer (`data/external/scholarshiptop-enrichment/`, `lib/external-data/`)  
**Date:** 2026-05-31

## Goals

Ship polished, localized stat UI using the read-only enrichment layer — without Supabase writes unless a separate TZ approves import.

## 1. Compare — states

**Route:** `/compare/states/[slug]` (extend Stage B block)

- Design stat cards matching compare page visual system (i18n via `compareStateDetailUiCopy`)
- Add hub teasers on `/compare/states` using `getStateAffordability` for top states
- Optional: link to `/scholarships/[state]` from affordability block

## 2. Compare — universities

**Route:** `/compare/universities/[slug]` (extend Stage B block)

- Styled fact cards (not plain tables)
- Improve matching: join `institutions` → `unit_id` / OPEID when column available in Supabase **read** (no schema change in Stage C unless approved)
- Show OpenAlex/ROR research signal with tooltip when present
- Fallback message when match confidence is low

## 3. Resources & essays stat boxes

**Routes:** `/resources/[slug]`, `/essays/[slug]`

- Parse topic/state/city from hub metadata or article frontmatter
- Sidebar or in-article box: HUD FMR, living wage, median income
- **Policy decision:** static facts vs `seo_hub_content.cost_of_living_json` AI narrative — recommend static for numbers, AI for prose until unified policy TZ

## 4. Provider enrichment

**Route:** `/providers/[id]`

- When provider linked to institution or high-confidence school name: show Scorecard facts
- Do not overwrite provider mission/AI copy

## 5. Scholarship pages

**Routes:** `/scholarships/[state]`, `/scholarships/[state]/[university]`

- State hub: affordability summary strip (`getStateAffordability`)
- University hub: school facts + city COL via `matchSchoolForInstitution` + `getCityAffordability`
- Use `location_crosswalk` for city slug normalization

## 6. Supabase import (decision gate)

| Option | Pros | Cons |
|--------|------|------|
| Keep static JSON only | No migrations, fast deploy, matches Stage B constraints | Manual refresh on rebuild |
| Import to Supabase tables | Queryable joins, RPC reuse | Requires migration TZ, RLS review, write path |

**Recommendation:** stay static through Stage C UI; revisit Supabase import only if refresh automation or complex joins require it.

## 7. Engineering checklist

- [ ] i18n keys for all new stat labels (en/es/fr)
- [ ] Storybook or smoke route for stat components
- [ ] Extend `validate-static-enrichment.ts` in CI (optional)
- [ ] Document refresh cadence in README when data-lab pipeline re-runs
- [ ] FBI / health context copy review with trust policy

## 8. Out of scope for Stage C

- Mass SEO page generation
- Changing noindex / sitemap rules
- Payments, auth, RLS
- Copying customer package or raw dumps into repo
