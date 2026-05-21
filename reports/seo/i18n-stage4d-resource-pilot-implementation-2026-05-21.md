# Stage 4D.1 — Resources CMS pilot implementation (2026-05-21)

**Status:** Local sync + seed + pilot HTTP smoke **completed** (2026-05-21). Hub index smoke **blocked on local Docker** by pre-existing schema drift (not 4D-specific).

**Constraints honored:** No commit, push, production writes, OpenAI, or `/en`.

---

## 1. Selected 25 slugs (curated audit list)

| # | slug |
| --- | --- |
| 1 | `avoid-scholarship-scams-targeting-families` |
| 2 | `types-of-scholarships-usa-explained` |
| 3 | `how-to-write-a-winning-scholarship-essay` |
| 4 | `how-to-proofread-scholarship-essay` |
| 5 | `how-to-write-a-thank-you-letter-after-winning-a-scholarship` |
| 6 | `how-to-get-recommendation-letters-for-scholarships` |
| 7 | `four-year-scholarship-plan-college` |
| 8 | `track-scholarship-deadlines-usa` |
| 9 | `best-scholarship-tracker-templates-students` |
| 10 | `verify-scholarship-emails-usa` |
| 11 | `trustworthy-scholarship-review-online` |
| 12 | `scholarship-faq-low-gpa-students` |
| 13 | `scholarship-faq-comparing-multiple-offers` |
| 14 | `scholarship-faq-no-recommendation-letters` |
| 15 | `scholarship-faq-applying-late` |
| 16 | `organize-scholarship-applications-by-difficulty` |
| 17 | `organize-scholarship-applications-notion` |
| 18 | `how-to-track-scholarships-international-students` |
| 19 | `how-to-find-scholarships-for-international-students` |
| 20 | `how-to-write-scholarship-essay-as-international-student` |
| 21 | `how-to-get-full-scholarship-usa` |
| 22 | `graduate-scholarship-application-checklist` |
| 23 | `verify-scholarship-eligibility-usa` |
| 24 | `scholarship-faq-school-students-applying-early` |
| 25 | `scholarship-faq-parents-worried-scams` |

**Not reduced to 10:** All 25 received manual/Codex ES+FR copy in `pilotArticlesCore.ts` (4–5 sections + 3 FAQ each; disclaimer; no invented providers/URLs).

---

## 2. Files changed / added

| Area | Path |
| --- | --- |
| Route | `app/[locale]/resources/[slug]/page.tsx` |
| Render | `components/content-hub/LocalizedResourceArticlePage.tsx` |
| Pilot lib | `lib/i18n/resourcePilot/*` (slugs, resolve, alternates, list, seed data, `pilotArticlesCore.ts`) |
| EN hreflang | `app/resources/[slug]/page.tsx` |
| Language switcher | `lib/i18n/localizedHref.ts` |
| Sitemap | `lib/seo/sitemaps.ts` → `locale-{es,fr}-resources-db` |
| Hub | `components/content-hub/ResourcesIndexPageContent.tsx`, `lib/i18n/hubUiCopy.ts` |
| Seed | `scripts/i18n/seed-resource-pilot-translations.ts` |
| Local sync helper | `scripts/i18n/sync-resource-pilot-posts-local.ts` |
| Smoke | `scripts/seo/i18n-stage4d-resource-pilot-smoke.ts` |
| Tests | `lib/i18n/__tests__/resourcePilot.test.ts` |
| Rows CSV | `reports/seo/i18n-stage4d-resource-pilot-rows-2026-05-21.csv` |

---

## 3. Seed strategy

- **Source IDs:** resolved from `content_posts.id` by slug at seed time (not slug as `source_id`).
- **Dry-run default;** writes require `I18N_PILOT_ALLOW_DB_WRITES=1`.
- **Production blocked** unless `I18N_PILOT_ALLOW_PRODUCTION=1`.
- **`I18N_PILOT_USE_SHELL_ENV=1`** skips loading `.env.local` (for local Docker targets).
- **50 rows:** `resource_article` × 25 slugs × `es`/`fr`, `status=published`, `quality_score=90`, `machine_model=stage4d-manual-pilot`.
- **Prod dry-run (read-only):** confirmed all 25 slugs exist → 50 rows in CSV.

---

## 4. Route behavior

| URL | Behavior |
| --- | --- |
| `/resources/{slug}` | Unchanged EN `content_posts` / static guides |
| `/es/resources/{slug}` | If Stage 2 static pilot page exists → `LocalizedProductionPage`; else published `resource_article` translation required or **404** |
| `/fr/resources/{slug}` | Same |
| Missing / draft / low quality | **404**, no EN body fallback |

---

## 5. Sitemap behavior

- New buckets: `locale-es-resources-db`, `locale-fr-resources-db` (only published `resource_article`, quality ≥ 85, pilot slug allowlist).
- Static `locale-{es,fr}-resources` pilot sitemap **unchanged** (Stage 2 guides).
- EN `resources` bucket still lists all published EN posts + static guides.

---

## 6. Hreflang behavior

- `buildResourcePilotAlternates()` — cluster `en` + published `es`/`fr` only; `x-default` → English.
- EN CMS articles in pilot set get dynamic alternates when translations exist.
- Language switcher: `localizedResourcePilotArticleHref()` for pilot CMS slugs.

---

## 7. ES/FR resources hub decision

- **Threshold:** show DB grid when ≥ **10** published `resource_article` translations exist for that locale (pilot seeds 25 → grid **on** after seed).
- **Filter:** only `content_posts.id` with published translation for that locale (no English-only cards).
- **Static guides:** always visible.
- **Section header:** `translatedDbEyebrow` / `translatedDbTitle` on ES/FR when grid shown.

---

## 8. Environment safety (2026-05-21)

| Check | Result |
| --- | --- |
| Writes target | `http://127.0.0.1:54321` only (sync + seed) |
| `I18N_PILOT_ALLOW_PRODUCTION=1` | **Not set** |
| Prod backup | `.env.local.prod-backup` unchanged; used **read-only** for sync source |
| `.env.local` | Not loaded for writes (`I18N_PILOT_USE_SHELL_ENV=1`) |
| Process env override | Cleared stale `NEXT_PUBLIC_SUPABASE_ANON_KEY` before build/start |
| Production `resource_article` seed | **Not run** |

---

## 9. Local sync result (2026-05-21)

**Script:** `scripts/i18n/sync-resource-pilot-posts-local.ts`

| Item | Result |
| --- | --- |
| Prod read | 25 published `content_posts` (pilot slugs) |
| Local write | **25 rows** upserted |
| Pilot topic bootstrap | `content_topics` row `stage4d-resource-pilot-local` (local schema requires `topic_id`) |
| Fixes applied | Default local JWT typo (`JyZi` → `JWT`); `normalizePostForLocalSchema()` for local NOT NULL columns |

---

## 10. Local seed result (2026-05-21)

**Script:** `scripts/i18n/seed-resource-pilot-translations.ts`

```text
target: http://127.0.0.1:54321
rowCount: 50
Upserted 50 resource_article translation rows.
```

| Item | Result |
| --- | --- |
| `source_type` | `resource_article` only (new rows) |
| `status` | `published` |
| `quality_score` | 90 (≥ 85) |
| Locales | 25 × `es` + 25 × `fr` |

---

## 11. Local DB verification

| Table / filter | Count |
| --- | ---: |
| `content_posts` (published, synced) | **25** |
| `content_translations` (`resource_article`) | **50** |
| `content_translations` (`scholarship_category`, unchanged) | **22** |
| Other `source_type` | **0** |

RLS: anon reads still **published-only** (pilot routes use public client + app gates).

---

## 12. Build / tsc / tests

| Check | Result |
| --- | --- |
| `npm run build` | **PASS** (`ƒ /[locale]/resources/[slug]`, sitemap buckets) |
| `npx tsc --noEmit` | **PASS** |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **PASS** (79 tests, incl. resource pilot + switcher) |
| `npx next start -p 3020` | **PASS** (local Supabase env) |

---

## 13. Resource pilot HTTP smoke (`i18n-stage4d-resource-pilot-smoke.ts`)

**Base:** `http://localhost:3020` · **DB:** local seeded

| Check | Result |
| --- | --- |
| `/es/resources/{pilot-slug}` × 5 | **200** |
| `/fr/resources/{pilot-slug}` × 5 | **200** |
| `/es|fr/resources/verify-scholarship-winners-usa-previous-years` | **404** |
| ES fake slug | **404** |
| ES canonical self | **OK** |
| hreflang `en` / `es` / `fr` + `x-default` | **OK** |
| No `/en` links on ES article | **OK** |
| Localized disclaimer heuristic (no EN body) | **OK** |
| `locale-es-resources-db.xml` | **25** `<loc>` |
| `locale-fr-resources-db.xml` | **25** `<loc>` |
| `/es/scholarships/category/stem` | **200** |
| `/fr/scholarships/category/stem` | **200** |
| `/es/scholarships/category/hobbies` | **404** |
| `/es/scholarships/{detail}` without translation | **404** |
| `/resources/verify-scholarship-emails-usa` (EN) | **500** (local only, see §15) |
| **Smoke script exit** | **1 failure** (EN slug only) |

---

## 14. Hub / static guides (manual)

| URL | Result | Notes |
| --- | --- | --- |
| `/es/resources` | **500** | Local schema drift on hub parallel fetch (§15) |
| `/fr/resources` | **500** | Same |
| `/es/resources/how-to-find-scholarships` (static Stage 2) | **200** | |
| `/fr/resources/how-to-find-scholarships` | **200** | |
| Hub translated-only filter | **Not HTTP-verified locally** | Code path restored in `ResourcesIndexPageContent.tsx`; verify on staging/prod-linked env |

---

## 15. Local schema caveats (not 4D regressions)

Local Docker is behind hosted schema for unrelated tables:

- `scholarships.ai_match_score` missing → **500** on some EN `/resources/{slug}` pages that load related scholarships.
- `essays.hero_is_real` missing → **500** on `/es/resources` and `/fr/resources` hub (essay sidebar fetch).

**4D pilot ES/FR CMS article routes and sitemaps do not depend on these columns** and passed smoke.

---

## 16. Git safety (no commit)

| Item | Status |
| --- | --- |
| `.env` / secrets committed | **No** (untracked backups only: `.env.local.prod-backup`, `.env.local.bak-stage4d`) |
| Prod dumps | **No** |
| Auth / payment / Lemon / RLS | **No changes** |
| OpenAI | **No** |
| Unrelated audit JSON churn | Present in working tree (pre-existing local audit runs) |

**4D-relevant unstaged paths:** `app/[locale]/resources/`, `lib/i18n/resourcePilot/`, `LocalizedResourceArticlePage.tsx`, `ResourcesIndexPageContent.tsx`, `localizedHref.ts`, `sitemaps.ts`, `scripts/i18n/*resource*`, `scripts/seo/i18n-stage4d-resource-pilot-smoke.ts`, reports/CSV.

---

## 17. No production writes confirmation

- Sync: **prod read-only**, local write only.
- Seed: **`http://127.0.0.1:54321` only**; `I18N_PILOT_ALLOW_PRODUCTION` not used.
- No `resource_article` rows written to hosted production in this session.

---

## 18. What was not touched

- Auth, payment, Lemon
- Scholarship detail gates (still 404 without translation)
- Category pilot data (22 rows intact)
- Providers / essays / compare DB translation
- OpenAI / bulk MT

---

## 19. Operator replay (local)

```powershell
# Prod keys → PROD_* ; local demo service role JWT for 127.0.0.1:54321
$env:I18N_PILOT_ALLOW_DB_WRITES='1'
$env:I18N_PILOT_USE_SHELL_ENV='1'
$env:PROD_SUPABASE_URL='https://<ref>.supabase.co'
$env:PROD_SERVICE_ROLE_KEY='<from .env.local.prod-backup>'
$env:LOCAL_SUPABASE_URL='http://127.0.0.1:54321'
$env:LOCAL_SERVICE_ROLE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
npx tsx scripts/i18n/sync-resource-pilot-posts-local.ts

$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321'
$env:SUPABASE_SERVICE_ROLE_KEY=$env:LOCAL_SERVICE_ROLE_KEY
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
npx tsx scripts/i18n/seed-resource-pilot-translations.ts

Remove-Item Env:NEXT_PUBLIC_SUPABASE_ANON_KEY -ErrorAction SilentlyContinue
npm run build
npx next start -p 3020
$env:SCREENSHOT_BASE_URL='http://localhost:3020'
npx tsx scripts/seo/i18n-stage4d-resource-pilot-smoke.ts
```

---

## 20. Final verdict

| Question | Answer |
| --- | --- |
| **Stage 4D.1 accepted?** | **Yes — pilot scope** (ES/FR CMS articles, 404 gates, hreflang, sitemaps, local DB seed). **Caveat:** ES/FR hub index not HTTP-verified on local Docker (schema drift); re-check on staging after deploy. |
| **Ready for production resource seed?** | **Yes — after code deploy** to production, with explicit `I18N_PILOT_ALLOW_PRODUCTION=1` + same seed script guards as 4C.3. Do **not** seed before routes/hub/sitemap code is live. |
| **Ready for resources batch 26–50?** | **No** — deploy 4D.1 + prod seed + post-deploy smoke first. |

**Recommendation:** Ship 4D.1 code → production seed (50 rows) → post-deploy smoke on `scholarshiptop.com` including `/es/resources` hub and one EN pilot slug → then plan batch 26–50.
