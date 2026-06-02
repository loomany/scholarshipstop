# Stage 4D — Resources CMS translation pilot audit (2026-05-21)

**Type:** Audit / plan only  
**Constraints honored:** No commit, push, production writes, seed, OpenAI, resource sitemap changes, auth/payment/Lemon, `/en`, new languages.

---

## 1. Executive summary

Stage 4C (category pilot) is **live and stable** in production: `content_translations` exists, **22** `scholarship_category` rows, ES/FR category URLs and sitemaps verified. **Zero** `resource_article` rows — expected.

The resources stack is **ready for Stage 4D implementation planning**, not for bulk translation. EN serves **900** published CMS articles under `/resources/[slug]` plus **9** file-based static guides and **5** dedicated static routes (already covered by Stage 2 ES/FR static pilots). **CMS articles have no ES/FR route today** — correct 404 behavior until 4D code ships.

**Verdict:** **Ready for Stage 4D implementation** (code + curated seed), **not** ready for unattended bulk MT across the full catalog.

---

## 2. Is the resources pilot ready to implement?

| Prerequisite | Status |
| --- | --- |
| `content_translations` schema + RLS | ✅ Production |
| Category pilot pattern (gate, sitemap, hreflang) | ✅ Proven |
| `source_type = resource_article` in constraint | ✅ |
| EN resource routes stable | ✅ |
| ES/FR static resource pilots | ✅ Separate from CMS |
| CMS `/es/resources/[slug]` route | ❌ **Must build** |
| Seed script for resources | ❌ **Must build** |
| Quality gate script | ❌ **Must build** |
| Hub grid policy for ES/FR | ❌ **Must decide** (recommend filtered hub in 4D.1) |

**Answer: Yes — proceed to Stage 4D.1 implementation** after this audit is accepted.

---

## 3. Candidate list summary

- **Inventory:** 900 published `content_posts` with slug; all indexable in EN sitemap today.
- **CSV:** `reports/seo/i18n-stage4d-resources-pilot-candidates-2026-05-21.csv` (scored; automated top ranks skew to `verify-*` / `organize-*` families).
- **Recommended curated batch:** **25** slugs (diverse pillars, FAQs, one checklist, limited verify/organize) — see `i18n-stage4d-resources-pilot-inventory-2026-05-21.md`.
- **Second wave:** **50** total (add 25 more FAQ / international / tool articles; avoid template checklist clusters).

---

## 4. Recommended first batch size

**25 articles × ES + FR = 50 `content_translations` rows.**

Rationale: matches category pilot risk discipline; reviewable in one editorial cycle; enough for locale sitemap smoke without flooding mixed-language hub.

Stretch **50** only after 4D.1 deploy smoke passes and review capacity confirmed.

---

## 5. Route / render plan

1. Add `app/[locale]/resources/[slug]/page.tsx` (or extend catch-all with explicit segment) — **not** static pilot registry.
2. `resolveLocalizedResourceArticlePage(locale, slug)`:
   - Load EN post by slug; if missing → 404
   - `getPublishedContentTranslation({ sourceType: 'resource_article', sourceId: post.id, locale })`
   - If not published → **404** (no EN fallback)
3. Reuse EN layout components: `SafeContentPostBody`, TOC, FAQ accordion, schema builders — feed **translated** strings.
4. Related scholarships + auto-internal-links: keep EN hrefs to scholarships; optional localize `/resources/` links when target translation exists.
5. Hub: filter list to translated IDs for ES/FR until ≥ 10–25 published per locale.

Detail: `i18n-stage4d-resources-pilot-inventory-2026-05-21.md`, SEO: `i18n-stage4d-resource-seo-policy-2026-05-21.md`.

---

## 6. SEO / sitemap / hreflang plan

- Self-canonical on `/es|fr/resources/{slug}` when indexable.
- `robots`: index/follow only if EN post indexable + translation published + `quality_score >= 85`.
- Hreflang: `en`, `es`, `fr`, `x-default` — include only published locales; add EN alternates on CMS EN pages when ES or FR is live.
- New sitemap builders: `locale-es-resources-db`, `locale-fr-resources-db` — **whitelist** published translation rows only.
- Keep EN `resources` bucket unchanged (all posts + static guides).
- Do not add unpublished or draft URLs to any sitemap.

---

## 7. Translation method plan

| Phase | Method |
| --- | --- |
| **4D.1 (first 25)** | **Manual / Codex** authored ES/FR |
| **4D.2 (26–50)** | **Hybrid** — optional OpenAI draft + human review |

**OpenAI:** Defer bulk unattended MT for batch 1. Estimated MT cost for 50 rows (25×2) ~ **$12–15** API-only; real cost is **40–80 h** editorial review.

Full spec: `i18n-stage4d-resource-translation-method-plan-2026-05-21.md`.

---

## 8. Cost / review estimate

| Item | 25 articles (50 rows) | 50 articles (100 rows) |
| --- | --- | --- |
| OpenAI MT (if used later) | ~$12–15 | ~$25–30 |
| Codex/manual authoring | 40–80 h review | 80–160 h |
| Engineering (route + seed + smoke) | ~2–4 days | +1–2 days |

---

## 9. Quality gates

See `i18n-stage4d-resource-quality-gates-2026-05-21.md` — language detection, meta lengths, link host allowlist, FAQ JSON, disclaimer retention, `quality_score >= 85`, no localhost URLs, no hallucinated facts.

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| Factual / scam-advice drift in MT | Manual batch 1; hybrid with flags |
| Stale deadline content | Exclude month/year slugs from batch 1 |
| Template-near duplicate articles | Curated list; cap verify/organize families |
| Mixed-language `/es/resources` hub | Filter hub to translated posts only in 4D.1 |
| Internal link rot | Link gate: localize `/resources/` only when target published |
| Large HTML body breakage | Same sanitizer as EN; HTML-aware QA |
| Accidental full-catalog sitemap | Whitelist builder by translation row IDs |
| Double coverage static vs DB | Slug collision check before seed |

---

## 11. What not to touch

- Auth, payment, Lemon Squeezy
- Scholarship **detail** translation / gates (stay 404 on ES/FR)
- `/en` routes
- New locales beyond `es` / `fr`
- Category pilot rows (22) except staleness if EN category copy changes
- Production DB writes in audit phase (completed read-only only)
- OpenAI jobs in audit phase

---

## 12. Next implementation TZ (recommended)

**Stage 4D.1 — Implementation ticket**

1. `lib/i18n/resourcePilot/` — resolve page, metadata, hreflang helper
2. `app/[locale]/resources/[slug]/page.tsx` — 404 gate, render translated body
3. EN `app/resources/[slug]/page.tsx` — optional hreflang when translations exist
4. `buildLocalizedResourceArticleSitemapDocuments()` in `lib/seo/sitemaps.ts`
5. `ResourcesIndexPageContent` — `locale !== 'en'` filter to translated slugs
6. `scripts/i18n/seed-resource-pilot-translations.ts` — 50 rows, Codex JSON input files
7. `scripts/seo/i18n-resource-pilot-smoke.ts`
8. `scripts/seo/i18n-verify-resource-translation-gates.ts`
9. Apply seed only with explicit production approval (mirror 4C.3 guards)

**Stage 4D.2:** Expand to 50 articles; introduce optional OpenAI draft pipeline for 26–50.

---

## Final answer

| Question | Answer |
| --- | --- |
| Ready for Stage 4D **implementation**? | **Yes** |
| Ready for **bulk** MT / full catalog? | **No** |
| First batch size | **25** articles (50 translation rows) |
| OpenAI vs manual first | **Manual / Codex first**; OpenAI hybrid only after batch 1 gates |

---

## Artifacts

| Report |
| --- |
| `reports/seo/i18n-stage4d-resources-pilot-inventory-2026-05-21.md` |
| `reports/seo/i18n-stage4d-resources-pilot-candidates-2026-05-21.csv` |
| `reports/seo/i18n-stage4d-resource-field-map-2026-05-21.md` |
| `reports/seo/i18n-stage4d-resource-seo-policy-2026-05-21.md` |
| `reports/seo/i18n-stage4d-resource-translation-method-plan-2026-05-21.md` |
| `reports/seo/i18n-stage4d-resource-quality-gates-2026-05-21.md` |
| `scripts/seo/i18n-stage4d-resources-pilot-inventory.ts` (read-only regenerator) |

**Production read-only (2026-05-21):** `content_translations` total **22**, `resource_article` **0**, category routes live on production.
