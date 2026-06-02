# Stage 5C-3 — IQ Post-Deploy Production Smoke

**Date:** 2026-05-21  
**Commit:** `cc013a4` — `fix(iq): localize ES FR landing paywall and report`  
**Pushed:** `origin/main` (`d7e9d79..cc013a4`)  
**Deploy:** Vercel production — live after ~2.5 min post-push (metadata titles lagged ~1 min on first probe)

---

## Pre-commit safety

| Check | Result |
|-------|--------|
| Staged files | 22 IQ localization files only |
| `.env` / secrets | Not staged |
| Supabase schema / auth / Lemon / payment logic | Not changed |
| Unrelated content-hub / resource / audit churn | Left unstaged |

---

## Production URL probes

Probed `https://iq.scholarshiptop.com` after deploy stabilized.

| URL | Status | Shell locale | Title (localized) | Hub leak | `/en` href |
|-----|--------|--------------|-------------------|----------|------------|
| `/` | 200 | `en` | Online IQ Test… (EN) | No | No |
| `/es` | 200 | `es` | Test de CI online… (ES) | No | No |
| `/fr` | 200 | `fr` | Test de QI en ligne… (FR) | No | No |
| `/assessment` | 200 | `en` | Start IQ Test… (EN) | No | No |
| `/es/assessment` | 200 | `es` | Iniciar test de CI… (ES) | No | No |
| `/fr/assessment` | 200 | `fr` | Commencer le test de QI… (FR) | No | No |

**`/en` redirect:** `308` → `Location: /` (confirmed).

---

## Automated smoke (production)

```bash
SMOKE_BASE_URL=https://iq.scholarshiptop.com npx tsx scripts/seo/i18n-stage5c-3-iq-product-smoke.ts
SMOKE_BASE_URL=https://iq.scholarshiptop.com npx tsx scripts/seo/i18n-stage5c-2-iq-assessment-smoke.ts
```

| Script | Result |
|--------|--------|
| 5C-3 product smoke | **PASS** (6 paths + programmatic copy) |
| 5C-2 assessment smoke (regression) | **PASS** |

---

## Verification notes

| Area | HTTP smoke | Browser (recommended) |
|------|------------|------------------------|
| Landing hero/footer/body | Metadata + shell locale only (client-rendered) | Confirm ES/FR copy on `/es`, `/fr` |
| Assessment UI (5C-2) | Shell locale + bank parity | Start test — questions/options in ES/FR |
| Paywall | Not reachable without completing test | Localhost still auto-unlocks report preview |
| Unlocked report | Token route requires paid order | Use localhost preview or paid token |
| Footer links | Locale-prefixed hrefs in client bundle | Click Inicio / Accueil / FAQ on ES/FR |

**English unchanged:** `/` and `/assessment` titles and shell locale `en` match pre-5C-3 EN product.

---

## Verdict

| | |
|--|--|
| **Deploy successful?** | **Yes** |
| **5C-3 production smoke?** | **Pass** |
| **5C-2 regression?** | **Pass** |
| **Ready for 5C-4 (legal/slug/strategy paywall)?** | **Yes** |

---

## Remaining English (expected)

- Lemon checkout server error strings
- `ContextualStrategyPaywall` + strategy preview mock data
- `ContextualIqReadyChoice` post-assessment chrome
- IQ legal/slug static page bodies
- Qualification/account funnel phases

---

## Re-run

```bash
SMOKE_BASE_URL=https://iq.scholarshiptop.com npx tsx scripts/seo/i18n-stage5c-3-iq-product-smoke.ts
SMOKE_BASE_URL=https://iq.scholarshiptop.com npx tsx scripts/seo/i18n-stage5c-2-iq-assessment-smoke.ts
```
