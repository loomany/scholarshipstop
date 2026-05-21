# Stage 4C.3 — Controlled Production Apply (Category Pilot) (2026-05-21)

**Verdict: Production DB ready. Code deploy required for live ES/FR category routes.**

No commit. No push.

---

## 1. Pre-production safety

| Item | Value |
| --- | --- |
| Git branch | `main` |
| `.env.local` target | Hosted Supabase (`qlql…fsnh`), site `scholarshiptop.com` |
| Local Supabase in use? | **No** (for apply; see §5 note on first seed attempt) |
| Migration file | `supabase/migrations/20260521120000_content_translations.sql` |
| Seed rows (TS) | **22** |
| `source_type` | `scholarship_category` only |
| Locales | `es`, `fr` only |
| Categories (11) | arts, education, humanities, stem, medical, law, community, biology, safety, music, disability |

**Excluded:** hobbies, miscellaneous

---

## 2. Read-only checks (before migration)

| Check | Result |
| --- | --- |
| `content_translations` exists | **No** (REST 404) |
| Production `/scholarships/category/stem` | **200** |
| Production `/es/scholarships/category/stem` | **404** (expected before deploy) |
| Production `/fr/scholarships/category/stem` | **404** (expected before deploy) |

---

## 3. Rollback plan (not executed)

### Drop table (emergency only)

```sql
-- Removes all translation rows for all source types. Use only if reversing foundation entirely.
drop table if exists public.content_translations cascade;
```

### Delete pilot rows only (preferred rollback)

```sql
delete from public.content_translations
where source_type = 'scholarship_category'
  and source_id in (
    'arts','education','humanities','stem','medical','law',
    'community','biology','safety','music','disability'
  )
  and locale in ('es','fr');
```

### Why English is unaffected

- English category copy stays in existing app/DB sources (not in `content_translations`).
- No changes to `scholarships`, auth, billing, or Lemon tables.
- Removing pilot rows only disables ES/FR category SEO pages that read this table.

---

## 4. Production migration

| Step | Result |
| --- | --- |
| Apply `20260521120000_content_translations.sql` | **Applied** via Supabase MCP to project `qlql…fsnh` |
| Corrective pass | **Required** — first MCP payload was incomplete (wrong column `stale_reason`, no constraints/RLS). Corrective migration `content_translations_stage4c_corrective` dropped and recreated table per repo SQL. |

### Post-migration verification

| Check | Result |
| --- | --- |
| Table exists | Yes |
| Constraints (locale, status, source_type, unique, quality_score) | Yes |
| Indexes | Yes (5) |
| RLS enabled | Yes |
| Policy: anon/authenticated SELECT `published` only | Yes (`i18n-verify-content-translations-rls.ts` → **rlsPass: true**) |
| `updated_at` trigger | Yes |

---

## 5. Production seed

**Command (after fixing seed script guards):**

```text
I18N_PILOT_ALLOW_DB_WRITES=1 I18N_PILOT_ALLOW_PRODUCTION=1 npx tsx scripts/i18n/seed-category-pilot-translations.ts
```

**Script hardening (this session):**

- `I18N_PILOT_ALLOW_PRODUCTION=1` **required** for `*.supabase.co` (exit if missing).
- `.env.local` **overrides** inherited shell env (prevents writing to local Docker when `NEXT_PUBLIC_SUPABASE_URL` was left set to `127.0.0.1`).

**Note:** First seed run reported 22 upserts but rows landed on **local** Supabase due to stale shell env. Cleared shell env and re-ran; production now has **22** rows.

### Post-seed verification (service role)

| Metric | Value |
| --- | --- |
| Total rows | **22** |
| ES | **11** |
| FR | **11** |
| `source_type` | `scholarship_category` only |
| `status` | all `published` |
| `quality_score` | **90** (min) |
| hobbies / miscellaneous | **0** |
| OpenAI | Not used |

---

## 6. Production route smoke (live site)

**Stage 4C app code is not deployed to production yet** (live HTML still 404 on ES/FR category URLs).

| URL | Status now | After deploy + DB (expected) |
| --- | --- | --- |
| `/scholarships/category/stem` | 200 | 200 |
| `/es/scholarships/category/stem` | 404 | 200 |
| `/fr/scholarships/category/stem` | 404 | 200 |
| `/es/scholarships/category/hobbies` | — | 404 |
| `/es/scholarships/category/miscellaneous` | — | 404 |

Metadata (canonical, hreflang, no `/en`, no EN body fallback): verified on **local** in Stage 4C.2; **pending production deploy**.

---

## 7. Sitemap (production)

**Pending code deploy.** After deploy, expect:

- `/sitemap.xml` — includes index entries for localized category sitemaps
- `/sitemaps/locale-es-categories.xml` — **11** category URLs
- `/sitemaps/locale-fr-categories.xml` — **11** category URLs
- No translated scholarship detail / provider / resource / essay / compare URLs in category pilot sitemaps
- No `/en`

DB rows for sitemap generation are present (22 published `scholarship_category`).

---

## 8. Detail 404 safety

| Check | Status |
| --- | --- |
| Production live | **Pending deploy** — gate code in repo (Stage 4B) |
| Local Stage 4C.2 | Unit tests **72/72** + local smoke |

---

## 9. Local checks

| Check | Result |
| --- | --- |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **72/72 PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |

Global Playwright audits not re-run against production (no deploy).

---

## 10. Git safety

- No commit / push
- `.env.local` not staged (gitignored)
- New/updated tooling: `scripts/seo/i18n-stage4c3-*`, seed script guards
- No auth/payment/Lemon changes for this apply
- No `/en`, no new languages

---

## 11. Final verdict

| Question | Answer |
| --- | --- |
| **Production DB ready?** | **Yes** — table + RLS + **22** pilot rows on `qlql…fsnh` |
| **Code ready for deploy?** | **Yes** (Stage 4C in working tree; deploy to enable routes/sitemap) |
| **Ready for Stage 4D resources pilot?** | **Yes** after production deploy smoke of category cluster |
| **Production migration applied?** | **Yes** (with corrective recreate to match repo migration) |
| **Production seed applied?** | **Yes** (22 rows, verified on hosted project) |

### Operator next steps

1. **Deploy** Stage 4C application code to production.
2. Re-check live URLs: ES/FR category 200, hobbies/misc 404, sitemaps 11+11.
3. Optional: remove stray rows on **local** Supabase if first accidental seed is unwanted (`delete … scholarship_category` on local only).

---

*End of Stage 4C.3 production apply report.*
