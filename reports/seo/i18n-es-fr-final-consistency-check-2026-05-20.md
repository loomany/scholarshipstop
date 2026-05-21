# ES/FR final consistency check (2026-05-20)

**Purpose:** Resolve report inconsistency about funnel routes (`/get-scholarships`, `/signin`, `/subscription`) before manual user review.

**Constraints honored:** No product code changes. No commit. No push. No DB/auth/payment/RLS changes.

**Verification server:** `npm run build` → `npx next start -p 3010` (ScholarshipTop production build).  
**Note:** Port `3000` was intermittently occupied by another local Next.js app (`kaspi` dev server), which caused false audit failures when scripts targeted `:3000`. All authoritative checks below used `:3010`.

---

## 1. Source of truth (report hierarchy)

| Priority | Report / artifact | Status | Use for |
| ---: | --- | --- | --- |
| **1** | **Code** (`app/**`, `lib/i18n/**`) | Authoritative | Route existence, metadata, payment wiring |
| **2** | `i18n-subscription-localization-2026-05-19.md` | Current | Subscription ES/FR architecture |
| **3** | `i18n-full-route-localization-inventory-2026-05-19.md` | Current | Zone A/B/C route table |
| **4** | `i18n-master-translation-and-seo-audit-2026-05-19.md` | Current (minor wording fix below) | Overall Stage 2 readiness |
| **5** | `i18n-es-fr-final-prepush-audit-2026-05-19.md` | Current | Pre-push QA snapshot |
| **6** | `i18n-static-pages-inventory-2026-05-19.md` §4 | **STALE** | Do **not** use for funnel routes |

### Report inconsistency — resolution

**Stale (incorrect):** `i18n-static-pages-inventory-2026-05-19.md` section 4 lists `/signin`, `/get-scholarships`, `/subscription` under “Private / auth — skip”. That reflected an **earlier** inventory pass before funnel localization shipped.

**Correct (current):** Master audit, route inventory, subscription report, and **code** confirm:

| Route | ES/FR exists | Localized UI | Index policy |
| --- | --- | --- | --- |
| `/get-scholarships` | ✅ `/es`, `/fr` | ✅ | **noindex, follow** |
| `/signin`, `/signin/[id]` | ✅ `/es`, `/fr` | ✅ | **noindex, follow** |
| `/subscription` | ✅ `/es`, `/fr` | ✅ | **index (default)** — same as EN |

**Correction to master report wording:** Subscription is **not** a noindex funnel page. Only get-scholarships and signin are noindex. Subscription matches English indexability (no explicit `robots` meta → indexable) and is excluded from sitemap by design.

---

## 2. Route status table

| Route | File(s) | EN 200 | ES 200 | FR 200 | Localized UI | Payment/auth touch |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| `/get-scholarships` | `app/get-scholarships/**` | ✅ | — | — | EN | No |
| `/es/get-scholarships` | `app/[locale]/get-scholarships/page.tsx` | — | ✅ | — | ES | No |
| `/fr/get-scholarships` | same | — | — | ✅ | FR | No |
| `/signin` | `app/signin/**` | ✅ | — | — | EN | Auth UI only |
| `/es/signin` | `app/[locale]/signin/**` | — | ✅ | — | ES | Auth UI only |
| `/fr/signin` | same | — | — | ✅ | FR | Auth UI only |
| `/subscription` | `app/subscription/page.tsx` | ✅ | — | — | EN | Loader shared; Lemon unchanged |
| `/es/subscription` | `app/[locale]/subscription/page.tsx` | — | ✅ | — | ES | Same |
| `/fr/subscription` | same | — | — | ✅ | FR | Same |

Build output confirms SSG entries: `/es/get-scholarships`, `/fr/get-scholarships`, `/es/signin`, `/fr/signin`, `/es/subscription`, `/fr/subscription`.

---

## 3. Index / noindex status (live HTML on `:3010`)

Verified via `scripts/i18n-funnel-seo-smoke.ts`:

| Path | HTTP | robots meta | hreflang |
| --- | ---: | --- | --- |
| `/get-scholarships` | 200 | `noindex, follow` | none |
| `/signin` | 200 | `noindex, follow` | none |
| `/subscription` | 200 | default (indexable) | en, es, fr, x-default |
| `/es/get-scholarships` | 200 | `noindex, follow` | none |
| `/fr/get-scholarships` | 200 | `noindex, follow` | none |
| `/es/signin` | 200 | `noindex, follow` | none |
| `/fr/signin` | 200 | `noindex, follow` | none |
| `/es/subscription` | 200 | default (indexable) | en, es, fr, x-default |
| `/fr/subscription` | 200 | default (indexable) | en, es, fr, x-default |

**Policy summary:**

- **Funnel quiz + auth:** noindex, follow on EN and ES/FR (metadata in layouts/pages).
- **Subscription:** indexable on all three locales; hreflang cluster complete; **not** noindex.
- **No `/en` links** in HTML for any checked URL.

---

## 4. Sitemap status

Grepped live sitemaps on `:3010`:

- `/sitemap.xml` — **no** matches for `get-scholarships`, `signin`, `subscription`
- `/sitemaps/locale-es-core.xml` — **no** matches

Confirmed in code: `lib/seo/sitemaps.ts` does not include funnel paths; only pilot static pages via `listLocalizedPilotPages()`.

| Path group | In EN sitemap | In locale-es/fr sitemap |
| --- | :---: | :---: |
| get-scholarships | ❌ | ❌ |
| signin | ❌ | ❌ |
| subscription | ❌ | ❌ |

This matches policy: noindex funnel pages excluded; subscription historically excluded from sitemap despite being indexable.

---

## 5. Language switcher / hreflang

| Path | Navbar switcher | hreflang in `<head>` | Notes |
| --- | --- | --- | --- |
| get-scholarships (EN/ES/FR) | Hidden (not pilot path) | None | Expected — `getStage2LanguageSwitcherItems()` only for pilot hubs + subscription |
| signin (EN/ES/FR) | Hidden | None | Expected — same |
| subscription (EN/ES/FR) | ✅ Visible | en, es, fr, x-default | Switcher audit 51/51 pass |

**Switcher audit (`:3010`):** 51/51 pass, 0 blocking, no `/en` hrefs.

Funnel pages link to localized equivalents via nav (`localizedFunnelHref`) — locale-link audit 0 blocking, 18/18 click tests pass.

---

## 6. Payment / auth untouched confirmation

| Check | Result |
| --- | --- |
| `git diff app/api/billing/**` | **Empty** — no changes |
| `git diff lib/payments/**` | **Empty** — no changes |
| `git diff app/actions/billing.ts` | **Empty** — no changes |
| Plan keys in checkout | Unchanged: `monthly`, `quarterly`, `yearly` |
| Checkout entry | Still `getCheckoutURL(planKey)` from `app/actions/billing.ts` |
| Billing API routes | `/api/billing/cancel-subscription`, `resume`, `skip-trial`, `update-subscription` — untouched |

**Only subscription-related diff:** `components/subscription/SubscriptionPricingClient.tsx` — **UI copy props** (localized strings via `SubscriptionPricingUiCopy`); payment calls, Lemon `Url.Open`, and plan keys unchanged.

Auth callbacks (`/auth/callback`, etc.) not duplicated per locale — unchanged.

---

## 7. Automated QA (2026-05-20, server `:3010`)

| Command | Result |
| --- | --- |
| `npm run build` | ✅ PASS (196 pages) |
| `npx tsc --noEmit` | ✅ PASS |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | ✅ 51/51 |
| `npx tsx scripts/i18n-funnel-seo-smoke.ts` | ✅ 9/9 URLs 200 |
| `npx tsx scripts/i18n-visible-text-audit.ts` | ✅ 0 blocking (118 pages) |
| `npx tsx scripts/i18n-locale-link-audit.ts` | ✅ 0 blocking; 18/18 clicks |
| `npx tsx scripts/i18n-language-switcher-audit.ts` | ✅ 51/51 pass |

### Tooling added (audit-only)

- `scripts/i18n-funnel-seo-smoke.ts` — HTTP 200 + robots + hreflang smoke for 9 funnel URLs.

---

## 8. Manual review checklist

Before browsing locally:

1. Use **`npx next start -p 3010`** (or confirm `:3000` is ScholarshipTop, not another project).
2. Spot-check:
   - `/es/get-scholarships` — Spanish quiz UI; submit keeps locale
   - `/fr/signin/password_signin` — French auth labels
   - `/es/subscription` — Precios UI; checkout still opens Lemon overlay
3. Confirm `/en` → 404, `/de` → 404.

---

## 9. Final verdict

### **READY for manual user review**

| Area | Verdict |
| --- | --- |
| Report inconsistency (funnel “skip” vs shipped) | ✅ Resolved — code + newer reports win |
| Funnel routes exist + 200 | ✅ |
| EN originals work | ✅ |
| noindex policy | ✅ Correct (subscription intentionally indexable) |
| Sitemap exclusion | ✅ |
| Switcher/hreflang (subscription) | ✅ |
| Payment/Lemon untouched | ✅ |
| Full QA suite | ✅ 0 blocking |

**Non-blockers for manual review:**

- Stale §4 in `i18n-static-pages-inventory-2026-05-19.md` — update doc when convenient (not required for push).
- Taxonomy category **values** still English on scholarships hub (Stage 3B).
- Port `3000` may conflict with other local projects — prefer `:3010` for QA.

**Do not bulk-translate DB content until Stage 4 pipeline exists.**
