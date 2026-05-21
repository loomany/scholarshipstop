# Stage 4C — ES/FR Category SEO Pilot (2026-05-21)

**Status:** Code complete. **Migration/seed not auto-applied to hosted Supabase** (await explicit approval / local apply).

**Constraints honored:** No commit, no push, no bulk OpenAI, no scholarship detail translation, no `/en`, English URLs unchanged.

---

## 1. Migration apply (local/staging)

| Item | Status |
| --- | --- |
| Migration file | `supabase/migrations/20260521120000_content_translations.sql` (from Stage 4B) |
| Applied by Cursor to hosted DB | **No** — `.env.local` points at hosted Supabase; production apply not explicitly approved |
| Applied to local Docker Supabase | **Not run** — `supabase status` blocked by `.env.local` BOM for CLI |

### Manual apply (staging/local)

```bash
# Local stack
npx supabase db reset   # or: supabase migration up

# Hosted staging (Dashboard SQL editor or CLI against staging project)
# Paste contents of supabase/migrations/20260521120000_content_translations.sql
```

### Verification SQL (no secrets)

```sql
-- Table exists
select count(*) from information_schema.tables
where table_schema = 'public' and table_name = 'content_translations';

-- Constraints
select conname from pg_constraint
where conrelid = 'public.content_translations'::regclass;

-- RLS enabled
select relrowsecurity from pg_class
where relname = 'content_translations';

-- Anon sees only published (after seed)
set role anon;
select id, status from public.content_translations limit 5;
reset role;

-- Draft invisible to anon (insert as service role, then test)
-- insert ... status = 'draft_machine' ; anon select should return 0 rows
```

**RLS expectation:** policy `content_translations_select_published_public` → `using (status = 'published')`.

---

## 2. Category pilot source IDs (11 promoted L1)

From `lib/scholarships/categorySeoAllowlist.ts` (not hobbies/miscellaneous).

| source_id | EN route | ES route | FR route |
| --- | --- | --- | --- |
| arts | `/scholarships/category/arts` | `/es/scholarships/category/arts` | `/fr/scholarships/category/arts` |
| education | `/scholarships/category/education` | `/es/.../education` | `/fr/.../education` |
| humanities | `/scholarships/category/humanities` | `/es/.../humanities` | `/fr/.../humanities` |
| stem | `/scholarships/category/stem` | `/es/.../stem` | `/fr/.../stem` |
| medical | `/scholarships/category/medical` | `/es/.../medical` | `/fr/.../medical` |
| law | `/scholarships/category/law` | `/es/.../law` | `/fr/.../law` |
| community | `/scholarships/category/community` | `/es/.../community` | `/fr/.../community` |
| biology | `/scholarships/category/biology` | `/es/.../biology` | `/fr/.../biology` |
| safety | `/scholarships/category/safety` | `/es/.../safety` | `/fr/.../safety` |
| music | `/scholarships/category/music` | `/es/.../music` | `/fr/.../music` |
| disability | `/scholarships/category/disability` | `/es/.../disability` | `/fr/.../disability` |

**English copy sources:** `categoryListingSeoCopy.ts` (meta/H1/intro), `categoryExpertContent.ts` (FAQ, STEM/education/medical/disability intros), listing cards from Supabase (unchanged EN data).

**Translated fields per row:** `translated_title`, `translated_meta_title`, `translated_meta_description`, `translated_summary`, `translated_body`, `translated_faq_json`, `translated_extra_json` (UI section labels, trust cards, listing H2/intro).

---

## 3. Seed (22 rows, deterministic, no OpenAI)

| Item | Path |
| --- | --- |
| Seed content (TS) | `lib/i18n/categoryPilot/categoryPilotTranslationsData.ts` |
| Seed script | `scripts/i18n/seed-category-pilot-translations.ts` |
| CSV export | `scripts/i18n/export-category-pilot-csv.ts` → `reports/seo/i18n-stage4c-category-pilot-rows-2026-05-21.csv` |
| SQL stub | `supabase/seed/category_pilot_content_translations.sql` |

**Run seed (staging/local only):**

```bash
# 1) Apply migration on target DB
# 2) Seed
I18N_PILOT_ALLOW_DB_WRITES=1 npx tsx scripts/i18n/seed-category-pilot-translations.ts
# Optional if hosted project: I18N_PILOT_ALLOW_PRODUCTION=1 (only when approved)
```

**Row shape:** `source_type=scholarship_category`, `status=published`, `quality_score=90`, `source_hash` from `buildCategorySourceHash()`.

**Not seeded by Cursor in this pass** — hosted DB write withheld pending approval.

---

## 4. Localized routes

| Route | File |
| --- | --- |
| `/es/scholarships/category/[slug]` | `app/[locale]/scholarships/category/[slug]/page.tsx` |
| `/fr/scholarships/category/[slug]` | same |

**Behavior:**

| Condition | Result |
| --- | --- |
| Promoted category + `published` translation | Localized page (translated meta/body/FAQ) |
| Missing / draft / stale / blocked | **404** — no English body fallback |
| Non-promoted slug (e.g. hobbies) | **404** on ES/FR |
| EN `/scholarships/category/[slug]` | Unchanged; adds hreflang when ES/FR published rows exist |

**Post-listing UI:** `components/scholarships/LocalizedScholarshipCategoryPostListingSeo.tsx`

---

## 5. Metadata / hreflang / robots

- Self canonical: `/es|fr/scholarships/category/{slug}`
- `index,follow` when EN would be indexable (no noise query) + published + quality ≥ 85
- hreflang cluster via `buildCategoryPilotAlternates()` — only locales with published rows
- `x-default` → English category URL
- No `/en`

**Example (when stem ES+FR published):**

| rel | URL |
| --- | --- |
| canonical (ES page) | `https://scholarshiptop.com/es/scholarships/category/stem` |
| hreflang en | `/scholarships/category/stem` |
| hreflang es | `/es/scholarships/category/stem` |
| hreflang fr | `/fr/scholarships/category/stem` |
| x-default | `/scholarships/category/stem` |

---

## 6. Sitemap

`lib/seo/sitemaps.ts` → `buildLocalizedCategorySitemapDocuments()`:

- Buckets: `locale-es-categories`, `locale-fr-categories`
- **Expected after seed:** 11 ES + 11 FR URLs
- Only `scholarship_category` + `published` + promoted allowlist
- No scholarship/provider/resource/essay/compare DB URLs

---

## 7. Language switcher

`getStage2LanguageSwitcherItems()` extended for `/scholarships/category/{promoted-slug}`:

- EN/ES/FR links via `localizedCategorySeoHref()`
- No `/en`
- Non-promoted category paths → switcher hidden

---

## 8. Scholarship detail 404 safety (Stage 4B preserved)

`/es|fr/scholarships/{detail-slug}` still **404** without `scholarship_detail` published translation (`localizedScholarshipDetailGate.ts`).

---

## 9. Tests / build

| Check | Result |
| --- | --- |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **PASS — 72/72** (+9 category pilot tests) |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |

**Playwright audits:** Not re-run in this pass (require server + seeded DB). Run after seed on staging:

- `/scholarships/category/stem`, `/es/.../stem`, `/fr/.../stem`
- `/scholarships/category/music`, `/es/.../music`, `/fr/.../music`
- `/scholarships/category/safety`, `/es/.../safety`, `/fr/.../safety`
- Confirm `/es/scholarships/{real-slug}` → 404 without detail translation

---

## 10. What was not touched

- Auth / Lemon / payment / unrelated RLS
- Scholarship detail / provider / resource / essay / compare DB translation
- Bulk OpenAI
- `/en` route
- Production migration apply (unless user approves)
- Git commit / push

---

## 11. Production apply status

| Step | Done? |
| --- | --- |
| Migration on production | **No** |
| 22 rows on production | **No** |
| Code deployed | Local only |

---

## 12. Next recommended stage (4D)

1. User approves migration + seed on **staging** → verify 22 rows + RLS
2. Smoke: 3 categories (stem, music, safety) + hreflang + sitemap `locale-es-categories.xml`
3. Resources CMS pilot (top 50) with review workflow
4. Localized scholarship detail render (remove gate `notFound()` after `scholarship_detail` published)

---

## 13. Answers

| Question | Answer |
| --- | --- |
| Safe to browse ES category URLs now? | **Only after migration + seed** on target DB; otherwise 404 (correct) |
| Smallest next pilot? | Resources top 50 (after category verified on staging) |
| Manual checks before prod migration? | Staging apply + RLS + 22-row count + 3 category smoke URLs |

---

*End of Stage 4C report.*
