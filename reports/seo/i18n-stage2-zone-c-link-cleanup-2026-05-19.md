# Stage 2 ES/FR Zone C link cleanup (2026-05-19)

Generated: 2026-05-19 (post-cleanup verification)

Base URL: `http://localhost:3000` (production build, `npx next start -p 3000`)

## Executive summary

Prominent English DB/long-tail cards and CTAs were removed from ES/FR public hub and home pages. Audit scripts now classify links into **blocking**, **allowed Zone C**, **language-switcher**, and **cross-locale-switcher** so reports are no longer misleading.

| Metric | Before cleanup | After cleanup |
|--------|----------------|---------------|
| Blocking link issues (locale-link audit) | 0 | **0** |
| Allowed Zone C links (locale-link audit) | ~734 | **454** |
| Prominent English DB card links removed (approx.) | — | **~280** |
| Language-switcher links (informational) | (mixed into Zone C / “link issues”) | **52** (26 EN + 26 cross-locale) |
| Visible-text: blocking English UI | 0 | **0** |
| Visible-text: unresolved “link issues” | 17 pages listed without classification | **0 blocking**; classified sections only |
| Nav/footer click tests | 18/18 | **18/18** |

---

## Allowed Zone C audit table (representative)

Grouped by what remains after cleanup. **Prominent card/CTA** = user-facing grid/carousel; **inline/content** = body copy or small related links; **product flow** = scholarships hub, sign-in, IQ.

| Source page | Source component | Target type | Example target | ES/FR static exists? | Visibility | Action taken |
|-------------|------------------|-------------|----------------|----------------------|------------|--------------|
| `/es`, `/fr` | `HomeResourcesAsync` → `FeaturedResourcesCarousel` | DB resource article | `/resources/scholarship-faq-low-gpa-students` | No | Prominent carousel | **Hidden** on ES/FR |
| `/es`, `/fr` | `FeaturedBrandScholarshipsSection` | DB scholarship detail | `/scholarships/generation-google-scholarship-…` | No | Prominent cards (×36) | **Hidden** on ES/FR |
| `/es/resources`, `/fr/resources` | `ResourcesGrid` | DB resource article | `/resources/verify-scholarship-emails-usa` | No | Prominent grid | **Hidden** on ES/FR |
| `/es/resources`, `/fr/resources` | `StaticScholarshipGuidesSection` | Static pilot guide | `/es/resources/how-to-find-scholarships` | Yes | Prominent static cards | **Kept** (localized) |
| `/es/essays`, `/fr/essays` | `EssaysGrid` | DB essay long-tail | `/essays/how-to-write-…` | No | Prominent grid | **Hidden** on ES/FR |
| `/es/essays`, `/fr/essays` | `EssayCommandCenter` | Static essay guide | `/es/essays/outline`, `/es/essays/checklist`, … | Yes | Prominent static cards | **Kept** (localized) |
| `/es/compare`, `/fr/compare` | `CompareCardGrid` | DB state/university compare | `/compare/states/nebraska-vs-utah` | No | Prominent grid | **Hidden** on ES/FR |
| `/es/compare`, `/fr/compare` | `EvergreenCompareGuides` | Static compare guide | `/es/compare/scholarship-vs-grant` | Yes | Prominent static cards | **Kept** (localized) |
| `/es/scholarships`, `/fr/scholarships` | Hub listing cards | DB scholarship detail | `/scholarships/climate-stripes-scholarship-14487` | No | Product listing (core) | **Allowed Zone C** (intentional) |
| `/es/providers`, `/fr/providers` | `ProvidersHubCardsGrid` | DB provider detail | `/providers/loyola-university-chicago` | No | Directory listing | **Allowed Zone C** (intentional) |
| `/es/resources/*`, `/fr/resources/*` (shell) | `LanguageSwitcher` | EN canonical / other locale | `/resources/how-to-apply-for-scholarships`, `/fr/resources/…` | Partial | Language switcher | **Classified** (not an issue) |
| `/es/essays/*` (static guides) | `StaticEssayGuidePage` related links | Product / catalog | `/essay`, `/scholarships/no-essay` | N/A | Inline related chips | **Allowed Zone C** |
| Hubs | IQ promo cards | Product | `/iq/assessment?intent=…` | N/A | Sidebar CTA | **Allowed Zone C** |
| `/es/signin/*` | Funnel | Onboarding | `/onboarding?step=1` | N/A | Auth flow | **Allowed Zone C** |

---

## Links hidden / replaced

### Hidden on ES/FR only (English unchanged)

1. **Home** (`HomePageContent.tsx`)
   - `HomeResourcesAsync` — DB resource + essay carousel (English long-tail URLs).
   - `FeaturedBrandScholarshipsSection` — 36 brand scholarship cards → English `/scholarships/<slug>`.

2. **Resources hub** (`ResourcesIndexPageContent.tsx`)
   - `ResourcesIndexToolbar`, `ResourcesGrid`, `ResourcesPagination` — DB article grid.
   - **Kept:** `StaticScholarshipGuidesSection` (localized static guides).

3. **Essays hub** (`EssaysIndexPageContent.tsx`)
   - `EssaysIndexToolbar` (when DB index would apply), `EssaysGrid`, pagination.
   - **Kept:** `EssayCommandCenter` with static guides (`/es/essays/outline`, `checklist`, `financial-need`, `career-goals`, etc.).

4. **Compare hub** (`CompareIndexPageContent.tsx`)
   - `CompareIndexToolbarClient`, `CompareCardGrid`, pagination (state/university DB battles).
   - **Kept:** `EvergreenCompareGuides` (localized evergreen compare guides).

### Replaced (already localized; no code change this pass)

- Static resource/essay/compare guide cards already use `hrefForLocalizedUiRequired` / `hrefForPath` — no English DB URLs in those sections.

---

## Pages fixed (priority list)

| Page | Change |
|------|--------|
| `/es`, `/fr` | No DB resource/essay carousel; no brand scholarship card strip |
| `/es/resources`, `/fr/resources` | No DB article grid; static guides only |
| `/es/essays`, `/fr/essays` | No DB essay long-tail grid; command center + static guides |
| `/es/compare`, `/fr/compare` | No state/university compare grid; evergreen guides only |
| `/es/resources/how-to-apply-for-scholarships` (and 4 other shells) | Language-switcher links classified separately (not “link issues”) |

---

## Remaining allowed DB links (and why)

After cleanup, **454** Zone C links remain in the full locale-link crawl (down from **734**). Typical categories:

| Category | Why allowed | Prominent? |
|----------|-------------|------------|
| `/scholarships/<slug>` from hub tabs | Core product; localized hub shell; detail pages are English DB by design | Yes (listing) — intentional |
| `/providers/<slug>` | Provider directory long-tail | Yes (listing) — intentional |
| `/essay`, `/iq/assessment`, `/onboarding` | Product flows (out of scope for Stage 2 translation) | CTA / funnel |
| `/scholarships/no-essay`, `/scholarships/stem`, etc. | Related links inside **localized static** guides | Inline, not hub cards |
| Scholarships hub geo/category chips | Catalog navigation (English paths; hub is localized wrapper) | Filters/chips |

**Not present on ES/FR after cleanup:** prominent `/resources/<db-slug>`, `/essays/how-to-write-*`, `/compare/states/*`, `/compare/universities/*` card grids on home or hub indexes.

---

## Audit classification changes

### `components/i18n/LanguageSwitcher.tsx`

- Added `data-language-switcher="true"` on nav, dropdown, listbox, and anchor elements.
- Added `data-language-switcher-locale` on anchors for reporting.

### `scripts/i18n-locale-link-audit.ts`

- `LinkIssue.severity` extended: `language-switcher`, `cross-locale-switcher`.
- `auditHref` detects switcher ancestors via `data-language-switcher`.
- Markdown summary reports Zone C vs language-switcher counts separately.

### `scripts/i18n-visible-text-audit.ts`

- `auditLinks` returns `ClassifiedLink` with `classification`: `blocking` | `allowed-zone-c` | `language-switcher` | `cross-locale-switcher`.
- Markdown sections:
  - **Pages with blocking link issues** (must be empty)
  - **Pages with allowed Zone C** (informational)
  - **Pages with language-switcher cross-locale links** (informational)
- Exit code 1 only on blocking English UI, blocking attrs, or **blocking** link issues.

---

## Final audit output

### Locale-link audit (`i18n-locale-link-audit-2026-05-19.md`)

```
Pages crawled: 118
Blocking link issues: 0
Allowed explicit English (Zone C): 454
Language-switcher cross-locale links: 52
  - to other Stage 2 locale (es ↔ fr): 26
  - to English canonical: 26
Click tests passed: 18
Click tests failed: 0
Pricing visible on /es nav: no (expected)
```

### Visible-text audit (`i18n-visible-text-audit-2026-05-19.md`)

```
Pages audited: 116
Pages with blocking English UI: 0
Pages with blocking placeholder/aria/title: 0
Pages with blocking link issues: 0
Pages with allowed Zone C (DB/long-tail) links: 52
Pages with language-switcher cross-locale links: 26
Total allowed Zone C links: 108
Total language-switcher cross-locale links: 52
```

---

## Build / test results

| Command | Result |
|---------|--------|
| `npm run build` | Pass |
| `npx tsx scripts/i18n-locale-link-audit.ts` | Exit 0 |
| `npx tsx scripts/i18n-visible-text-audit.ts` | Exit 0 |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | 47/47 pass |
| `npx tsc --noEmit` | Pass |
| Smoke: `/es`, `/fr`, hubs, static guides | HTTP 200 |

---

## What was not touched

- No git commit or push
- No new languages; no `/en` route
- No DB long-tail translation; no OpenAI / translation APIs
- No Supabase writes
- Auth, payments, subscription, Lemon, RLS, onboarding logic unchanged
- English homepage and English hub DB grids unchanged
- Scholarships hub product listing (English detail URLs from localized hub) — still Zone C by design
- Providers hub DB directory — still Zone C by design

---

## Files changed (implementation)

| File | Change |
|------|--------|
| `components/home/HomePageContent.tsx` | Hide carousel + brand cards on ES/FR |
| `components/content-hub/ResourcesIndexPageContent.tsx` | Hide DB grid on ES/FR |
| `components/essays/EssaysIndexPageContent.tsx` | Hide DB grid + toolbar on ES/FR |
| `components/compare/CompareIndexPageContent.tsx` | Hide DB compare grid on ES/FR |
| `components/i18n/LanguageSwitcher.tsx` | `data-language-switcher` markers |
| `scripts/i18n-locale-link-audit.ts` | Switcher severity + summary |
| `scripts/i18n-visible-text-audit.ts` | Classified link reporting |
