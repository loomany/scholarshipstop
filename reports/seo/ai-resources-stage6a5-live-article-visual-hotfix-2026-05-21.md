# AI Resources Stage 6A.5 — Live article visual/content hotfix

**URL:** https://scholarshiptop.com/resources/best-scholarship-websites  
**Slug:** `best-scholarship-websites`  
**Post ID:** `07caa51c-695b-4605-9a3d-24f2688551c0`

## Guardrails

| Action | Run? |
|--------|------|
| Generation / batch 29–30 | No |
| Other articles | No |
| ES/FR | No |
| Schema / RLS / migrations | No |
| Git commit / push | No |

## Fixes applied

### 1. Placeholder `In 3–5 bullets:` (DB)

- Removed from [`data/content/polished/best-scholarship-websites-2026-05-21.md`](../../data/content/polished/best-scholarship-websites-2026-05-21.md)
- Re-applied to production via `ai-resources-stage6a2-polish-post.ts --write` (body only; `status` stayed `published`)
- **DB verify:** `hasPlaceholder: false`, `internalLinks: 32`, `word_count: 1305`
- **Production (after revalidate):** `3–5 bullets` phrase **not** in HTML

### 2. IQ Featured Tool CTA (code — needs deploy)

- **Cause:** `ResourceArticleIqCta` preview box renders literal `Type` / `???` placeholders; badges read as noisy glued text in SR/overflow.
- **Fix:** Hide IQ CTA + related-section IQ ad for `categoryId === 'ai'` in [`app/resources/[slug]/page.tsx`](../../app/resources/[slug]/page.tsx) via [`lib/content-hub/filterResourceArticleRelatedScholarships.ts`](../../lib/content-hub/filterResourceArticleRelatedScholarships.ts)
- **Production now:** IQ block still present until Next.js deploy (`resource-article-iq-cta` in HTML)

### 3. TOC noise (code — needs deploy)

- [`lib/content-hub/resourceArticleBodyToc.ts`](../../lib/content-hub/resourceArticleBodyToc.ts): `RESOURCE_ARTICLE_TOC_OPTIONS` — **H2-only** TOC; exclude Quick Summary, FAQ H2, scholarship CTA H2 patterns
- Wired in EN + localized resource article pages
- Unit test: [`lib/content-hub/__tests__/resourceArticleBodyToc.test.ts`](../../lib/content-hub/__tests__/resourceArticleBodyToc.test.ts) — pass

### 4. Related Scholarships — expired (code — needs deploy)

- Filter out `deadline passed` items in resource article page before render (stored + hub catalog cards)
- If all related are expired, section falls back to browse CTA (same as empty)

### 5. Amount `$9.000` → `$9,000` en-US (code — needs deploy)

- [`app/scholarships/scholarshipsData.ts`](../../app/scholarships/scholarshipsData.ts): `formatScholarshipAwardDisplay(raw, locale?)` uses `toLocaleString` (`en-US` / `es-ES` / `fr-FR`)
- [`components/scholarships/ScholarshipCard.tsx`](../../components/scholarships/ScholarshipCard.tsx): passes UI locale
- [`components/content-hub/ContentHubArticleMatchedScholarships.tsx`](../../components/content-hub/ContentHubArticleMatchedScholarships.tsx): formats `award_amount_text` for EN stacked cards

### 6. Mid-article scholarship CTA not H2 (code — needs deploy)

- [`components/content-hub/ContentHubScholarshipCta.tsx`](../../components/content-hub/ContentHubScholarshipCta.tsx): title changed from `<h2>` to `<p>` (same visual weight); no longer pollutes heading outline / TOC

## QA (local)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass (after clean `.next`) |
| TOC unit test | Pass |

## Production smoke (2026-05-21)

| Check | Status | Notes |
|-------|--------|-------|
| URL 200 | OK | |
| No `In 3–5 bullets` | OK | After ISR revalidate |
| No `Type ???` | Pending deploy | IQ CTA still on prod HTML |
| TOC clean | Pending deploy | |
| No expired related | Pending deploy | `deadline passed` still in prod HTML |
| `$9,000` not `$9.000` | Pending deploy | Both strings seen until deploy |
| Internal links | OK | 32 in DB |
| Canonical / meta | OK | Unchanged |
| `/es/...` `/fr/...` | 404 | Expected |

**Revalidate run:** `scripts/ai-resources-stage6a5-revalidate-pilot.ts` — OK for article + hub paths.

## Files touched (hotfix scope)

| Area | Files |
|------|--------|
| Content | `data/content/polished/best-scholarship-websites-2026-05-21.md` |
| DB | via `scripts/ai-resources-stage6a2-polish-post.ts --write` |
| TOC | `lib/content-hub/resourceArticleBodyToc.ts`, `LocalizedResourceArticlePage.tsx` |
| IQ / related | `filterResourceArticleRelatedScholarships.ts`, `app/resources/[slug]/page.tsx` |
| CTA / awards | `ContentHubScholarshipCta.tsx`, `scholarshipsData.ts`, `ScholarshipCard.tsx`, `ContentHubArticleMatchedScholarships.tsx` |
| Ops | `scripts/ai-resources-stage6a5-revalidate-pilot.ts` |

## Git status

- **HEAD (remote):** `4094320` — unchanged (no commit)
- **Local:** hotfix files modified + new helpers/scripts; unrelated i18n/IQ/middleware noise still present

## Next step

Deploy Next.js commit containing Stage 6A.5 UI files, then re-run revalidate and confirm prod HTML: no IQ CTA, clean TOC, no `deadline passed` in related, `$9,000` formatting.
