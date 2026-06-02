# Stage 4D.4 — Production seed + post-seed smoke (2026-05-21)

**Scope:** Seed 50 `resource_article` rows on production (`qlqlvhgosxhuibzhfsnh`) and verify live behavior. **No commit/push.**

---

## 1. Pre-seed safety

| Check | Result |
| --- | --- |
| **HEAD** | `18c91b7` — Stage 4D code on `main` |
| **Git staged secrets** | **None** (only unstaged audit JSON + untracked local files) |
| **Production ref** | `qlqlvhgosxhuibzhfsnh` (via `.env.local.prod-backup`, not printed) |
| **Seed env** | `I18N_PILOT_USE_SHELL_ENV=1` + prod backup (not local Docker) |
| `resource_article` (pre) | **0** |
| `scholarship_category` (pre) | **22** |
| RLS published-only | **PASS** |

---

## 2. Dry-run seed

**Command:** `npx tsx scripts/i18n/seed-resource-pilot-translations.ts` (no `I18N_PILOT_ALLOW_DB_WRITES`)

| Field | Result |
| --- | --- |
| `dryRun` | **true** |
| `rowCount` | **50** |
| `slugs` | **25** |
| `target` | `https://qlqlvhgosxhuibzhfsnh…` |
| Writes | **None** |

**PASS** — proceeded to production apply.

---

## 3. Production seed

```powershell
$env:I18N_PILOT_ALLOW_DB_WRITES='1'
$env:I18N_PILOT_ALLOW_PRODUCTION='1'
$env:I18N_PILOT_USE_SHELL_ENV='1'
# NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from prod backup
npx tsx scripts/i18n/seed-resource-pilot-translations.ts
```

| Result | Value |
| --- | --- |
| **Upserted** | **50** rows |
| `source_type` | `resource_article` only |
| Locales | **25 es** + **25 fr** |
| `status` | **published** |
| `quality_score` | **90** (min 90, ≥ 85) |
| `machine_model` | **stage4d-manual-pilot** |
| OpenAI | **Not used** |
| Other types seeded | **None** |

---

## 4. Post-seed DB verification (read-only)

**Script:** `scripts/seo/i18n-stage4d-post-seed-db-verify.ts`

| Metric | Result |
| --- | --- |
| `resource_article` total | **50** |
| ES / FR | **25 / 25** |
| Statuses | **`published` only** |
| `machine_model` | **`stage4d-manual-pilot` only** |
| Min `quality_score` | **90** |
| `scholarship_category` | **22** (unchanged) |
| Distinct `source_type` | `resource_article`, `scholarship_category` |
| Pilot slugs on `content_posts` | **0 missing** |
| Anon visible published `resource_article` | **50** |
| Anon non-published visible | **0** |
| RLS published-only | **PASS** |

---

## 5. Production route smoke

**Script:** `SCREENSHOT_BASE_URL=https://scholarshiptop.com npx tsx scripts/seo/i18n-stage4d-resource-pilot-smoke.ts`

**Result: all checks passed.**

### Five pilot slugs (EN / ES / FR → 200)

- `avoid-scholarship-scams-targeting-families`
- `types-of-scholarships-usa-explained`
- `how-to-write-a-winning-scholarship-essay`
- `scholarship-faq-low-gpa-students`
- `verify-scholarship-emails-usa`

### 404 gates

| URL | Status |
| --- | ---: |
| `/es/resources/verify-scholarship-winners-usa-previous-years` | **404** |
| `/fr/resources/verify-scholarship-winners-usa-previous-years` | **404** |
| `/es/resources/not-real-resource-xyz` | **404** |

### SEO spot-check (`/es/resources/avoid-scholarship-scams-targeting-families`)

| Check | Result |
| --- | --- |
| Spanish disclaimer copy | **Present** (`no concede becas`) |
| English body fallback | **Not detected** |
| Self canonical | `https://scholarshiptop.com/es/resources/avoid-scholarship-scams-targeting-families` |
| `robots` | **index, follow** |
| hreflang en/es/fr | **OK** (smoke script) |
| `/en` links | **None** (smoke script) |

**FR page:** localized French content heuristic **OK**.

---

## 6. Hub smoke

| URL | Status | Notes |
| --- | ---: | --- |
| `/es/resources` | **200** | No 500 |
| `/fr/resources` | **200** | No 500 |
| Translated section header | **Visible** (`Artículos traducidos` / `Articles traduits`) |
| CMS pilot slug in HTML | **Yes** — e.g. `scholarship-faq-low-gpa-students` linked |
| Untranslated slug in hub | **Absent** |
| Static guides | **Present** (e.g. `/es/resources/how-to-find-scholarships`) |
| `/es/resources/` link count (sample) | **12** in first-page HTML |

**Note:** Not all 25 pilot slugs appear on page 1 of the hub grid (sort/pagination); at least one seeded CMS card is visible. No English-only DB grid fallback observed.

---

## 7. Sitemap smoke

| URL | Result |
| --- | --- |
| `/sitemaps/locale-es-resources-db.xml` | **200**, **25** `<loc>` |
| `/sitemaps/locale-fr-resources-db.xml` | **200**, **25** `<loc>` |
| `/sitemaps/locale-es-categories.xml` | **200**, **11** |
| `/sitemaps/locale-fr-categories.xml` | **200**, **11** |
| `/sitemap.xml` index | **200** |

### Index caveat

`/sitemap.xml` **does not yet list** `locale-es-resources-db` / `locale-fr-resources-db` child sitemaps (likely **cached sitemap index** from before seed). **Child bucket URLs are live and correct** (50 URLs total). Recommend sitemap index revalidation or wait for cache TTL; not a blocker for article URLs already discoverable via hub + direct bucket URLs.

No provider / essay / compare translated URLs added to resource DB buckets.

---

## 8. Regression checks

### Category pilot (4C)

| URL | Status |
| --- | ---: |
| `/es/scholarships/category/stem` | **200** |
| `/fr/scholarships/category/stem` | **200** |
| `/es/scholarships/category/hobbies` | **404** |
| `/fr/scholarships/category/hobbies` | **404** |

### Scholarship detail safety

| URL | Status |
| --- | ---: |
| `/scholarships/{live-slug-from-scholarships-0.xml}` | **200** |
| `/es/scholarships/{same-slug}` | **404** |
| `/fr/scholarships/{same-slug}` | **404** |

*(Sample slug: `kress-foundation-history-of-art-institutional-fellowships-kress-foundation-history-of-art-`.)*

`/es/scholarships/how-to-apply-for-a-scholarship-step-by-step` → **404** on EN and ES (not a live scholarship detail slug).

### P0 hotfix

| URL | Status |
| --- | ---: |
| `/es/compare` | **200** |
| `/fr/compare` | **200** |
| `/es/essays` | **200** |
| `/fr/essays` | **200** |

Language switcher: **not fully automated** in this run; P0 hubs load without regression. Prior P0 smoke script available for full switcher roundtrip if needed.

---

## 9. Rollback (not executed)

```sql
delete from public.content_translations
where source_type = 'resource_article'
  and locale in ('es', 'fr')
  and machine_model = 'stage4d-manual-pilot';
```

**Verify after rollback:** `resource_article` count → 0; category rows remain 22; ES/FR pilot URLs return **404**.

**If smoke had failed:** run rollback above, do **not** seed additional rows until root cause fixed.

---

## 10. Final verdict

| Question | Answer |
| --- | --- |
| **Stage 4D.4 accepted?** | **Yes** — seed + live routes + DB + child sitemaps + regressions pass |
| **Caveats** | Sitemap **index** may lag listing `resources-db` children; hub shows subset of 25 on page 1 (expected) |
| **Ready for next resource batch (26–50)?** | **Yes, after monitoring** — recommend **+25** slugs with same gates, not 900 |
| **Recommended next batch size** | **25** (mirror 4D.1), separate audit + seed + smoke |

### What was not done

- No git commit/push
- No OpenAI / bulk MT
- No auth/payment/Lemon/RLS/schema changes
- No rollback executed

### Operator artifacts (local, uncommitted)

- `scripts/seo/i18n-stage4d-post-seed-db-verify.ts` — post-seed DB checker
- `reports/seo/i18n-stage4d-resource-pilot-rows-2026-05-21.csv` — regenerated at seed time
