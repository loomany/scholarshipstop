# Stage B final QA and commit prep

**Date:** 2026-05-31  
**Scope:** static enrichment data layer + compare detail integration  
**Push:** not performed (per instructions)

---

## 1. Automated checks

| Check | Command | Result |
|-------|---------|--------|
| Data validation | `npm run data:validate-enrichment` | **PASS** (exit 0; 2 documented WARNs: 40 school name+state dup keys, 1 city dup) |
| Typecheck | `npx tsc --noEmit` | **PASS** (exit 0) |
| Production build | `npm run build` | **PASS** (exit 0; 206 static pages generated) |

Build notes:

- `/compare/states/[slug]` First Load JS: **247 kB** (unchanged order of magnitude)
- `/compare/universities/[slug]` First Load JS: **321 kB**
- No webpack errors; lint + types checked during build

---

## 2. Bundle / client risk audit

| Item | Finding |
|------|---------|
| JSON imports | Only in `lib/external-data/loadStaticEnrichment.ts` (direct `@/data/external/...json` imports) |
| `server-only` | Present on all `lib/external-data/*` loader/index modules |
| Client imports of `@/lib/external-data` | **None** — only `CompareExternalStateAffordabilitySection.tsx` and `CompareExternalSchoolEnrichmentSection.tsx` |
| `'use client'` on CompareExternal components | **No** — server components |
| Page bodies importing enrichment | Server-only async components (`stateCompareDetailPageBody.tsx`, `universityCompareDetailPageBody.tsx`) |
| Client bundle bloat (~4.88 MB JSON) | **Not observed** — JSON stays in server chunks; compare route JS sizes normal |

**Conclusion:** client bundle risk is **low** for Stage B as implemented.

---

## 3. Local page smoke

Dev server: `npm run dev` on `localhost:3000`

| Route | HTTP | Enrichment block | Visible garbage |
|-------|------|------------------|-----------------|
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | **200** | **Yes** — tuition, admission/completion, earnings, student size for both schools | **No** (`>undefined<` / `>null<` not in visible HTML) |
| `/compare/states/nebraska-vs-utah` | 500 (dev) | Not reached in dev | N/A |
| `/compare/states/california-vs-texas` | 500 (dev) | Not reached in dev | N/A |

University sample rendered correctly, e.g. UMass in-state **$17,772**, USF **$6,410**, formatted percentages and counts.

**State compare dev 500:** server log shows `TypeError: Cannot read properties of null (reading 'useContext')` in Next.js `LinkComponent` / error boundary — **not** in `CompareExternalStateAffordabilitySection` (no `Link` in that component). Same class of dev SSR error appears on other routes during session. **Production build passes** and route is compiled; treat as **dev-environment / pre-existing SSR noise**, not a Stage B build blocker. Recommend post-deploy smoke on production for state compare URLs.

Static data sanity (offline): NE HUD FMR 2BR **$1,145**, UT **$1,283** — data file readable.

---

## 4. Safety boundaries

| Area | Changed? |
|------|----------|
| Supabase schema | **no** |
| Migrations | **no** |
| RLS / Auth / Payments | **no** |
| MedResidency package copied | **no** |
| Unrelated i18n / SEO reports | **not part of this commit** |

---

## 5. Git state (commit scope)

### Stage B files to stage (recommended)

```
app/compare/states/stateCompareDetailPageBody.tsx
app/compare/universities/universityCompareDetailPageBody.tsx
components/compare/CompareExternalStateAffordabilitySection.tsx
components/compare/CompareExternalSchoolEnrichmentSection.tsx
data/external/scholarshiptop-enrichment/
lib/external-data/
scripts/data/validate-static-enrichment.ts
package.json
reports/data/stage-b-static-data-preflight.md
reports/data/stage-b-page-integration-audit.md
reports/data/stage-b-validation-report.md
reports/data/stage-b-static-enrichment-integration-report.md
reports/data/stage-b-final-qa-and-commit-prep.md
reports/data/stage-c-ui-expansion-plan.md
```

### Modified diff stat (Stage B tracked files only)

```
 app/compare/states/stateCompareDetailPageBody.tsx            | 9 +++++++++
 app/compare/universities/universityCompareDetailPageBody.tsx | 7 +++++++
 package.json                                                 | 1 +
 3 files changed, 17 insertions(+)
```

(+ all new untracked paths above)

### Do NOT stage (unrelated dirty/untracked)

- `lib/i18n/homePageCopy.ts`, `scholarshipsFilter*UiCopy.ts`
- `reports/seo/*` (autopilot / i18n work)
- `.env.local.*`, `.cursor/settings.json`, content drafts, etc.

---

## 6. Risks (accepted for commit)

| Risk | Severity | Mitigation |
|------|----------|------------|
| School match by name+state only | medium | Section hidden when no match; Stage C unit_id join |
| 40 duplicate school name+state keys | low | Documented in validation WARN |
| State compare not smoke-tested live in dev | low | Build pass + component has null-safe formatters; prod smoke after deploy |
| New stat blocks English-only | low | Stage C i18n plan |
| NV negative median income in source | low | `isPlausibleHouseholdIncome` hides bad values in UI |

---

## 7. Ready to commit?

**Yes** — with scoped staging only (Stage B files above).

| Criterion | Met |
|-----------|-----|
| Data validation pass | yes |
| Typecheck pass | yes |
| Build pass | yes |
| No Supabase/migrations/Auth/Payments changes | yes |
| No push | yes (not done) |
| Report created | yes |

---

## 8. Proposed commit message (NOT committed — awaiting approval)

```
feat(compare): add static external enrichment data

Add Stage A JSON outputs as a read-only server-side data layer with typed
helpers, validation script, and affordability/school fact blocks on compare
state and university detail pages. No Supabase or payment changes.
```

### Suggested staging command (when approved)

```bash
git add \
  app/compare/states/stateCompareDetailPageBody.tsx \
  app/compare/universities/universityCompareDetailPageBody.tsx \
  components/compare/CompareExternalStateAffordabilitySection.tsx \
  components/compare/CompareExternalSchoolEnrichmentSection.tsx \
  data/external/scholarshiptop-enrichment \
  lib/external-data \
  scripts/data/validate-static-enrichment.ts \
  package.json \
  reports/data/stage-b-static-data-preflight.md \
  reports/data/stage-b-page-integration-audit.md \
  reports/data/stage-b-validation-report.md \
  reports/data/stage-b-static-enrichment-integration-report.md \
  reports/data/stage-b-final-qa-and-commit-prep.md \
  reports/data/stage-c-ui-expansion-plan.md
```

Then:

```bash
git commit -m "$(cat <<'EOF'
feat(compare): add static external enrichment data

Add Stage A JSON outputs as a read-only server-side data layer with typed
helpers, validation script, and affordability/school fact blocks on compare
state and university detail pages. No Supabase or payment changes.
EOF
)"
```

**Do not push** until separately approved.
