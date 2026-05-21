# i18n ES/FR Stage 2 — Final pre-push audit (2026-05-19)

**Status: READY for push** — 0 blocking issues across all required audits.

Audited against locally-built production server (`npx next start -p 3000`) on
`http://localhost:3000`. No commits or pushes were made in this run.

## 1. Summary

| Audit | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **50 / 50 pass** (3 new switcher tests) |
| `npm run build` | PASS — `Compiled successfully` |
| `i18n-locale-link-audit.ts` | **0 blocking link issues** (118 pages crawled, 18/18 click tests pass) |
| `i18n-visible-text-audit.ts` | **0 blocking English UI, 0 blocking link issues** (116 pages) |
| `i18n-language-switcher-audit.ts` | **48 / 48 pages pass**, 0 blocking, 1 intentionally English-only |
| Smoke 200 (20 URLs) | All `200` |
| Smoke 404 (9 unsupported locales) | All `404` (`/en`, `/de`, `/pt`, `/ar`, `/zh-Hans`, `/hi`, `/id`, `/vi`, `/ru`) |

## 2. Git status (clean of forbidden files)

`git status --short` returned only:

- Source files under `app/**`, `components/**`, `lib/**`, `middleware.ts` — all Stage 2 i18n changes from this and prior chats.
- New tracked dirs: `app/[locale]/`, `components/i18n/`, `components/legal/`, `lib/i18n/`, `lib/server/`.
- `scripts/i18n-*-audit.ts` (audit tooling) and `reports/seo/*.md` / `.json`.
- `docs/multilingual-seo-architecture.md`.

Scanned for blocked patterns (`.env`, `secret`, `credentials`, `*.key`, `api_key`, `.log`) — **none found**.

`git diff --stat` shows **87 files changed, 2486 insertions(+), 3247 deletions(-)** (net deletions because home/hub page bodies were extracted into shared `components/.../*PageContent.tsx`).

**Diff scope sanity-check:**

- `middleware.ts` (+11 lines): only adds `x-scholarshiptop-locale` request header forwarding when path starts with a Stage 2 locale. **No auth, no Supabase, no payment logic touched.**
- `components/ui/AuthForms/*` diffs: existing Stage 2 i18n locale wiring (no auth/Supabase flow logic changes).
- **No Supabase migrations** (`supabase/migrations/**` untouched).
- **No Lemon / payment / subscription business logic** changes (`app/api/billing/**`, `lib/payments/**`, `app/subscription/page.tsx` untouched).
- **No `app/api/**` changes** affecting auth/onboarding/RLS.
- No new `.env` / secrets / large screenshots in untracked.

## 3. Builds & tests

```text
npx tsc --noEmit                                  → exit 0
npx tsx --test lib/i18n/__tests__/*.test.ts       → 50 pass / 0 fail
npm run build                                     → Compiled successfully
```

50 i18n unit tests include the 3 new switcher tests added for hub tab coverage
(`/scholarships/hub/best-recommendation`, `/scholarships/hub/easy-apply`,
`/scholarships/hub/international-friendly`).

## 4. Locale-link audit (`reports/seo/i18n-locale-link-audit-2026-05-19.{md,json}`)

```json
{
  "pagesCrawled": 118,
  "blockingLinkIssues": 0,
  "allowedEnglishLinks": 454,
  "languageSwitcherLinks": 26,
  "crossLocaleSwitcherLinks": 26,
  "clickTestsPassed": 18,
  "clickTestsFailed": 0
}
```

- 0 blocking issues across all `/es` and `/fr` pages.
- 454 allowed Zone C (English DB long-tail / explicitly-English internal links) — documented as out-of-scope for Stage 2.
- 26 language-switcher links (self-locale → English canonical) + 26 cross-locale switcher links — classified separately from blocking issues.
- 18/18 nav + footer click tests pass.

## 5. Visible-text audit (`reports/seo/i18n-visible-text-audit-2026-05-19.{md,json}`)

```text
Pages audited: 116
Pages with blocking English UI: 0
Pages with blocking placeholder/aria/title: 0
Pages with blocking link issues: 0
Pages with allowed Zone C (DB/long-tail) links: 52
Pages with language-switcher cross-locale links: 26
Total blocking link issues: 0
Total allowed Zone C links: 108
Total language-switcher cross-locale links: 52
Pages with errors: 0
```

## 6. Language-switcher parity audit (`reports/seo/i18n-language-switcher-audit-2026-05-19.{md,json}`)

```json
{
  "totalPages": 49,
  "pagesExpectingSwitcher": 48,
  "pagesPassingSwitcher": 48,
  "pagesWithBlockingSwitcherIssues": 0,
  "pagesIntentionallyEnglishOnly": 1,
  "pagesEnglishOnlyButFoundSwitcher": 0
}
```

The new `scripts/i18n-language-switcher-audit.ts` (Playwright) reports for every audited page:

- pages checked, switcher found / missing
- expected and actual locale → href mapping
- missing localized equivalents
- English-only pages intentionally skipped
- blocking issues

**All 48 translated cluster pages render the switcher correctly with no `/en/*` hrefs and a correct active locale.**

## 7. P1 — `/scholarships/hub/*` language switcher fix

**Root cause:** `getStage2LanguageSwitcherItems` in `lib/i18n/localizedHref.ts` only returned items for paths in `STAGE2_PILOT_CANONICAL_PATHS`. Hub tab paths (`/scholarships/hub/best-recommendation`, `/scholarships/hub/easy-apply`, `/scholarships/hub/hot-deadlines`, `/scholarships/hub/international-friendly`) are served by the dynamic `[locale]/scholarships/[[...slugPath]]` route and were not in that set, so the switcher returned `[]` and the Navbar dropdown was hidden.

**Fix (single-file, pure path-mapping change):**

- `lib/i18n/localizedHref.ts` — `getStage2LanguageSwitcherItems` now also detects `/scholarships/hub/<tab>` paths and uses the existing `localizedScholarshipHubTabHref(locale, tab)` to produce the three locale hrefs.
- Filter now also rejects bare `/en` (in addition to `/en/`).

**Not changed:**

- English URL structure unchanged (`/scholarships/hub/<tab>` still resolves the same).
- Hub SEO logic unchanged (`ScholarshipHubCanonicalSeo.tsx`, `scholarshipHubPath.ts` untouched).
- DB queries unchanged (no edits to `app/scholarships/scholarshipsSlugPathPageBody.tsx` data flow).
- Only header/switcher rendering and link mapping touched.

**Verified live:** `/scholarships/hub/best-recommendation`, `/es/scholarships/hub/best-recommendation`, `/fr/scholarships/hub/best-recommendation` (and `easy-apply`, `hot-deadlines`, `international-friendly` × 3 locales) all render the switcher with:

- English → `/scholarships/hub/<tab>`
- Español → `/es/scholarships/hub/<tab>`
- Français → `/fr/scholarships/hub/<tab>`

…with the correct locale marked active (`aria-selected="true"` in the Navbar dropdown). No `/en/*` hrefs.

3 new tests added in `lib/i18n/__tests__/languageSwitcher.test.ts` lock this in.

## 8. P2 — `/subscription` decision

**Decision: Option A — keep `/subscription` English-only for Stage 2.**

**Rationale:**

- `app/subscription/page.tsx` is `force-dynamic` and tightly coupled to:
  - Supabase auth (`getUser`, profile lookup)
  - Lemon Squeezy state (`extractLemonCustomerPortalUrl`, `extractLemonUpdatePaymentMethodUrl`, `enrichBillingFixUrlFromLemonApi`)
  - Billing fix URL resolution (`resolveBillingFixHref`)
  - `past_due` / `trialing` / `cancelled` branch logic and skip-trial eligibility
- Localizing the UI here without an explicit billing-string contract risks billing-CTA regressions.
- Pricing nav link is already gated by `locale === 'en'` in `components/ui/Navbar/Navlinks.tsx` (Pricing/Tarifs is **not** shown on ES/FR nav).
- ES/FR users are not silently linked to `/subscription` anywhere in localized navigation/footers.

**What we did NOT do** (per the constraint):

- Did not touch `app/subscription/page.tsx`, `app/api/billing/**`, `lib/payments/**`, or any Lemon/checkout logic.
- Did not add `/es/subscription` or `/fr/subscription`.
- Did not add `/subscription` to the language switcher (kept hidden on this route).

`/subscription` is recorded in `scripts/i18n-language-switcher-audit.ts` as `switcherExpected: false` with the note:
> "Stage 2 decision: /subscription is tied to Lemon/payment/auth flow and stays English-only. ES/FR nav hides the Pricing link."

If/when the billing copy is later extracted into a translatable contract, Option B can be implemented as a follow-up without touching this audit.

## 9. Routes checked

### P4 — Smoke 200 (`http://localhost:3000`)

All returned `200`:

```
/                                            /es                                /fr
/scholarships                                /es/scholarships                   /fr/scholarships
/scholarships/hub/best-recommendation        /es/scholarships/hub/best-recommendation
                                             /fr/scholarships/hub/best-recommendation
/es/resources    /fr/resources    /es/essays    /fr/essays
/es/compare      /fr/compare      /es/terms     /fr/terms
/es/faq          /fr/faq          /subscription
```

### P5 — Smoke 404 (unsupported locales)

All returned `404`:

```
/en   /de   /pt   /ar   /zh-Hans   /hi   /id   /vi   /ru
```

### Language-switcher audit pages (49 total)

- 16 canonical clusters × 3 locales = 48 translated cluster pages (home, `/scholarships`, 4× `/scholarships/hub/<tab>`, `/essays`, `/providers`, `/compare`, `/resources`, `/terms`, `/faq`, `/privacy-policy`, `/resources/how-to-find-scholarships`, `/essays/outline`, `/compare/scholarship-vs-grant`)
- 1 intentionally English-only page (`/subscription`)

## 10. P6 — Verification matrix

| Acceptance criterion | Result |
| --- | --- |
| blocking link issues = 0 | **0** |
| blocking English UI = 0 | **0** |
| language switcher missing on translated clusters = 0 | **0** (48/48 pass) |
| nav/footer click tests pass | **18/18** |
| Allowed Zone C is documented | Yes — separated in locale-link & visible-text reports (454 / 108 entries) |
| ES/FR public home/hub pages don't show random English DB carousels | Yes — `HomePageContent`, `ResourcesIndexPageContent`, `EssaysIndexPageContent`, `CompareIndexPageContent` gate DB grids/carousels on `locale === 'en'` |
| English routes unchanged | Yes — only header switcher mapping + (existing) hub canonicalization; English URL structure intact |
| sitemap scope unchanged except intended ES/FR pages | Yes — `lib/seo/sitemaps.ts` only adds `/es/*` and `/fr/*` Stage 2 paths |
| no DB long-tail translation | Yes — DB content stays English; ES/FR pages hide it |
| no OpenAI / API / DB writes | Yes — audit run is read-only Playwright over localhost |
| no auth / payment / subscription logic changes | Yes — `app/subscription/page.tsx`, `app/api/billing/**`, `lib/payments/**`, `utils/supabase/**` untouched in this turn |
| `/subscription` decision documented | Yes — Option A above |

## 11. Allowed Zone C explanation

“Allowed Zone C” = links that intentionally stay English on ES/FR pages because they target English-only DB long-tail content or auxiliary English-only public pages.

Audit reports classify these separately from blocking issues:

- `i18n-locale-link-audit-2026-05-19.md` → `allowedEnglishLinks: 454`
- `i18n-visible-text-audit-2026-05-19.md` → `Total allowed Zone C links: 108`
- `i18n-stage2-zone-c-link-cleanup-2026-05-19.md` documents which dynamic sections were hidden from ES/FR home / `/resources` / `/essays` / `/compare` to reduce this surface (~734 → 454 Zone C links).

Examples remaining: detail pages under `/scholarships/<slug>`, `/providers/<slug>`, internal English-only auxiliary links (e.g. `/subscription`, `/account`).

## 12. What was NOT touched

- ❌ No `OpenAI` or translation APIs.
- ❌ No Supabase writes; no `supabase/migrations/**` changes.
- ❌ No `app/api/billing/**`, `lib/payments/**` edits.
- ❌ No `app/subscription/page.tsx` edits.
- ❌ No auth flow logic in `utils/supabase/**`, `app/api/auth/**`.
- ❌ No RLS / onboarding logic changes.
- ❌ No Lemon checkout logic changes.
- ❌ No new languages added; no `/en` route.
- ❌ Did not commit; did not push.

## 13. Files changed in this turn

- `lib/i18n/localizedHref.ts` — `getStage2LanguageSwitcherItems` extended to handle `/scholarships/hub/<tab>` paths; `/en` filter widened.
- `lib/i18n/__tests__/languageSwitcher.test.ts` — 3 new hub-tab tests.
- `scripts/i18n-language-switcher-audit.ts` — new Playwright audit (49 pages).
- `reports/seo/i18n-language-switcher-audit-2026-05-19.{md,json}` — audit outputs.
- `reports/seo/i18n-es-fr-final-prepush-audit-2026-05-19.md` — this report.

No changes to auth/payment/subscription/Supabase code.
