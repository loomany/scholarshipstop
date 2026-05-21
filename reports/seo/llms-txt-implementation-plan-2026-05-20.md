# `/llms.txt` implementation plan — ScholarshipTop (2026-05-20)

**Audit only — do not execute without approval.**

---

## 1. Recommended implementation method

**Option A: `public/llms.txt` + `public/llms-full.txt` (static files)** — **chosen**

| Option | Pros | Cons |
| --- | --- | --- |
| **A: public/** | Zero runtime cost; correct `text/plain` via Next static; versioned in git; no DB/auth | Manual updates |
| B: `app/llms.txt/route.ts` | Could add dynamic last-mod | Overkill; risk of accidental dynamic deps |
| C: Build-time generated | CI validation + static output | Extra script maintenance |

Next.js serves `public/llms.txt` at `https://scholarshiptop.com/llms.txt` automatically.

---

## 2. Files to add (when approved)

| File | Purpose |
| --- | --- |
| `public/llms.txt` | Compact AI guidance |
| `public/llms-full.txt` | Extended context |
| `scripts/seo/check-llms-txt.ts` | CI/local validation (optional but recommended) |

---

## 3. Files to avoid touching

- `app/robots.ts` — optional mention only; no change required
- `lib/seo/sitemaps.ts` — do not add llms URLs to sitemap
- `middleware.ts`, auth, billing, Supabase, RLS
- `next.config.mjs` redirects (unless conflict with `.txt` paths — unlikely)
- DB migrations, translation tables
- `.env*`

---

## 4. Route strategy

| URL | Handler |
| --- | --- |
| `/llms.txt` | `public/llms.txt` |
| `/llms-full.txt` | `public/llms-full.txt` |

No `app/llms.txt` route unless static serving fails in deployment (Railway/Vercel — verify once).

**Headers:** Rely on Next static defaults; if wrong MIME, add in `next.config.mjs`:

```js
{ source: '/llms.txt', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] }
```

**Caching:** `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` optional via headers.

---

## 5. Content draft source

Copy from:

- [llms-txt-proposed-content-2026-05-20.md](./llms-txt-proposed-content-2026-05-20.md)
- [llms-full-txt-proposed-content-2026-05-20.md](./llms-full-txt-proposed-content-2026-05-20.md)

Replace audit placeholders; set real `Last updated` date on publish.

---

## 6. Validation commands (proposed script)

```bash
# After adding public/llms.txt
npm run build
npx next start -p 3020

# HTTP checks
curl -sI http://localhost:3020/llms.txt | findstr /i "200 content-type"
curl -sI http://localhost:3020/llms-full.txt | findstr /i "200 content-type"

# Optional script
npx tsx scripts/seo/check-llms-txt.ts --base http://localhost:3020
```

### `scripts/seo/check-llms-txt.ts` (spec)

Assertions:

| Check | Rule |
| --- | --- |
| Status | 200 for `/llms.txt` and `/llms-full.txt` |
| Content-Type | contains `text/plain` |
| Size | `llms.txt` &lt; 12 KB; `llms-full.txt` &lt; 32 KB |
| Domain | only `https://scholarshiptop.com` URLs (no localhost in committed file) |
| Forbidden substrings | `/api/`, `/account`, `/signin`, `/onboarding`, `supabase`, `lemon`, `webhook`, `.env` |
| Required substrings | `scholarship-verification-methodology`, `financial-aid-disclaimer`, `sitemap.xml`, `does not award` |
| No `/en/` | regex `/en/` path segment excluded |
| ES/FR | contains `/es/` and `/fr/` mention |
| Core hubs | `/scholarships`, `/providers`, `/resources`, `/essays`, `/compare` |
| Cross-link | `llms.txt` references `llms-full.txt` |

---

## 7. Manual checks (pre-merge)

- [ ] Legal review disclaimers
- [ ] Product review premium bullets vs `/subscription`
- [ ] ES/FR pilot count = 53 paths (grep `STAGE2_PILOT_CANONICAL_PATHS`)
- [ ] No secrets in file
- [ ] Read aloud: "does this overclaim?"
- [ ] Compare with live trust pages for tone

---

## 8. Post-deploy checks (production)

```bash
curl -sI https://scholarshiptop.com/llms.txt
curl -sI https://scholarshiptop.com/llms-full.txt
curl -s https://scholarshiptop.com/llms.txt | head -40
```

- [ ] 200 + `text/plain`
- [ ] GSC URL Inspection (optional): indexed or excluded — either OK
- [ ] No 404 on referenced trust URLs
- [ ] Monitor logs for crawl spikes (benign)

---

## 9. SEO safety decisions

| Question | Recommendation |
| --- | --- |
| Indexable? | **Yes** (default static); or add `X-Robots-Tag: noindex` only if SERP snippet is unwanted |
| In sitemap? | **No** |
| robots.txt mention? | **Optional** comment not needed; `Allow: /` covers it |
| Content-Type | `text/plain; charset=utf-8` |
| Link to sitemap? | **Yes** in llms body |
| Sitemap link to llms? | **No** |
| Google index as page? | Possible; low impact plain text |
| Duplicate content? | **No** — different purpose than HTML |
| Security | **Review** exclusion list each release |

---

## 10. Maintenance rules and update triggers

### Content quality rules

`llms.txt` / `llms-full.txt` must:

- Be **factual** and aligned with trust pages
- Stay **concise** (compact file)
- **Not overpromise** (no guaranteed scholarships/acceptance/accuracy)
- **Not mention** private systems (Supabase, webhooks, internal workers)
- **Not claim** stale route lists — use patterns + sitemap
- Link only **canonical public** production URLs
- Include **disclaimers** and official-source policy
- Reflect **current language coverage** (ES/FR pilot)
- **Not list** unreviewed DB translated pages until published + sitemap-included

### Update triggers

| Event | Action |
| --- | --- |
| `STAGE2_PILOT_CANONICAL_PATHS` changes | Update Supported languages section + counts |
| New public hub (e.g. new section) | Add to Core pages / route groups |
| Methodology/disclaimer edit | Sync wording |
| Premium feature change | Update subscription summary |
| DB translation batch goes live | Add content-type to localized section; consider ES/FR llms addendum |
| Major noindex route added | Add to exclusion list |
| Domain change | Replace origin (unlikely) |

### Ownership

- **SEO/Content:** copy and disclaimers
- **Engineering:** validation script + deploy verify
- **Legal:** disclaimer sign-off on first ship + material changes

---

## 11. Rollout sequence

1. Approve audit + copy
2. Add `public/llms.txt` + `public/llms-full.txt`
3. Add `scripts/seo/check-llms-txt.ts` + npm script `check:llms-txt`
4. PR with validation in CI (optional job)
5. Deploy after ES/FR UI push (or with it) — see master recommendation
6. Post-deploy curl checks
7. Optional: add footer link "For AI assistants" → `/llms.txt` (product decision)

---

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Overclaim in copy | Legal review + checklist |
| Exposing private routes | Validation script forbidden patterns |
| Stale ES/FR description | English-only llms; reference pilot registry |
| SERP junk for "llms.txt" | Accept or noindex header |
| Competitors copy policy | Public by design |
