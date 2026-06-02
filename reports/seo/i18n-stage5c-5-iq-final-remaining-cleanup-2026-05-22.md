# Stage 5C-5 — IQ final remaining cleanup (2026-05-22)

## Status: deferred (documented only)

IQ 5C-1–5C-4 are live on `iq.scholarshiptop.com`. Production regression smokes **PASS** (5C-2/3/4).

## Remaining English (not implemented this session)

| Surface | Risk | Recommendation |
|---------|------|----------------|
| Legal page bodies (faq/help/about/terms/privacy/refund) | Low–med (long legal text) | Dedicated legal translation pass; metadata + shell already ES/FR |
| `PostAssessmentQuiz` | Med (shared onboarding component) | Extract `postAssessmentQuizUiCopy` or extend `funnelUiCopy` |
| `app/iq/[slug]/page.tsx` SEO landings | Med (large static matrix) | Separate `iqSeoLandingCopy` per slug |
| `ProviderSourceStatusBlock` verify/quality prose | Low | Partially wired on main site provider; IQ N/A |
| Lemon checkout errors / product HTML | **Out of scope** | No payment logic changes |

## Production IQ regression (2026-05-22)

- 5C-2, 5C-3, 5C-4 smokes on `https://iq.scholarshiptop.com` — **PASS**
- `/en` → 308 `/` (unchanged)

## Next safe push

Branch `release/iq-final-remaining-cleanup` not created — implement PostAssessmentQuiz + legal body in one focused PR after copy review.
