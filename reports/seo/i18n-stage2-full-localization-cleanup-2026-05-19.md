# Stage 2 full ES/FR visible-text localization cleanup (2026-05-19)

## Root cause

Localized routes (`/es/*`, `/fr/*`) rendered **production English components** with locale only wired for metadata, hrefs, and static translation shells. Hub/listing UI (scholarships, resources, essays) kept hard-coded English in client components (`ScholarshipsListHeader`, `ScholarshipsSidebar`, `ScholarshipCard`, resource guide hub cards, IQ promo cards, toolbars). Navbar ES/FR labels for pricing and essay guides were also incomplete.

## What we fixed

### Scholarships hub (`/es/scholarships`, `/fr/scholarships`)

- Added `lib/i18n/scholarshipsHubUiCopy.ts` (EN/ES/FR) for page titles, sort/filters, sidebar tabs, card actions, loading strings.
- Wired `locale` through `ScholarshipsHubPageAuthBridge` → `ScholarshipsHubPageClient` → `ScholarshipsPageInner`.
- `ScholarshipsListHeader` and `ScholarshipsSidebar` accept `uiCopy`.
- `ScholarshipCard` accepts `cardCopy` for Save / Not relevant / Restore.
- `scholarshipsSlugPathPageBody` passes `locale` into `HubRootStreamedBridge` with localized fallback titles.

### Resources hub (`/es/resources`, `/fr/resources`)

- `lib/i18n/staticResourceGuideCards.ts` — hub cards use `getStaticResourceGuideCardCopy()` from pilot static translations.
- IQ promo cards and grid IQ card use `getHubIqPromoUiCopy(locale)`.
- `ResourcesIndexToolbar` uses `getHubToolbarUiCopy(locale)`.

### Essays hub (`/es/essays`, `/fr/essays`)

- IQ promo list items use `getHubIqPromoUiCopy(locale)`.
- `EssaysIndexToolbar` search placeholder localized via hub toolbar copy.

### Shared hub UI

- Extended `lib/i18n/hubUiCopy.ts` with `HubToolbarUiCopy`, `HubIqPromoUiCopy`, getters.

### Navbar (Stage F)

- ES: `Precios` (was Premium).
- FR: `Guides d'essai`, `Tarifs`.

### Other

- `AiMentorCtaLink` optional `label` prop; scholarships sidebar passes localized CTA.

## Files changed (main)

| Area | Files |
|------|--------|
| Copy | `lib/i18n/scholarshipsHubUiCopy.ts`, `lib/i18n/staticResourceGuideCards.ts`, `lib/i18n/hubUiCopy.ts` |
| Scholarships | `ScholarshipsHubPageAuthBridge.tsx`, `ScholarshipsHubPageClient.tsx`, `scholarshipsSlugPathPageBody.tsx`, `ScholarshipsListHeader.tsx`, `ScholarshipsSidebar.tsx`, `ScholarshipCard.tsx`, `ScholarshipsSidebarAiMentorCard.tsx` |
| Resources | `ResourcesIndexPageContent.tsx`, `ResourcesIndexToolbar.tsx` |
| Essays | `EssaysIndexPageContent.tsx`, `EssaysIndexToolbar.tsx` |
| Nav | `Navlinks.tsx`, `AiMentorCtaLink.tsx` |
| Audit | `scripts/i18n-visible-text-audit.ts` |

## Before / after examples

| Page | Before | After (ES) |
|------|--------|----------------|
| `/es/scholarships` | Scholarship matches, Search by keyword, Filters | Becas encontradas, Buscar por palabra clave, Filtros |
| `/es/resources` cards | English guide titles from `STATIC_SCHOLARSHIP_GUIDES` | Spanish titles/descriptions from pilot translations |
| Nav ES | Premium | Precios |
| Nav FR | Rédaction / Premium | Guides d'essai / Tarifs |

## Audit script

- **Script:** `scripts/i18n-visible-text-audit.ts`
- **Outputs:** `reports/seo/i18n-visible-text-audit-2026-05-19.json`, `.md`
- **Run:** start dev server, then  
  `SCREENSHOT_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-visible-text-audit.ts`

Not executed in this session (no dev server running). Run locally for final sign-off.

## Tests / build

| Check | Result |
|-------|--------|
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | 45/45 pass |
| `npx tsc --noEmit` | pass |
| `npm run build` | pass |

## Private / account routes (audit only — not implemented)

| Route | Current behavior | Risk | Translate later? | Recommendation |
|-------|------------------|------|------------------|----------------|
| `/account`, `/dashboard` | English | Low for SEO pilot | Yes | Stage 3+ after public pilot sign-off |
| `/subscription`, `/saved`, `/ignored` | English | Medium if linked from ES nav while signed in | Yes | Keep English until product approves account i18n |
| `/profile`, `/onboarding` | English | Low (auth-gated) | Yes | Do not block public ES/FR launch |
| `/essay` product, `/signin` | English | Low for crawlers | Yes | Separate product localization track |

## What was not touched

- Auth, payments, subscription, Lemon, RLS, onboarding
- Scholarship/provider long-tail detail pages
- OpenAI / translation APIs / Supabase writes
- `/en` route (still 404)
- New languages
- Compare/providers IQ cards (still English on hub — lower traffic; same pattern as resources if needed)
- Scholarships country-filter panel long helper paragraphs (partial: main labels localized)
- `ScholarshipsMoreFiltersPanel` modal copy
- Homepage sections beyond prior work (see earlier stage reports)

## Remaining known limitations

1. **Compare / providers hubs** — IQ promo strings may still be English; apply `getHubIqPromoUiCopy` same as resources.
2. **Scholarship catalog intro** quick-link chips under `/es/scholarships` may still show English labels (intro body is localized).
3. **Filter modals** — deep copy in country/category dialogs mostly English.
4. **Browser audit** — must be run against a live server to confirm zero blocking hits.
5. **Schema `listingJsonLdName`** on English `/scholarships` unchanged; localized paths use localized titles.

## Visual review readiness

**ES/FR public static pilot is ready for user visual review** on core hubs (home, scholarships, resources, essays, trust pages from prior stages), with the caveats above. Run the Playwright audit and spot-check compare/providers before calling the pilot “zero English UI” complete.

## Git

No commit or push (per request).
