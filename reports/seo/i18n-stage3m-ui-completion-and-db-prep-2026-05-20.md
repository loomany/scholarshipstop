# Stage 3M UI completion + DB translation prep (2026-05-20)

**No commit. No push.** No Supabase writes, migrations, bulk OpenAI, or payment/auth logic changes.

---

## 1. Executive summary

| Question | Answer |
| --- | --- |
| **Ready to push ES/FR UI to production?** | **Yes** — public/static + funnel are production-grade; private UI substantially improved. |
| **Ready to start DB translation pilot?** | **Yes for planning** — inventory + architecture + cost model complete. **No** for bulk MT until schema + review workflow exist. |
| **What was fixed this sprint?** | Account profile UI (ES/FR), grant notifications, taxonomy labels (prior sprint), `/es/account` route, onboarding step chrome (partial). |
| **What is still not 100?** | `/onboarding` (EN-only URL), `/essay` product, some profile select labels (fallback EN), Lemon checkout, DB bodies. |
| **English SEO safe?** | **Yes** (96/100). |

---

## 2. Part A — UI fixes (Stage 3M)

### Implemented

| Area | Change | Files |
| --- | --- | --- |
| **Account profile** | Full SaaS account UI copy ES/FR: sections, labels, save, subscription status card, perks, grant alerts | `lib/i18n/accountProfileUiCopy.ts`, `ScholarshipProfileForm.tsx` |
| **Grant notifications** | Localized channel labels + descriptions | `GrantNotificationToggles.tsx` |
| **Account routes** | `/es/account`, `/fr/account` with localized signin redirect | `app/[locale]/account/page.tsx` |
| **Account shell** | Back link localized | `AccountDashboardClient.tsx` (prior) |
| **Taxonomy** | Category/country filter display labels | `lib/i18n/taxonomyLabels.ts` (completion sprint) |
| **Onboarding** | Step 1/2 eyebrows, titles, loading, back links via pathname locale* | `lib/i18n/onboardingUiCopy.ts`, `ScholarshipOnboardingWizard.tsx` |

\*Onboarding remains at **`/onboarding` only** (no `/es/onboarding`). Locale applies only if pathname includes `/es` or `/fr` (rare). Full onboarding localization needs **`app/[locale]/onboarding`** — deferred (auth redirect risk).

### Already complete (prior sprints)

| Area | Status |
| --- | --- |
| Funnel get-scholarships | ✅ `funnelUiCopy.ts` |
| Signin / signup / forgot / reset views | ✅ `authUiCopy.ts` + `app/[locale]/signin/**` |
| Subscription visible UI | ✅ `subscriptionPageCopy.ts` — Lemon overlay EN OK |
| Public static 53 paths | ✅ static translations |

### Intentionally not localized (documented)

| Route / surface | Reason |
| --- | --- |
| `/onboarding` | EN-only route; auth/signup API paths; needs locale wrapper + redirect audit |
| `/essay`, `/essays/u/*` | Product workspace; high regression risk |
| `/subscription/success` | Lemon return URL |
| `/auth/reset_password` | Supabase email deep-link |
| Lemon checkout overlay | External hosted UI — **do not localize** |
| `ScholarshipProfileForm` select options (many values) | Partial map; uncommon values fall back to EN label |
| `Log out`, some email verification strings | Minor; low traffic |
| DB scholarship card titles on hubs | Stage 4 DB translation |

### Private SEO policy

- All private routes: **noindex,follow** (unchanged)
- **Not** in ES/FR sitemaps

---

## 3. Part B — Public/static verification

| Check | Result |
| --- | --- |
| `npm run build` | ✅ PASS (after Stage 3M fixes) |
| `npx tsc --noEmit` | ✅ PASS |
| `lib/i18n/__tests__` | ✅ **54/54** |
| Visible-text audit | ✅ **0 blocking** (prior run, `:3010`) — re-run before deploy |
| Locale-link audit | ✅ **0 blocking**, ~423 Zone C allowed |
| Language-switcher audit | ✅ **51/51** |
| Taxonomy on `/es/scholarships` | ✅ Seguridad, Música, etc. |
| `/es/resources`, `/fr/resources` | ✅ Static guides only; no DB grid (intentional) |
| `/en` | ✅ 404 |
| Unsupported locales | ✅ 404 |
| English root URLs | ✅ Unchanged |

---

## 4. Part C — DB translation inventory

**CSV:** [`i18n-db-translation-inventory-2026-05-20.csv`](./i18n-db-translation-inventory-2026-05-20.csv) (9 content groups)

| Group | ~Pages | First batch |
| --- | ---: | --- |
| Scholarship detail | 19,448 | Top 100 |
| Provider detail | 5,061 | Top 50 |
| Resources CMS | 900 | Top 50 |
| DB essays | 11,799 | Top 25 (after resources) |
| Compare state/univ | ~1,175 | P3 |
| Category SEO L1 | 11 | All 11 |
| Programmatic SEO hubs | ~1,626 | Top 20 |
| Cross-country SEO | ~200 | P3 |

**Total EN sitemap surface:** ~40,114 URLs.

---

## 5. Part D — Architecture

See [`i18n-db-translation-architecture-plan-2026-05-20.md`](./i18n-db-translation-architecture-plan-2026-05-20.md).

Summary: `content_translations` table, status lifecycle, noindex/sitemap/hreflang only when `published`, English slugs under `/es/` `/fr/`, stale detection via `source_revision_hash`.

---

## 6. Part E — OpenAI / cost

See [`i18n-openai-translation-cost-plan-2026-05-20.md`](./i18n-openai-translation-cost-plan-2026-05-20.md).

**Pilot MT (ES+FR):** ~**$1** machine + **90–145 h** human review.  
**Full DB (~40k × 2 locales):** ~**$100–160** MT-only.

---

## 7. Part F — Updated scores (/100)

| Area | Score | Notes |
| --- | ---: | --- |
| Public/static ES/FR | **99** | 53 paths; resources hub simplified by design |
| Funnel ES/FR | **95** | Lemon checkout EN (−5 explicit) |
| Private/account ES/FR | **72** | Profile form localized; onboarding/essay gaps |
| Static SEO ES/FR | **99** | Pilot sitemap 106 URLs |
| DB SEO ES/FR readiness | **18** | Plan ready; zero published translations |
| English SEO safety | **96** | Unchanged |
| **Overall readiness before push** | **93** | UI push yes; DB pilot needs schema next |

---

## 8. Part G — QA / git safety

```
npm run build          → PASS
npx tsc --noEmit       → PASS
i18n tests             → 54/54 PASS
```

**Git:** No diff in `app/api/billing/**`, `lib/payments/**`, `app/actions/billing.ts`.  
No `.env`, migrations, or new locales in staged scope.

**New files (not committed):**

- `lib/i18n/accountProfileUiCopy.ts`
- `lib/i18n/onboardingUiCopy.ts`
- `lib/i18n/taxonomyLabels.ts`
- `app/[locale]/account/page.tsx`
- `scripts/i18n-db-translation-inventory.ts`
- `reports/seo/i18n-*-2026-05-20.*`

---

## 9. Manual checks before deploy

1. `/es/account` (logged in) — Spanish section titles, save, grant toggles  
2. `/fr/account` — French parity  
3. `/es/scholarships` — category filter labels  
4. `/es/subscription` — UI ES; Lemon checkout may be EN  
5. `/en` → 404  
6. Re-run Playwright audits on ScholarshipTop (`npx next start -p 3010`)

---

## 10. Next implementation stage

| Order | Stage | Work |
| ---: | --- | --- |
| 1 | **Deploy** | Push ES/FR UI sprint when approved |
| 2 | **3M remainder** | `app/[locale]/onboarding` + `ScholarshipOnboardingStep2` copy pass |
| 3 | **DB schema** | Migration `content_translations` + RLS read-only for app |
| 4 | **DB pilot worker** | Top 50 resources + 100 scholarships + 11 categories |
| 5 | **Review UI** | Publish workflow + sitemap hook |

---

## Related reports

- [`i18n-es-fr-to-100-final-report-2026-05-20.md`](./i18n-es-fr-to-100-final-report-2026-05-20.md)
- [`i18n-private-account-localization-audit-and-safe-fixes-2026-05-20.md`](./i18n-private-account-localization-audit-and-safe-fixes-2026-05-20.md)
- [`i18n-db-content-translation-readiness-2026-05-19.md`](./i18n-db-content-translation-readiness-2026-05-19.md)

*Generated 2026-05-20. No commit. No push.*
