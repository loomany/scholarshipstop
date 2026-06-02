# Stage 5C-1 — IQ Post-Deploy Production Smoke

**Date:** 2026-05-21  
**Commit:** `3c02145` — `fix(iq): route ES FR locale paths on IQ subdomain`  
**Pushed:** `origin/main` (`1737b7b..3c02145`)  
**Deploy:** Vercel production (rollout ~2–3 minutes after push)

---

## Pre-commit verification

| Check | Result |
|-------|--------|
| Only 5C-1 files staged | 17 files, +861 / −64 lines |
| No `.env` / secrets | Confirmed |
| No Supabase / auth / Lemon changes | Confirmed |
| No `/en` route added | `/en` → 308 strip only |
| Unrelated audits/content-hub | Left unstaged |

---

## Production smoke results

Probed `https://iq.scholarshiptop.com` after deploy stabilized (~3 min post-push).

| URL | Status | Title / product | Main hub leak | Switcher marker | `lang` |
|-----|--------|-----------------|---------------|-----------------|--------|
| `/` | 200 | Online IQ Test / IQ-Style | No | Yes | `en` |
| `/es` | 200 | Online IQ Test / IQ-Style | No | Yes + locale notice | `es` |
| `/fr` | 200 | Online IQ Test / IQ-Style | No | Yes + locale notice | `fr` |
| `/en` | **308** → `/` | Redirect (no `/en` page) | No | — | — |
| `/assessment` | 200 | Start IQ Test | No | Yes | `en` |
| `/es/assessment` | 200 | Start IQ Test | No | Yes + locale notice | `es` |

**Before deploy (stale):** `/es` and `/fr` returned main-site hub titles (“ScholarshipTop en español: busca, compara…”).  
**After deploy:** Same paths return IQ product title and `data-iq-product-shell` markers.

### Switcher

- Server HTML includes `data-iq-product-shell-locale` and `data-iq-language-switcher` markers on IQ paths.
- Link hrefs present in document: `/`, `/es`, `/fr` (locale-prefixed on ES/FR pages).
- **No** `href="/en"` in HTML.
- Label text “Español” / “Français” may hydrate client-side (`Navlinks` is `ssr: false`); “English” observed in `/es` HTML.

### Main-site hub leak

- Markers `ScholarshipTop en español: busca, compara` and French equivalent: **not present** on `/es` or `/fr` after deploy.
- IQ minimal nav (logo + switcher) — no full ScholarshipTop hub mega-menu in IQ product chrome.

### Notes

- `SiteFooter` may still expose localized scholarship links (e.g. `/es/scholarships`) — expected until IQ-specific footer in a later stage; not the pre-5C-1 **hub home** misroute.
- Question copy, landing body, paywall, and report remain **English** (5C-2 scope).

---

## Verdict

| | |
|--|--|
| **Deploy successful?** | **Yes** — routing fix live on production IQ host. |
| **Ready for 5C-2 (question bank)?** | **Yes** |

---

## Re-run smoke

```bash
npx tsx scripts/seo/i18n-stage5c-1-production-deploy-smoke.ts
```

(Local script is in repo working tree; not included in commit `3c02145` — optional follow-up commit if desired.)
