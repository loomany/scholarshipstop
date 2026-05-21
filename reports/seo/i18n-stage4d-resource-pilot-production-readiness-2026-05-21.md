# Stage 4D.2 — Resource pilot production readiness (2026-05-21)

**Purpose:** Rollout plan for 25-slug / 50-row `resource_article` pilot. **Production seed not executed** in this session.

**Constraints honored:** No commit, push, production seed, OpenAI, auth/payment/Lemon/RLS changes, `/en`, or new languages.

---

## 1. Git / deploy state

| Item | Value |
| --- | --- |
| **Branch** | `main` |
| **HEAD** | `d7b331f` — `fix(i18n): remove Stage 4D resourcePilot imports from P0 build paths` |
| **vs `origin/main`** | **In sync** (no unpushed commits) |

### A. P0 hotfix (committed + pushed)

| Commit | Summary | On `main` / `origin/main` |
| --- | --- | --- |
| `7e05078` | ES/FR hub parity, compare subhubs, switcher, static hubs | **Yes** |
| `d7b331f` | Remove `resourcePilot` imports from P0 build paths (Railpack fix) | **Yes** |

**P0 files (19 paths in `7e05078`):** compare/universities|states pages, `CompareIndexPageContent`, `ResourcesIndexPageContent` (P0-only hub), `EssaysIndexPageContent`, `EnglishZoneNotice`, nav/footer/switcher, `static*Hub`, `resolveNavLocale`, P0 report + `i18n-p0-live-regression-smoke.ts`.

**Live production signals (2026-05-21):** `/es/resources` and `/fr/resources` → **200**; category sitemaps present — consistent with **P0 + 4C deployed**.

### B. Stage 4D resource pilot (not committed / not deployed)

**Not on `main`:** entire `app/[locale]/resources/[slug]/` route, `lib/i18n/resourcePilot/*`, `LocalizedResourceArticlePage.tsx`, seed/sync/smoke scripts, 4D tests.

**Modified on disk (uncommitted), 4D-relevant:**

| Path | Role |
| --- | --- |
| `app/resources/[slug]/page.tsx` | EN hreflang for pilot slugs |
| `components/content-hub/ResourcesIndexPageContent.tsx` | ES/FR translated CMS grid (≥10 threshold) |
| `lib/i18n/localizedHref.ts` | Resource pilot language switcher |
| `lib/seo/sitemaps.ts` | `locale-{es,fr}-resources-db` buckets |

**Untracked 4D core:**

- `app/[locale]/resources/[slug]/page.tsx`
- `components/content-hub/LocalizedResourceArticlePage.tsx`
- `lib/i18n/resourcePilot/**`
- `lib/i18n/__tests__/resourcePilot.test.ts`
- `scripts/i18n/seed-resource-pilot-translations.ts`
- `scripts/i18n/sync-resource-pilot-posts-local.ts` (local-only; optional in deploy commit)
- `scripts/seo/i18n-stage4d-resource-pilot-smoke.ts`
- `scripts/seo/i18n-stage4d-prod-readonly-db-check.ts` (read-only helper; optional)
- `reports/seo/i18n-stage4d-resource-pilot-implementation-2026-05-21.md`
- `reports/seo/i18n-stage4d-resource-pilot-rows-2026-05-21.csv`
- Other `reports/seo/i18n-stage4d-*` audit/policy docs (optional separate docs commit)

### C. Env / local / unrelated (exclude from 4D commit)

| Path | Notes |
| --- | --- |
| `.env.local.prod-backup` | **Never commit** |
| `.env.local.bak-stage4d` | **Never commit** |
| `.cursor/settings.json` | IDE |
| `reports/seo/i18n-*-audit-2026-05-19.*` | Unrelated audit churn in working tree |
| `scripts/seo/i18n-stage4c4-production-deploy-smoke.ts` | 4C, not 4D |
| Local Docker data | N/A |

### `git status --short` (summary)

- **Modified:** 4 app/lib files + 6 audit JSON/MD (exclude audits from 4D commit)
- **Untracked:** all 4D pilot code, scripts, reports, env backups

### `git diff --stat` (tracked only)

```
10 files changed, 3373 insertions(+), 793 deletions(-)
```

(Inflated by locale-link audit JSON; **4D code diff ≈ 4 files + ~146 lines** excluding audits.)

---

## 2. Production DB — read-only (2026-05-21)

**Source:** `npx tsx scripts/seo/i18n-stage4d-prod-readonly-db-check.ts` (loads `.env.local.prod-backup` only; no writes).

| Check | Result |
| --- | --- |
| Project ref | `qlqlvhgosxhuibzhfsnh` |
| `scholarship_category` rows | **22** |
| `resource_article` rows | **0** |
| `scholarship_detail` / `provider` / `essay` / `compare` | **0** each |
| Distinct `source_type` in table | **`scholarship_category` only** |
| RLS anon published rows visible | **22** |
| RLS anon non-published rows visible | **0** |
| **RLS published-only** | **PASS** |
| Draft rows on server (admin sample) | **None** |

**Prod seed dry-run** (no `I18N_PILOT_ALLOW_DB_WRITES`, prod backup env):

```json
{ "dryRun": true, "target": "https://qlqlvhgosxhuibzhfsnh…", "rowCount": 50, "slugs": 25 }
```

All 25 published `content_posts` exist on production; CSV regenerated at `reports/seo/i18n-stage4d-resource-pilot-rows-2026-05-21.csv`.

---

## 3. Production pre-seed route behavior (live)

**Host:** `https://scholarshiptop.com` · **4D code not deployed** (no `locale-*-resources-db` in `/sitemap.xml`).

| URL | Status | Expected pre-seed |
| --- | ---: | --- |
| `/resources/avoid-scholarship-scams-targeting-families` | **200** | EN CMS OK |
| `/es/resources/avoid-scholarship-scams-targeting-families` | **404** | OK (no translation + route not live) |
| `/fr/resources/avoid-scholarship-scams-targeting-families` | **404** | OK |
| `/es/resources/verify-scholarship-winners-usa-previous-years` | **404** | OK (untranslated) |
| `/es/resources` | **200** | Hub OK (P0; no CMS grid until 4D+seed) |
| `/fr/resources` | **200** | Hub OK |
| `/sitemap.xml` | **200** | OK |

**Sitemap index (production):**

- Present: `locale-es-categories.xml`, `locale-fr-categories.xml` → **11 + 11** URLs each (4C intact).
- **Absent:** `locale-es-resources-db.xml`, `locale-fr-resources-db.xml` → **4D sitemap not deployed**.

**Pending deploy:** Stage 4D application code (routes, hub filter, sitemaps, switcher, EN alternates) must ship **before** post-seed ES/FR article URLs can return **200**.

---

## 4. Commit / deploy plan (4D only — do not run unless approved)

### Recommended commit scope

**Include (feat 4D.1):**

```
app/[locale]/resources/[slug]/page.tsx
app/resources/[slug]/page.tsx
components/content-hub/LocalizedResourceArticlePage.tsx
components/content-hub/ResourcesIndexPageContent.tsx
lib/i18n/localizedHref.ts
lib/i18n/resourcePilot/
lib/i18n/__tests__/resourcePilot.test.ts
lib/seo/sitemaps.ts
scripts/i18n/seed-resource-pilot-translations.ts
scripts/i18n/sync-resource-pilot-posts-local.ts
scripts/seo/i18n-stage4d-resource-pilot-smoke.ts
scripts/seo/i18n-stage4d-prod-readonly-db-check.ts
reports/seo/i18n-stage4d-resource-pilot-implementation-2026-05-21.md
reports/seo/i18n-stage4d-resource-pilot-rows-2026-05-21.csv
```

**Exclude:**

- `.env.local*`, `.cursor/`
- P0 files (already on `main`)
- `reports/seo/i18n-*-audit-2026-05-19.*` (unless intentionally refreshing audits)
- Auth / payment / Lemon / migrations / RLS

**Suggested message:**

```
feat(i18n): Stage 4D.1 resource_article pilot routes, hub, and sitemaps
```

### Deploy order (strict)

1. **Commit + push** 4D code to `main`.
2. **Wait for production build/deploy** (Railpack/Vercel/host).
3. **Pre-seed smoke (routes only):** confirm ES/FR pilot slugs still **404**, hubs **200**, new sitemap buckets **404 or empty** until seed.
4. **Explicit approval** → production seed (§5).
5. **Post-seed smoke** (§6).

**Do not seed before deploy** — translations without routes add no user value; order reduces confusion.

---

## 5. Production seed plan (not executed)

### Preconditions (operator checklist)

- [ ] 4D commit deployed to production
- [ ] Dry-run reviewed: **50 rows**, **25 slugs**, target `qlqlvhgosxhuibzhfsnh`
- [ ] `I18N_PILOT_ALLOW_PRODUCTION=1` set **only** for this run
- [ ] `.env.local` or shell env points at **production** URL + service role (from secure store, not committed)
- [ ] No `I18N_PILOT_USE_SHELL_ENV` unless intentionally skipping `.env.local`

### Step 1 — Dry-run (read-only write path)

```powershell
cd c:\dev\scholarshipstop
# Load production URL + SUPABASE_SERVICE_ROLE_KEY from secure env (e.g. .env.local.prod-backup locally)
# Do NOT set I18N_PILOT_ALLOW_DB_WRITES
npx tsx scripts/i18n/seed-resource-pilot-translations.ts
```

**Expect:** `dryRun: true`, `rowCount: 50`, `slugs: 25`, CSV written, no upserts.

### Step 2 — Apply (requires explicit approval)

```powershell
$env:I18N_PILOT_ALLOW_DB_WRITES = '1'
$env:I18N_PILOT_ALLOW_PRODUCTION = '1'
# Optional: verify URL host before running
# $env:NEXT_PUBLIC_SUPABASE_URL = 'https://qlqlvhgosxhuibzhfsnh.supabase.co'
npx tsx scripts/i18n/seed-resource-pilot-translations.ts
```

### Script guarantees (current code)

| Guard | Mechanism |
| --- | --- |
| Production writes blocked by default | `assertAllowedTarget()` without `I18N_PILOT_ALLOW_PRODUCTION=1` |
| Dry-run default | omit `I18N_PILOT_ALLOW_DB_WRITES` |
| `source_type` | `buildResourcePilotSeedRows()` → **`resource_article` only** |
| Row count | **50** = 25 slugs × 2 locales (throws if any slug missing on prod) |
| Slugs | `RESOURCE_PILOT_SLUGS` allowlist (25) |
| No other types | No code paths for scholarship_detail / provider / essay / compare |
| `quality_score` | **90** (≥ 85) |
| `status` | **`published`** only in seed data |
| OpenAI | **None** — `machine_model: stage4d-manual-pilot`, `translated_by: stage4d-seed-script` |
| Pre-write summary | JSON log + CSV before upsert loop |

**Gap (operator):** Script does not hard-code project ref; confirm dry-run `target` shows `qlqlvhgosxhuibzhfsnh` before step 2.

**Do not run** `sync-resource-pilot-posts-local.ts` on production (local Docker only).

---

## 6. Rollback — `resource_article` pilot rows only

**Preferred (pilot seed metadata):**

```sql
delete from public.content_translations
where source_type = 'resource_article'
  and locale in ('es', 'fr')
  and machine_model = 'stage4d-manual-pilot';
```

**Alternate (script attribution):**

```sql
delete from public.content_translations
where source_type = 'resource_article'
  and locale in ('es', 'fr')
  and translated_by = 'stage4d-seed-script';
```

**Verify after rollback:**

```sql
select source_type, count(*) from public.content_translations group by 1;
-- Expect: scholarship_category = 22, resource_article = 0
```

**English `/resources/*` and `content_posts`:** unchanged. **Category pilot (22 rows):** unchanged.

**Code rollback:** revert 4D deploy commit; redeploy. DB rollback above can run independently to hide ES/FR CMS articles while keeping code.

---

## 7. Post-seed smoke plan (after deploy + seed + approval)

**Base:** `https://scholarshiptop.com`  
**Script:** `$env:SCREENSHOT_BASE_URL='https://scholarshiptop.com'; npx tsx scripts/seo/i18n-stage4d-resource-pilot-smoke.ts`  
(Update script expectations: ES/FR pilot slugs → **200**, not 404.)

### HTTP status

| Check | Expect |
| --- | ---: |
| `/es/resources/avoid-scholarship-scams-targeting-families` | 200 |
| `/es/resources/types-of-scholarships-usa-explained` | 200 |
| `/es/resources/how-to-write-a-winning-scholarship-essay` | 200 |
| `/es/resources/scholarship-faq-low-gpa-students` | 200 |
| `/es/resources/verify-scholarship-emails-usa` | 200 |
| `/fr/resources/` (same 5 slugs) | 200 |
| `/es/resources/verify-scholarship-winners-usa-previous-years` | 404 |
| `/fr/resources/verify-scholarship-winners-usa-previous-years` | 404 |
| `/es/resources/not-real-resource-xyz` | 404 |

### Hub (production — required)

| Check | Expect |
| --- | --- |
| `/es/resources` | **200** |
| `/fr/resources` | **200** |
| Translated CMS section visible | Yes (≥10 ES/FR published `resource_article`) |
| English-only CMS cards on ES/FR | **No** |
| Untranslated slug absent from grid | Yes |

### SEO (sample pilot slug)

| Check | Expect |
| --- | --- |
| Self canonical on `/es/resources/{slug}` | `/es/resources/{slug}` |
| hreflang | `en`, `es`, `fr`, `x-default` |
| `/en` links | None |
| robots | index,follow (published translation policy) |
| `/sitemaps/locale-es-resources-db.xml` | **25** `<loc>` |
| `/sitemaps/locale-fr-resources-db.xml` | **25** `<loc>` |
| `/sitemaps/locale-es-categories.xml` | **11** (unchanged) |
| `/sitemaps/locale-fr-categories.xml` | **11** (unchanged) |
| Provider / essay / compare translated URLs in new buckets | **None** |

### Safety

| Check | Expect |
| --- | ---: |
| `/es/scholarships/how-to-apply-for-a-scholarship-step-by-step` | 404 |
| `/es/scholarships/category/stem` | 200 |
| `/es/scholarships/category/hobbies` | 404 |
| EN `/resources/{pilot-slug}` | 200 (unchanged) |

### Localized body

- ES/FR pages show Spanish/French disclaimer copy (no English body fallback).
- Manual spot-check one slug for FAQ + sections.

---

## 8. Blockers and readiness

| Blocker | Severity |
| --- | --- |
| **Stage 4D code not committed or deployed** | **Blocking** — no `[locale]/resources/[slug]`, no `resources-db` sitemaps on prod |
| **Production seed not approved** | **Blocking** — 0 `resource_article` rows (correct) |
| **Hub post-deploy verification** | **Required** after deploy; pre-deploy hubs already **200** on prod |
| **Seed before deploy** | **Avoid** — wrong operator order |

| Question | Answer |
| --- | --- |
| **Ready for production seed?** | **No** |
| **Ready after deploy + approval?** | **Yes**, with dry-run + rollback SQL above |
| **P0 safe to treat as done?** | **Yes** — on `main` / `origin/main`, live hubs OK |

### Recommended sequence (summary)

```
1. Commit/push 4D.1 code only
2. Deploy → verify sitemap buckets exist (empty OK pre-seed)
3. Dry-run seed on production
4. Approve → I18N_PILOT_ALLOW_DB_WRITES=1 I18N_PILOT_ALLOW_PRODUCTION=1 seed
5. Post-seed production smoke + hub check
6. Document in i18n-stage4d-resource-pilot-implementation or new deploy-smoke report
```

---

## 9. References

- Local verification: `reports/seo/i18n-stage4d-resource-pilot-implementation-2026-05-21.md`
- P0 deploy notes: `reports/seo/i18n-p0-hotfix-post-deploy-smoke-2026-05-21.md`
- Category rollback pattern: `reports/seo/i18n-stage4c-production-apply-category-pilot-2026-05-21.md`
