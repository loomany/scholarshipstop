# Stage 4D.3 — Resource pilot code-only commit + deploy gate (2026-05-21)

**Scope:** Commit and push Stage 4D.1 **code only**. **No production seed**, no Supabase writes, no OpenAI.

---

## 1. Git safety — file classification

### A. Included in commit `18c91b7` (22 files)

| Area | Paths |
| --- | --- |
| Routes | `app/[locale]/resources/[slug]/page.tsx`, `app/resources/[slug]/page.tsx` |
| UI | `components/content-hub/LocalizedResourceArticlePage.tsx`, `ResourcesIndexPageContent.tsx` |
| Pilot lib | `lib/i18n/resourcePilot/*` (8 modules) |
| Switcher | `lib/i18n/localizedHref.ts` |
| Tests | `lib/i18n/__tests__/resourcePilot.test.ts` |
| Sitemap | `lib/seo/sitemaps.ts` |
| Scripts | `scripts/i18n/seed-resource-pilot-translations.ts`, `sync-resource-pilot-posts-local.ts`, `scripts/seo/i18n-stage4d-resource-pilot-smoke.ts`, `i18n-stage4d-prod-readonly-db-check.ts` |
| Reports | `i18n-stage4d-resource-pilot-implementation-2026-05-21.md`, `i18n-stage4d-resource-pilot-production-readiness-2026-05-21.md`, `i18n-stage4d-resource-pilot-rows-2026-05-21.csv` |

### B. Excluded (env / local)

| Path | Reason |
| --- | --- |
| `.env.local.prod-backup` | Secrets |
| `.env.local.bak-stage4d` | Local env |
| `.cursor/settings.json` | IDE |

### C. Excluded (unrelated / already deployed / audit churn)

| Path | Reason |
| --- | --- |
| `reports/seo/i18n-*-audit-2026-05-19.*` | Unrelated audit reruns (still modified, unstaged) |
| `reports/seo/i18n-p0-hotfix-post-deploy-smoke-2026-05-21.md` | P0 already on `main` |
| `reports/seo/i18n-stage4c-category-pilot-deploy-smoke-2026-05-21.md` | 4C |
| `reports/seo/i18n-stage4d-resource-{field-map,quality-gates,seo-policy,translation-method-plan}*` | Pre-implementation audit docs |
| `reports/seo/i18n-stage4d-resources-pilot-{audit,inventory,candidates}*` | Inventory/audit only |
| `scripts/seo/i18n-stage4c4-production-deploy-smoke.ts` | 4C |
| `scripts/seo/i18n-stage4d-resources-pilot-inventory.ts` | Inventory only |

---

## 2. Pre-commit checks

| Check | Result |
| --- | --- |
| `npm run build` (stale `NEXT_PUBLIC_SUPABASE_ANON_KEY` cleared) | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **PASS** (79 tests) |
| `npx tsx scripts/seo/i18n-stage4d-prod-readonly-db-check.ts` | **PASS** — `resource_article: 0`, `scholarship_category: 22`, RLS published-only |

---

## 3. Commit

| Item | Value |
| --- | --- |
| **Hash** | `18c91b7` |
| **Message** | `feat(i18n): add ES FR resource article pilot routes` |
| **Stats** | 22 files, +4996 / −15 lines |

### `git show --stat --oneline HEAD` (summary)

```
18c91b7 feat(i18n): add ES FR resource article pilot routes
 app/[locale]/resources/[slug]/page.tsx
 components/content-hub/LocalizedResourceArticlePage.tsx
 lib/i18n/resourcePilot/* (8 files)
 lib/i18n/__tests__/resourcePilot.test.ts
 scripts/i18n/seed-resource-pilot-translations.ts
 scripts/i18n/sync-resource-pilot-posts-local.ts
 scripts/seo/i18n-stage4d-*.ts (smoke + prod readonly)
 reports/seo/i18n-stage4d-resource-pilot-*.{md,csv}
 (+ modified: app/resources/[slug], ResourcesIndexPageContent, localizedHref, sitemaps)
```

### Commit hygiene

| Check | Result |
| --- | --- |
| `.env` / secrets in commit | **None** |
| Production seed executed | **No** |
| Auth / payment / Lemon / RLS | **No changes** |
| Unexpected files | **None** |

---

## 4. Push / deploy

| Item | Result |
| --- | --- |
| **Push** | `d7b331f..18c91b7  main -> origin/main` (**success**) |
| **Production seed** | **Not run** |
| **Hosting deploy** | Triggered by push; allow a few minutes for full propagation |

---

## 5. Live pre-seed smoke (production, no seed)

**Host:** `https://scholarshiptop.com` · **Checked:** shortly after push.

| URL | Status | Expected |
| --- | ---: | --- |
| `/resources/avoid-scholarship-scams-targeting-families` | **200** | EN CMS |
| `/es/resources/avoid-scholarship-scams-targeting-families` | **404** | No `resource_article` row |
| `/fr/resources/avoid-scholarship-scams-targeting-families` | **404** | No `resource_article` row |
| `/es/resources/verify-scholarship-winners-usa-previous-years` | **404** | Untranslated |
| `/fr/resources/verify-scholarship-winners-usa-previous-years` | **404** | Untranslated |
| `/es/resources` | **200** | Hub |
| `/fr/resources` | **200** | Hub |
| `/sitemap.xml` | **200** | Index |
| `/es/scholarships/category/stem` | **200** | 4C category |
| `/fr/scholarships/category/stem` | **200** | 4C category |
| `/es/scholarships/how-to-apply-for-a-scholarship-step-by-step` | **404** | Detail safety |

### Sitemap buckets (pre-seed)

| URL | Status | Notes |
| --- | ---: | --- |
| `/sitemaps/locale-es-resources-db.xml` | **404** | **Expected** — `buildLocaleResourceDbSitemapDocuments()` skips buckets when `entries.length === 0` (no seeded translations) |
| `/sitemaps/locale-fr-resources-db.xml` | **404** | Same |
| `/sitemap.xml` index | No `resources-db` child yet | **Expected pre-seed** |

After production seed, expect index to list `locale-{es,fr}-resources-db.xml` with **25** URLs each.

### Post-deploy re-check (optional)

If ES pilot slug stays 404 after seed approval, re-run smoke. If hubs regress to 500, stop and investigate (unlikely on hosted schema).

---

## 6. Production DB (read-only, unchanged)

| Metric | Value |
| --- | --- |
| `scholarship_category` | **22** |
| `resource_article` | **0** |
| RLS published-only | **PASS** |

---

## 7. Final verdict

| Question | Answer |
| --- | --- |
| **Stage 4D code committed/pushed?** | **Yes** — `18c91b7` on `main` |
| **Pre-seed production routes OK?** | **Yes** — EN 200, ES/FR pilot 404, hubs 200, category 200, detail 404 |
| **Production seed run?** | **No** (by design) |
| **Ready for production resource seed?** | **Yes — with explicit operator approval** |

### Blockers before seed

1. **Human approval** to set `I18N_PILOT_ALLOW_DB_WRITES=1` and `I18N_PILOT_ALLOW_PRODUCTION=1`.
2. **Dry-run** on production (`seed-resource-pilot-translations.ts` without writes).
3. **Post-seed smoke** per `i18n-stage4d-resource-pilot-production-readiness-2026-05-21.md` §7.

### Next stage (4D.4 — not in this task)

```powershell
# Dry-run
npx tsx scripts/i18n/seed-resource-pilot-translations.ts

# Apply (only after approval)
$env:I18N_PILOT_ALLOW_DB_WRITES='1'
$env:I18N_PILOT_ALLOW_PRODUCTION='1'
npx tsx scripts/i18n/seed-resource-pilot-translations.ts

$env:SCREENSHOT_BASE_URL='https://scholarshiptop.com'
npx tsx scripts/seo/i18n-stage4d-resource-pilot-smoke.ts
```

**Rollback SQL** (if needed): see `i18n-stage4d-resource-pilot-production-readiness-2026-05-21.md` §6.
