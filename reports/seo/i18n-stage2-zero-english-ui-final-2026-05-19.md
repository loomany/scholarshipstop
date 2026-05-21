# i18n Stage 2 — zero blocking English UI (final)

**Date:** 2026-05-19  
**Scope:** Stage 2 pilot (`es`, `fr`) public pages only. No commits, no new languages, no API/Supabase/auth changes, no long-tail scholarship/provider record translation.

## Acceptance summary

| Check | Result |
|-------|--------|
| Visible-text audit (`SCREENSHOT_BASE_URL=http://localhost:3001`) | **0** pages with blocking English UI (106/106) |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **45/45** pass |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| SEO (canonical/hreflang/sitemap/noindex) | Unchanged — copy-only UI wiring |

Audit artifacts: `reports/seo/i18n-visible-text-audit-2026-05-19.json`, `reports/seo/i18n-visible-text-audit-2026-05-19.md`.

---

## Remaining English hits (non-blocking)

### Allowlisted / intentional

- **Brand & product:** ScholarshipTop, IQ, Essay Mentor (product name where kept)
- **Acronyms / tests:** STEM, FAFSA, GPA, SAT, ACT, USD
- **Proper nouns:** University names, state names, provider names, scholarship titles in listings
- **Field-of-study slugs** in More Filters (English catalog slugs; school level / eligibility / requirements / easy-apply options localized)
- **Citizenship option labels** from shared onboarding constants (not expanded in this pass)
- **Country names** in filter lists via `Intl.DisplayNames(['en'])` (geographic proper names)

### Link audit (30 pages) — not visible UI

Pilot pages still contain **English-path links** to individual scholarship/provider detail URLs and some in-content `/scholarships/...` anchors. These are **out of scope** (no long-tail translation; `hrefForLocalizedUi` not applied to dynamic catalog slugs). They do **not** count as blocking visible English in the audit script.

---

## Fixed components (this pass)

### Dictionaries extended

- `lib/i18n/hubUiCopy.ts` — compare toolbar + grid IQ, providers grid IQ, country options, empty states, `showingProviders` with query/state/country
- `lib/i18n/hubIqPromoByHub.ts` — compare/providers sidebar IQ promos
- `lib/i18n/staticCompareGuideCards.ts` — evergreen compare cards via pilot static pages
- `lib/i18n/scholarshipsFilterPanelsUiCopy.ts` — citizenship / study-destination panels
- `lib/i18n/scholarshipsMoreFiltersUiCopy.ts` — full More Filters modal
- `lib/i18n/scholarshipsHubUiCopy.ts` — `inlineIq` for hub listing IQ card
- `lib/i18n/homePageCopy.ts` — homepage preview “Matches for you” / “New”

### Wired UI

| Area | Change |
|------|--------|
| **Compare hub** | `CompareIndexPageContent` — IQ card, evergreen guides, toolbar, empty message; `CompareIndexToolbar`, `CompareCardGrid` |
| **Providers hub** | `ProvidersHubPageContent` — IQ, showing line, empty states, toolbar; `ProvidersHubToolbar`, `ProvidersHubCardsGrid` |
| **Scholarships hub** | `ScholarshipsListHeader` filter panels; `ScholarshipsMoreFiltersPanel`; `ScholarshipsHubPageClient` passes `uiCopy` / `filterPanelsCopy` / `moreFiltersUi`; catalog intro `quickLinks` in `scholarshipsSlugPathPageBody` |
| **Scholarship IQ inline** | `ScholarshipIqInlineCard` + `hubUi.inlineIq` |
| **Homepage demo** | `ScholarshipsSidebarPreview`, `ScholarshipPreviewList` localized sidebar + header |
| **Loading shell** | `ScholarshipsHubShellSkeleton` sidebar title uses `sidebarUi` |
| **Shared** | `components/i18n/HubIqPromoAssessmentCard.tsx` |
| **Nav** | Mobile essay submenu `aria-label`s localized (`Navlinks.tsx`) |

---

## Before / after examples

| Location | Before (EN on `/es`) | After (ES) |
|----------|----------------------|------------|
| Compare IQ sidebar | “Compare schools. Understand yourself first.” / “Start IQ test” | “Compara universidades. Conócete primero.” / “Iniciar prueba IQ” |
| Providers showing line | “Showing 1-20 of 1,234 providers” | “Mostrando 1-20 de 1.234 proveedores” |
| Catalog intro chips | “No essay scholarships”, “Easy apply scholarships”, … | “Becas sin ensayo”, “Becas de solicitud fácil”, … |
| More Filters title | “More Filters” | “Más filtros” |
| Country filter panel | “Loading country filters...” / “Show scholarships” | “Cargando filtros de país...” / “Mostrar becas” |
| Homepage preview sidebar | “My scholarships”, “Hot Deadlines” | “Mis becas”, “Fechas urgentes” |

---

## Audit result summary

- **Base URL:** `http://localhost:3001` (dev server; port 3000 was in use)
- **Pages audited:** 106 (`STAGE2_PILOT_CANONICAL_PATHS` × `es` + `fr`)
- **Blocking English UI:** **0** (was **4**: `/es`, `/fr`, `/es/scholarships`, `/fr/scholarships`)
- **Errors:** 0

Final blockers were homepage/scholarships **loading preview** and **mobile nav aria-labels**, not hub toolbars.

---

## Build / test results

```
npx tsx --test lib/i18n/__tests__/*.test.ts  → 45/45 pass
npx tsc --noEmit                             → pass
npm run build                                → pass
```

---

## What was not touched

- Auth, payments, Lemon Squeezy, subscription, RLS, onboarding flows
- Individual scholarship/provider/compare battle page body copy (long-tail)
- `hreflang` / canonical / sitemap generation logic
- OpenAI or other translation APIs
- English default routes (`/scholarships`, `/compare`, …) — behavior unchanged
- Resource guide in-page CTAs inside `ResourceGuideShell` (English defaults on non-pilot EN routes only; pilot static pages use localized templates where already wired)

---

## Known allowed English terms (audit allowlist)

`ScholarshipTop`, `IQ`, `STEM`, `FAFSA`, `USD`, `GPA`, `SAT`, `ACT`, `MIT`, `Harvard`, `Google`, `Microsoft`, `scholarshiptop.com`

---

## Follow-up (optional, out of scope)

1. Localize in-content scholarship/provider links on pilot static articles via `hrefForLocalizedUi` where paths are pilot-canonical.
2. Localize `ResourceGuideShell` default CTA strings when used on localized resource guides.
3. Country display names with `Intl.DisplayNames([locale])` in filter panels.
4. Run audit against `http://localhost:3000` when that is the active dev port.
