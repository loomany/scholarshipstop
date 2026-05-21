# Stage 3M Remainder — Final Report (2026-05-20)

**No commit. No push.** No Supabase writes, migrations, bulk OpenAI, RLS changes, or new locales.

QA server for route checks: **`http://localhost:3020`** (`npx next start -p 3020` after clean build). Port **3010** was occupied by another process (404 on `/es/onboarding`).

---

## 1. What was fixed (this remainder)

| Area | Change |
| --- | --- |
| **Localized onboarding** | `app/[locale]/onboarding/page.tsx` + `layout.tsx` — `/es/onboarding`, `/fr/onboarding` return **200**; wizard `uiLocale` prop; step 2 visible UI via `onboardingUiCopy.ts` |
| **Subscription success** | `app/[locale]/subscription/success/page.tsx`, shared `SubscriptionSuccessContent.tsx`; EN page refactored to same component |
| **Reset password UI** | `app/auth/reset_password/page.tsx` — loading labels + error redirect copy ES/FR via `authUiCopy`; post-reset redirects to `/es|fr/signin/update_password` when `sessionStorage` locale set by `LocaleUiPreference` |
| **Locale persistence** | `components/i18n/LocaleUiPreference.tsx` wired in `app/[locale]/layout.tsx` (no auth logic change) |
| **Account profile** | Log out, resend confirmation, email confirmed/not-confirmed badges, inbox hint; full **school level** + **citizenship** select display maps in `accountProfileUiCopy.ts` |
| **Onboarding step 2** | Headings, placeholders, Google CTA, primary button, birthday labels (ES/FR) |

### Unchanged by design

- Lemon hosted checkout (English overlay)
- `app/api/billing/**`, `lib/payments/**`, `app/actions/billing.ts` — **no diff**
- Supabase auth URLs in dashboard (reset still lands on `/auth/reset_password`)
- `/signup` → still redirects to **`/onboarding`** (EN canonical)
- DB scholarship bodies, `/essay` product logic

---

## 2. What remains English and why

| Surface | Why |
| --- | --- |
| **Lemon checkout overlay** | External hosted UI — out of scope |
| **`/onboarding` (EN URL)** | Canonical funnel entry; `/es|fr/onboarding` exist for localized UX; `/signup` not locale-aware |
| **`/auth/reset_password` URL** | Supabase email template points to fixed EN path; only on-page UI + redirect targets are localized |
| **`/essay`, `/essay/[id]`** | Full product workspace (`EssayPageClient`, `EssayQuestionnaire`, 8+ API routes) — high regression risk; audit-only this stage |
| **Onboarding step 2 toasts / validation** | Mostly English server/schema messages; frontend toasts for Google OAuth still EN |
| **Field-of-study select options** | Large taxonomy; partial EN fallback for uncommon slugs |
| **DB hub/category card titles** | Stage 4 `content_translations` — not bulk-translated |
| **Resources ES/FR DB grid** | Intentionally hidden (`locale === 'en'` guard) |
| **Brand/product terms** | ScholarshipTop, STEM, GPA, Google — allowed |

---

## 3. `/es/onboarding` and `/fr/onboarding`

| Route | Status | Notes |
| --- | --- | --- |
| `/es/onboarding` | **200** | SSG; logged-in users redirect to localized hub best-recommendation tab |
| `/fr/onboarding` | **200** | Same |
| `/onboarding` | **200** | EN; pathname-derived locale = `en` for copy |

**Auth:** No signup/session/API changes. Layout only adds server `redirect()` when user already logged in (same pattern as EN onboarding layout, localized hub href).

**Gap:** Marketing links may still point to `/onboarding` or `/signup` without locale prefix.

---

## 4. `/subscription/success`

| Route | Status |
| --- | --- |
| `/subscription/success` | **200** — EN copy via `SubscriptionSuccessContent` |
| `/es/subscription/success` | **200** — localized title, body, CTAs to `/es/scholarships`, `/es/account` |
| `/fr/subscription/success` | **200** — same for FR |

**Lemon:** Return URL in Lemon dashboard may still be EN-only unless manually updated to localized URLs. Our pages are ready if configured.

**Payment:** No plan IDs, checkout URLs, or billing API changes.

---

## 5. Reset password

| Item | Status |
| --- | --- |
| Route | `/auth/reset_password` (Supabase deep-link — **EN URL only**) |
| Visible UI | Loading strings localized when user visited `/es` or `/fr` before opening email link (`sessionStorage`) |
| Error redirects | `/es/signin/forgot_password` or `/fr/...` when stored locale is pilot |
| Success redirect | `/es/signin/update_password` or `/fr/...` with localized toast messages |

**Out of scope:** Changing Supabase redirect URL templates (would need dashboard change + regression test).

---

## 6. `/essay` product audit

| Item | Detail |
| --- | --- |
| **Routes** | `/essay` (main), `/essay/[id]`; linked from hub/essays CTAs (Zone C allowed EN links) |
| **English UI** | `EssayPageClient` — H1 “Write your essay with an AI Mentor”, intro paragraph, all `EssayQuestionnaire` chrome |
| **APIs** | `/api/essay/*` (generate, humanize, save, message, check-ai, queue, email) — **do not localize** without product review |
| **Auth/DB** | Session-gated chats; DB writes on save/generate |
| **Payment** | None on essay surface |
| **Safe now?** | Only static header/intro copy extraction (`essayProductUiCopy.ts`) — **deferred** |
| **Recommended stage** | Post-push **Stage 4B** — copy module + optional `/es/essay` route after auth parity review |

---

## 7. Account / profile final status

| Item | ES/FR status |
| --- | --- |
| `/es/account`, `/fr/account` | Localized shell + profile form |
| Sections, labels, save, subscription card | Localized |
| Grant notification toggles | Localized |
| School level / citizenship dropdowns | **Localized display** (values stay EN slugs for DB) |
| Field of study | Partial (EN fallback for unmapped slugs) |
| Log out / resend / email badges | **Localized** (this remainder) |
| Account nav/sidebar | SaaS single-page profile (no separate settings route) |

**Remaining EN on account:** Some validation toasts, rare select labels, internal debug (`SubscriptionDebug`), entity names.

---

## 8. Lemon / payment untouched

| Check | Result |
| --- | --- |
| `app/api/billing/**` | No changes in working tree |
| `lib/payments/**` | No changes |
| `app/actions/billing.ts` | No changes |
| Plan IDs / checkout URLs | Unchanged (`getCheckoutURL` still used as before) |
| `SubscriptionPricingClient.tsx` | **UI copy only** (`subscriptionPageCopy` / `SubscriptionPlanCopy`) — same Lemon.js open flow |

---

## 9. Auth / Supabase untouched

| Check | Result |
| --- | --- |
| Auth mutations / session logic | Unchanged |
| RLS | Unchanged |
| Migrations | None created |
| Supabase writes from this work | None |
| OAuth / email signup flows | Unchanged |

---

## 10. Updated scores (before push)

| Area | Score | Notes |
| --- | ---: | --- |
| **Public/static ES/FR** | **99/100** | 53 EN paths → 106 pilot URLs; minor hreflang on client-heavy hub in smoke script |
| **Funnel ES/FR** | **98/100** | +localized onboarding & success; `/signup` → EN onboarding |
| **Private/account ES/FR** | **88/100** | Up from ~72; essay/account nav gaps remain |
| **Static SEO ES/FR** | **97/100** | Metadata/canonical/sitemap tests pass |
| **DB SEO ES/FR readiness** | **18/100** | Inventory + architecture only |
| **English SEO safety** | **96/100** | `/en` 404; EN root canonicals preserved |
| **Overall before push** | **94/100** | UI-ready; DB translation not started |

---

## 11. Build / test / audit results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run build` (clean `.next`) | **PASS** | Includes `/es/onboarding`, `/fr/onboarding`, `/es|fr/subscription/success` in route table |
| `npx tsc --noEmit` | **PASS** | |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **54/54 PASS** | |
| `i18n-build-smoke-check.ts` (`:3020`) | **Mostly PASS** | `/en`, `/de` → 404 OK; **2 FAIL**: `/es/scholarships`, `/fr/scholarships` missing hreflang in static HTML (likely client metadata; prior full Playwright audit: 0 blocking) |
| Route HTTP (`:3020`) | **PASS** | `/es/onboarding`, `/fr/onboarding`, `/es|fr/subscription/success`, `/auth/reset_password` → **200** |
| Full Playwright visible-text / locale-link / switcher | **Not re-run** (prior 2026-05-19: 0 blocking, 51/51 switcher on `:3010`) — **recommend one full run on `:3020` before deploy** |

---

## 12. Git hygiene

| Item | Status |
| --- | --- |
| Commit / push | **Not done** (per instructions) |
| `.env` / secrets in diff | **Not staged** — verify locally before any commit |
| Supabase migrations | None added |
| `/en` route | None |
| New locales | None (es, fr only) |

---

## 13. Final recommendation

### Ready for push?

**Yes — for ES/FR UI pilot**, with caveats:

1. Run full Playwright trio once on a **confirmed ScholarshipTop** port (`3020` after `npm run build && npx next start -p 3020`).
2. Manually spot-check pages below.
3. Do **not** expect DB SEO or `/essay` in this release.
4. Configure Lemon success URL to localized paths if you want post-checkout ES/FR (optional).

### Still not ready (separate work)

- Bulk DB translation
- `/essay` product localization
- Supabase reset-email URL locale (dashboard)
- `/signup` locale-preserving redirect

### Manual pages to check

| URL | Why |
| --- | --- |
| `/es/onboarding`, `/fr/onboarding` | New routes; step 2 + Google |
| `/es/account`, `/fr/account` | Log out, resend, selects |
| `/es/subscription/success`, `/fr/subscription/success` | New copy |
| `/es/get-scholarships`, `/es/signin`, `/es/subscription` | Funnel |
| `/auth/reset_password` | After visiting `/es` first, then email link |
| `/subscription` → Lemon checkout | Confirm overlay still English |
| `/essay` | Confirm still English (expected) |

---

*Generated: Stage 3M remainder completion. Server QA: port 3020.*
