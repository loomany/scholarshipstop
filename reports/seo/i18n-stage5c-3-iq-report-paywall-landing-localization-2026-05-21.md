# Stage 5C-3 — IQ Landing, Paywall, Report, and Funnel ES/FR Localization

**Date:** 2026-05-21  
**Scope:** Post-assessment and public IQ product surfaces (ES/FR).  
**Prior stages:** 5C-1 routing/switcher (`3c02145`), 5C-2 assessment (`d7e9d79`).  
**Commit:** Not pushed (awaiting final gate approval).

---

## 1. Copy inventory (implemented)

| Surface | Module | Wired in |
|---------|--------|----------|
| IQ landing (hero, proof, report preview, domains, trust, CTAs) | `lib/iq/i18n/iqLandingCopy.ts` | `ScholarshipIqTestClient.tsx` |
| General funnel email step | `lib/iq/i18n/iqFunnelEmailCopy.ts` | `GeneralIqFunnelClient.tsx` |
| Contextual pre-assessment intro + email gate | `lib/iq/i18n/iqContextualFunnelCopy.ts` | `ContextualAssessmentFunnelClient.tsx` (intro, `ContextualIqEmailGate`) |
| Standard IQ paywall | `lib/iq/i18n/iqPaywallCopy.ts` | `StandardIqPaywall.tsx` |
| Unlocked report + not-found | `lib/iq/i18n/iqReportCopy.ts` | `UnlockedIqReport.tsx`, `app/iq/report/[token]/page.tsx` |
| IQ product footer | `lib/iq/i18n/iqFooterCopy.ts` | `IqProductFooter.tsx` (locale-prefixed hrefs) |
| Home + assessment + report metadata | `lib/iq/i18n/iqMetadataCopy.ts` | `app/iq/page.tsx`, `app/iq/assessment/page.tsx`, `app/iq/report/[token]/page.tsx` |

**Not translated (by design / Stage 5C-4):**

- Lemon checkout API error strings (`iqReportCheckout.ts`) — payment logic unchanged
- `ContextualStrategyPaywall`, qualification/account phases, strategy preview mock grants
- `ContextualStrategyPreview` grant cards and analytics chrome (sample English data)
- `ContextualIqReadyChoice` post-assessment choice screen (partial English)
- IQ legal/slug static pages (`IqLegalPage`, `app/iq/[slug]`, about/help/faq bodies)
- Checkout product name/description HTML sent to LemonSqueezy (server, English)

---

## 2. Locale persistence for reports

- `AssessmentResult.assessmentLocale?: IqLocale` added (JSON field in stored results, not a DB schema migration).
- `AssessmentEngine` sets `assessmentLocale` when scoring completes.
- `StandardIqPaywall` / `UnlockedIqReport` use `resolveIqReportLocale(result, shellLocale)`.
- Token report page: `UnlockedIqReport` uses stored `assessmentLocale` from order row.
- Scoring math, IDs, scores, tokens unchanged.

---

## 3. Verification

### Automated

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| IQ unit tests (paths + questions + product copy) | **18/18** pass |
| `npx tsx scripts/seo/i18n-stage5c-3-iq-product-smoke.ts` | Pass (fresh `next start -p 3020` after build) |
| `npx tsx scripts/seo/i18n-stage5c-2-iq-assessment-smoke.ts` | Pass (regression) |

### HTTP smoke (5C-3 script)

- `/`, `/es`, `/fr` — localized `<title>` via `generateMetadata` + `data-iq-product-shell-locale`
- `/assessment`, `/es/assessment`, `/fr/assessment` — shell locale + localized assessment titles
- No `href="/en"` on probed paths

### Manual (recommended before push)

| URL | Verify |
|-----|--------|
| `iq.scholarshiptop.com/` | ES/FR landing hero + CTA via switcher |
| `iq.scholarshiptop.com/es` | Spanish landing copy |
| `iq.scholarshiptop.com/assessment` | EN assessment unchanged |
| `iq.scholarshiptop.com/es/assessment` | Contextual intro + email in Spanish |
| After test → paywall | ES/FR paywall strings; localhost → unlocked report in matching locale |
| `/report/{token}` | Report labels match `assessmentLocale` on order |

**Paywall without payment:** localhost auto-preview still shows `UnlockedIqReport` (no Lemon mutation).

---

## 4. Constraints respected

| Constraint | Status |
|------------|--------|
| No scoring math changes | Yes |
| No payment/Lemon logic changes | Yes (UI copy only; server checkout errors still EN) |
| No auth/Supabase schema changes | Yes (`assessmentLocale` in JSON blob only) |
| No OpenAI | Yes |
| No `/en` routes | Yes |
| No new languages | Yes (en/es/fr) |
| `/report/{token}` noindex | Yes (`robots: { index: false }` unchanged) |

---

## 5. Files touched (summary)

**New:** `iqLandingCopy.ts`, `iqPaywallCopy.ts`, `iqReportCopy.ts`, `iqFunnelEmailCopy.ts`, `iqFooterCopy.ts`, `iqMetadataCopy.ts`, `iqContextualFunnelCopy.ts`, `iqProductCopy.test.ts`, `i18n-stage5c-3-iq-product-smoke.ts`

**Updated:** `ScholarshipIqTestClient.tsx`, `GeneralIqFunnelClient.tsx`, `ContextualAssessmentFunnelClient.tsx`, `StandardIqPaywall.tsx`, `UnlockedIqReport.tsx`, `IqProductFooter.tsx`, `AssessmentEngine.tsx`, `iqAssessmentTypes.ts`, `iqShellCopy.ts`, `app/iq/page.tsx`, `app/iq/assessment/page.tsx`, `app/iq/report/[token]/page.tsx` (`dynamic = 'force-dynamic'` on IQ home/assessment for per-request metadata)

---

## Final verdict

| Question | Answer |
|----------|--------|
| **Ready for push/deploy?** | **Yes** — build, types, and tests green; run manual browser pass on paywall/report after deploy. |
| **Remaining English surfaces** | See §1 “Not translated”; plus checkout server errors, contextual strategy paywall/preview, legal/slug pages, `ContextualIqReadyChoice` chrome. |

---

## Re-run smoke

```bash
npm run build && npx next start -p 3020
npx tsx scripts/seo/i18n-stage5c-3-iq-product-smoke.ts
npx tsx scripts/seo/i18n-stage5c-2-iq-assessment-smoke.ts
node --import tsx --test lib/iq/i18n/__tests__/iqPaths.test.ts lib/iq/i18n/__tests__/iqQuestions.test.ts lib/iq/i18n/__tests__/iqProductCopy.test.ts
```

Production:

```bash
SMOKE_BASE_URL=https://iq.scholarshiptop.com npx tsx scripts/seo/i18n-stage5c-3-iq-product-smoke.ts
```
