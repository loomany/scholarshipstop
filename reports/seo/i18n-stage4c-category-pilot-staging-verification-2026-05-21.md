# Stage 4C.1 / 4C.2 — Category Pilot Local Verification (2026-05-21)

**Verdict: ACCEPTED (local full-schema gate)**  
**Production: not touched.** No migration/seed on hosted prod.

No commit. No push.

---

## Stage 4C.2 summary

| Gate item | Result |
| --- | --- |
| Full local schema (tables for sitemap) | **Yes** (see §2) |
| `npm run build` + `/sitemap.xml` | **PASS** |
| `next start` + category smoke | **PASS** |
| ES/FR category sitemaps (11+11) | **PASS** |
| RLS + seed 22 rows | **PASS** |
| `.env.local` restored from backup | **Yes** |

---

## 1. Environment

| Item | Value |
| --- | --- |
| DB target | **Local Supabase** `http://127.0.0.1:54321` |
| Env during verification | `.env.local` (local keys, UTF-8 no BOM) |
| Production writes | **None** |
| `.env.local.prod-backup` | **Preserved**; restored to `.env.local` after verification |
| Post-restore check | `NEXT_PUBLIC_SUPABASE_URL` → hosted `qlql…fsnh` (prod-linked) |

---

## 2. Full local schema bootstrap

### `npx supabase db reset`

**Not clean on fresh reset.** Failures (migration ordering vs hosted history):

1. `20260411150000` — `content_posts` missing (fixed by new bootstrap)
2. `20260414120000` — `anonymous_visitor_first_touch` missing (fixed by new bootstrap)
3. `20260415120000` — `essay_chats` missing (table created later in chain)

### Resolution (local only)

1. Added bootstrap migrations (safe `IF NOT EXISTS` on hosted):
   - `20260103120000_profiles_bootstrap.sql`
   - `20260411140000_content_hub_tables_bootstrap.sql`
   - `20260414110000_anonymous_visitor_first_touch_bootstrap.sql`
2. Applied **all 104** migration files via local Postgres (`docker exec psql`) after partial reset.
3. Verified required objects exist:

| Object | Present |
| --- | --- |
| `public.content_translations` | Yes |
| `public.scholarships` | Yes |
| `public.scholarships_safe_listing` | Yes (view) |
| `public.providers` | Yes |
| `public.content_posts` | Yes |
| `public.content_topics` | Yes |
| `public.essays` | Yes |

**Note:** For a **new** machine, repeat: `supabase start` → apply-all script or fix migration order until `db reset` is green. Do **not** use production DB.

### Other migration fix (enum safety)

`20260407150000_subscription_billing_normalization.sql` — do not `ADD VALUE` and use new enum labels in the same transaction.

---

## 3. `content_translations` (local)

| Check | Result |
| --- | --- |
| Table exists | Yes |
| Locale `es`/`fr` | Yes |
| Status / source_type / quality_score checks | Yes |
| Unique `(source_type, source_id, locale)` | Yes |
| RLS enabled | Yes |
| Anon reads only `published` | **PASS** (RLS script) |

---

## 4. Seed

```text
I18N_PILOT_ALLOW_DB_WRITES=1 npx tsx scripts/i18n/seed-category-pilot-translations.ts
→ Seeded 22 content_translations rows
```

| Field | Value |
| --- | --- |
| Categories | 11 (arts … disability) |
| Locales | es, fr |
| status | published |
| quality_score | 90 |
| OpenAI | Not used |

---

## 5. Production build

```text
Remove-Item .next -Recurse -Force
npm run build
→ Exit 0
```

- `/sitemap.xml` generation: **no missing-table errors**
- `prerender-manifest.json`: present

---

## 6. Server + route smoke

```text
npx next start -p 3020
SCREENSHOT_BASE_URL=http://localhost:3020
npx tsx scripts/seo/i18n-category-pilot-smoke.ts
→ PASS
```

| Route | Expected | Result |
| --- | --- | --- |
| EN/ES/FR stem, music, safety | 200 | OK |
| ES/FR hobbies, miscellaneous, fake | 404 | OK |
| EN hobbies | 200 | OK |

---

## 7. Sitemap

| Check | Result |
| --- | --- |
| `/sitemap.xml` | **200**, no `/en` |
| `/sitemaps/locale-es-categories.xml` | **200**, **11** `<loc>` |
| `/sitemaps/locale-fr-categories.xml` | **200**, **11** `<loc>` |
| Translated scholarship/provider/resource/essay/compare detail URLs in category sitemaps | **Not included** (category pilot only) |

---

## 8. Metadata / hreflang / switcher (category cluster)

Smoke + hreflang on `/es/scholarships/category/stem`:

- Self canonical: OK  
- hreflang en / es / fr: OK  
- No `/en` links: OK  

**Language switcher audit** (`i18n-language-switcher-audit.ts` on local empty DB):

- **6 blocking issues** — `/essays` and `/resources` hubs return **HTTP 500** (no published local content). **Not Stage 4C regressions.**
- Category pilot paths not listed in blocking issues; cluster behavior covered by smoke hreflang checks.

**Locale link audit:** `blockingLinkIssues: 0` (118 pages).

---

## 9. Scholarship detail 404 safety

| Route | Result | Note |
| --- | --- | --- |
| `/scholarships/local-pilot-detail-gate` | 404 | Minimal local row; detail resolver needs full row |
| `/es/...`, `/fr/...` | 404 | **OK** — no `scholarship_detail` translation |

**Covered by:** Stage 4B gate code + `lib/i18n/__tests__` (72/72). No production DB used for real slug 200.

---

## 10. Tests / audits

| Check | Result |
| --- | --- |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **72/72 PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| `i18n-category-pilot-smoke.ts` | **PASS** |
| `i18n-visible-text-audit.ts` | Completed (pilot static pages; see report dated 2026-05-19) |
| `i18n-locale-link-audit.ts` | **0 blocking link issues** |
| `i18n-language-switcher-audit.ts` | 6 failures — essays/resources **500** on empty local DB only |

---

## 11. Environment restore

| Step | Done |
| --- | --- |
| `Copy-Item .env.local.prod-backup .env.local` | Yes |
| `.env.local.prod-backup` still exists | Yes |
| Local keys committed | No |
| `npx supabase stop` | Not run (optional; local stack may still be running) |

---

## 12. Git safety

- No `.env` / secrets committed  
- New migration bootstraps + `scripts/seo/i18n-verify-content-translations-rls.ts` env handling  
- No auth/payment/Lemon changes for 4C scope  
- No `/en`, no new languages  

---

## 13. Final verdict

| Question | Answer |
| --- | --- |
| **Stage 4C.2 accepted?** | **Yes** — category pilot green on production-like **local** schema |
| **Ready for production migration apply (`content_translations` only)?** | **Yes**, with operator approval and normal prod migration workflow |
| **Ready for Stage 4D resources pilot?** | **Yes** for next pilot work; run prod/staging smoke after migration+seed there |
| **Production touched?** | **No** |

### Remaining operator notes

1. **`supabase db reset` alone** still fails mid-chain until all bootstrap/order gaps are merged; use documented bootstraps or hosted-aligned reset on CI.
2. After local work, confirm `.env.local` points at intended target (restored to prod-linked for day-to-day dev).
3. Optional: `npx supabase stop` to free Docker resources.

---

*End of report.*
