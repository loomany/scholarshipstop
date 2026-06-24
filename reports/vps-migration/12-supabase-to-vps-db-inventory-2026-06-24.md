# Stage 12 — Supabase → VPS PostgreSQL inventory

**Дата:** 2026-06-24  
**Production:** https://scholarshiptop.com → VPS `213.155.22.74`  
**Supabase project:** `loomany's Project` (`qlqlvhgosxhuibzhfsnh`, `ap-southeast-2`, Postgres 17.6)  
**Режим:** read-only inventory — **ничего не переносилось, production не менялся**

## Verdict: **INVENTORY_COMPLETE — CUTOVER_BLOCKED**

Cutover заблокирован до: (1) export/restore-test на staging, (2) auth strategy approved, (3) maintenance window approved.

---

## 1. Executive summary

ScholarshipTop использует Supabase **не только как Postgres**, а как **платформу**: Auth (555 users), Storage (313 MB), RLS API через `supabase-js`, `pg_net` triggers. Прямого `DATABASE_URL` / `pg` client **нет**.

| Компонент | Используется | Миграция на VPS Postgres |
|-----------|--------------|--------------------------|
| Postgres (`public` + RPC) | **Да** | Данные ~1 GB — feasible |
| Auth (`auth.*`) | **Да** | **Обязательно** в dump; login требует GoTrue или замены |
| Storage (файлы) | **Да** | Metadata в DB; blobs отдельно (~313 MB) |
| Realtime / Edge Functions | **Нет** | — |

**Критический вывод:** нельзя переключить только `DATABASE_URL` для сайта, оставив hosted Supabase Auth — `auth.users` и `profiles.id` живут в одной БД. Cutover должен быть **атомарным** (maintenance window) или через **self-hosted Supabase API** (GoTrue + PostgREST) на VPS.

---

## 2. Env keys inventory (names only)

| Key | Consumers |
|-----|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Site browser/server, middleware, VPS job env templates |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser SSR client, public server reads, RLS paths |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin, cron, scripts, content-hub, parsers (via `SUPABASE_URL`) |
| `SUPABASE_URL` | Parsers (`parsers/utils.py`), content-hub |

**Planned (Stage 4+, not in prod yet):**

| Key | Purpose |
|-----|---------|
| `DATABASE_URL` | Direct Postgres (parsers, future server adapter) |
| `DB_PROVIDER` | `supabase` \| `vps_postgres` switch flag |

**Not in codebase today:** `DATABASE_URL`, `pg`, `postgres` npm package.

---

## 3. Client entry points

| Module | Client type | Key |
|--------|-------------|-----|
| `utils/supabase/client.ts` | Browser `@supabase/ssr` | anon |
| `utils/supabase/server.ts` | Server cookies | anon |
| `utils/supabase/middleware.ts` | Session refresh | anon |
| `utils/supabase/public.ts` | Cacheable public reads | anon |
| `lib/supabase/serviceRoleClient.ts` | Admin server | service_role |
| `utils/supabase/admin.ts` | Stripe legacy billing | service_role |
| `services/content-hub/src/lib/supabase.ts` | Worker + storage | service_role |
| `parsers/utils.py` | Python supabase-py | service_role |

**Files referencing Supabase:** ~**667** (TS/JS/PY).

---

## 4. Supabase Auth — used: **YES**

### Flows

| Flow | Location |
|------|----------|
| Magic link / OTP | `utils/auth-helpers/server.ts` → `signInWithOtp` |
| Email + password | `signInWithPassword`, `signUp` |
| Google OAuth | `signInWithOAuth`, `utils/auth-helpers/client.ts` |
| Session refresh | `utils/supabase/middleware.ts` |
| Sign out | `signOut` (server + client) |
| Password reset | `sendPasswordResetEmail.ts` (service role admin API) |
| Email verify | `app/auth/verify-email/route.ts` |
| OAuth callback | `app/auth/callback/route.ts` |
| Auth state (client) | `onAuthStateChange`, `getSession`, `getUser` |

### Live counts (2026-06-24)

| Table | Rows |
|-------|------|
| `auth.users` | 555 |
| `auth.identities` | 566 |
| `auth.sessions` | 730 |

Providers: email **402**, Google **153**.

### User-linked public tables

| Table | Rows | FK to auth |
|-------|------|------------|
| `profiles` | 550 | `profiles.id` → `auth.users.id` |
| `subscriptions` | 4 | `user_id` |
| `user_saved_scholarships` | 295 | user FK |
| `essay_chats`, `essay_results`, `questionnaire_responses` | small | user FK |
| `onboarding_oauth_pending` | — | pre-auth staging |

**Trigger:** `on_auth_user_created` → `public.handle_new_user()` → creates profile.

### Auth migration plan (separate — do not cutover without approval)

**Option A — Self-host GoTrue + PostgREST (minimal code change):**

1. Restore `auth` + `public` schemas to VPS Postgres.
2. Deploy GoTrue + PostgREST (+ optional Kong) on VPS.
3. Point `NEXT_PUBLIC_SUPABASE_URL` to self-hosted API gateway.
4. Migrate JWT secret / OAuth Google credentials to VPS GoTrue config.
5. Storage phase 2: proxy Supabase CDN or copy to MinIO/R2.

**Option B — Auth.js / custom (large code change):**

1. Import users from `auth.users` (preserve password hashes for email users).
2. Re-link Google OAuth client.
3. Replace all `@supabase/ssr` session code.
4. Estimated **3–6 weeks**.

**Recommended for this project:** **Option A** for cutover; Option B as long-term simplification.

**During prep:** login **must stay on Supabase** until GoTrue on VPS is verified.

---

## 5. Supabase Storage — used: **YES**

| Bucket | Objects | Size | Writers | Readers |
|--------|---------|------|---------|---------|
| `essay-heroes` | 4,421 | 238 MB | `lib/essays/essayHeroIngest.ts` | Public pages |
| `content-images` | 932 | 75 MB | content-hub, backfill scripts | `/resources/*` |

**Code references:** 3 modules + content-hub (7 call sites total).

**Migration note:** `storage.objects` metadata goes in pg_dump; **binary files** need separate export (`supabase storage cp` or API). Public URLs embedded in HTML — plan CDN proxy or bulk URL rewrite.

**Interim strategy:** keep Supabase Storage read-only CDN after DB cutover (hybrid) OR copy 313 MB to VPS MinIO before cutover.

---

## 6. Table dependency map

### 6.1 Site reads (hot path — production pages)

| Table / view | Role | Access pattern |
|--------------|------|----------------|
| `scholarships` | Catalog, detail, SEO | public client + service role |
| `scholarships_safe_listing` | Listing view | public client |
| `providers` | Provider hubs | public client |
| `essays`, `scholarship_essays` | Essay hub | public client |
| `content_posts`, `content_translations` | Resources, i18n | public + service |
| `seo_hub_content`, `seo_meta_cache` | SEO pages | public client |
| `compare_pages`, `state_compare_pages`, `institutions`, `states` | Compare modules | public + RPC |
| `categories`, `catalog_countries` | Navigation/facets | public |
| `profiles` | Account, matching | anon (RLS own row) |
| `subscriptions` | Billing gate | anon (RLS own row) |
| `user_saved_scholarships` | Saved grants | authenticated RLS |

### 6.2 Site writes (user-facing)

| Table | Route / module |
|-------|----------------|
| `profiles` | onboarding, account, billing webhooks |
| `user_saved_scholarships` | save button API |
| `essay_chats`, `essay_results`, `questionnaire_responses` | essay API routes |
| `onboarding_oauth_pending` | OAuth draft |
| `visitor_page_views`, `visitor_attribution`, `anonymous_visitor_first_touch` | analytics APIs |
| `iq_report_orders` | IQ funnel |

### 6.3 Parsers write (VPS — target for Stage 5)

| Table | Operation | Module |
|-------|-----------|--------|
| `scholarships` | INSERT/UPDATE upsert | `parsers/utils.py` → `upsert_scholarship()` |
| `google_indexing_queue` | UPSERT on new scholarship | `parsers/utils.py` → `add_to_indexing_queue()` |

**Parser env today:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` only.

**Parser sources:** `scholarship_america`, `simpler_grants_gov` (`parsers/run_all.py`).

**Parser does NOT write:** profiles, auth, providers (enrichment scripts on TS side do).

### 6.4 Jobs / workers write

| Service | Tables written |
|---------|----------------|
| Site cron (essay queue) | `essays`, `essay_generation_queue`, `scholarship_essays` |
| SEO generation | `seo_generation_queue`, `seo_hub_content`, compare tables |
| SEO indexing | `google_indexing_queue` |
| Content-hub | `content_posts`, `content_topics`, storage |
| Translation | `content_translations` |
| Mailing | `grant_notification_deliveries`, `grant_email_digest_items` |
| Scripts cron | various backfills |

### 6.5 Parser-adjacent / enrichment tables (TS scripts, not Python parsers)

| Table | Scripts |
|-------|---------|
| `scholarships` | 70+ backfill/enrich scripts |
| `providers` | enrich, classify, outreach |
| `scholarship_categories` | catalog backfills |

---

## 7. RPC / functions used from app

| RPC function | Used by |
|--------------|---------|
| `get_comparison_data` | university compare, SEO worker |
| `get_state_comparison_data` | state compare pages |
| `get_compare_peer_institutions` | compare peers |
| `provider_profile_scholarship_aggregate` | provider profiles |
| `google_indexing_try_consume_quota_bucket` | indexing queue |
| `trial_reserve_quota`, `trial_release_quota` | essay AI limits |
| `seo_generation_sitemap_paths` | sitemaps |
| `essays_hub_index_page` | essay hub |
| `get_scored_similar_scholarships` | matching |
| `i18n_scholarship_autopilot_try_lock` | translation worker |
| `scholarship_active_counts_by_state_code` | compare enqueue |
| `upsert_visitor_attribution` | analytics |

**Custom functions in `public`:** 81. **Extensions required on VPS:** `pg_net`, `pg_trgm`, `unaccent`, `pgcrypto`, `uuid-ossp`.

**DB triggers (production):** pg_net notify on `content_posts` publish, `scholarships` INSERT admin notify, `on_auth_user_created`, many `updated_at` triggers.

---

## 8. Table reference frequency (code grep)

| Table | `.from('...')` refs (approx) |
|-------|------------------------------|
| `scholarships` | 70+ files |
| `profiles` | 45+ files |
| `content_translations` | 40+ files |
| `essays` | 35+ files |
| `google_indexing_queue` | 15+ files |
| `content_posts` | 25+ files |
| `providers` | 20+ files |
| `essay_generation_queue` | 15+ files |
| `seo_*` tables | 15+ files |
| `subscriptions` | 10+ files |

---

## 9. Live row counts (baseline for Stage 3 validation)

| Table | Count |
|-------|-------|
| `auth.users` | 555 |
| `auth.identities` | 566 |
| `auth.sessions` | 730 |
| `public.profiles` | 550 |
| `public.subscriptions` | 4 |
| `public.scholarships` | 21,110 |
| `public.providers` | 6,385 |
| `public.content_posts` | 953 |
| `public.content_translations` | 34,998 |
| `public.essays` | 11,790 |
| `public.user_saved_scholarships` | 295 |
| `public.google_indexing_queue` | 33,756 |
| `storage.objects` | 5,353 |

**DB total size:** ~1.04 GB. **Storage blobs:** ~313 MB.

---

## 10. VPS services with Supabase env

| Service | Env file | DB writes |
|---------|----------|-----------|
| Site | `ops/env/site.env.example` | yes |
| Parsers | `parsers/.env` | scholarships only |
| Content-hub | `ops/env/content-hub.env.example` | yes + storage |
| Translation | `ops/env/translation.env.example` | yes |
| SEO generation | `ops/env/seo-generation.env.example` | via HTTP → site |
| SEO indexing | `ops/env/seo-indexing.env.example` | yes |
| SEO audit | read-only HTTP | no direct |
| Mailing | `ops/env/mailing.env.example` | yes |
| Mailing-providers | `ops/env/mailing-providers.env.example` | yes |
| Scripts cron | `ops/env/scripts.env.example` | yes |

---

## 11. Migration architecture recommendation

### Phase 0 (this stage) ✅

Inventory + scripts scaffold. No production changes.

### Phase 1 — VPS Postgres standby

- Host Postgres 17 on VPS (not Docker — save RAM).
- DB: `scholarshiptop_prod`, user: `scholarshiptop_app` (no superuser).
- Port 5432: localhost only.
- Backups: `/opt/scholarshiptop-db-backups/`.

### Phase 2 — Export Supabase (read-only on source)

```bash
# Document only — run with SUPABASE_DB_URL in env, never log it
pg_dump --format=custom --no-owner --no-acl \
  --schema=public --schema=auth --schema=storage --schema=net \
  -f supabase-prod-YYYYMMDD.dump "$SUPABASE_DB_URL"
sha256sum supabase-prod-YYYYMMDD.dump
```

### Phase 3 — Restore + validate on VPS

- Restore to `scholarshiptop_prod`.
- Compare row counts (§9 baseline).
- Verify sequences, extensions, triggers.
- **No production traffic yet.**

### Phase 4 — Auth + API layer on VPS

Deploy GoTrue + PostgREST OR full `supabase start` stack pointing to local Postgres.

### Phase 5 — Parser cutover (one parser at a time)

1. Dry-run parser against VPS (read-only SELECT).
2. One parser (`scholarship_america`) write test on VPS staging.
3. **Only after site cutover:** switch parser env — never dual-write to Supabase + VPS.

### Phase 6 — Production cutover (maintenance window)

1. Pre-cutover dumps (Supabase + VPS).
2. Pause: parsers, cron jobs, content-hub.
3. Final incremental dump or brief freeze (~15 min).
4. Switch all env to VPS API/DB.
5. Smoke + rollback env ready.
6. Keep Supabase **7+ days** read-only rollback.

---

## 12. Rollback plan

| Failure | Action |
|---------|--------|
| Site down after cutover | Revert `site.env` Supabase URLs; `docker compose restart site` |
| Parsers fail | Revert `parsers/.env` to Supabase keys |
| VPS DB corrupt | Restore from `/opt/scholarshiptop-db-backups/latest/` |
| Partial data loss | Fail back to Supabase (still primary until manual decommission approval) |

**Never delete Supabase project without explicit manual approval.**

---

## 13. Blockers before cutover

| # | Blocker | Owner action |
|---|---------|--------------|
| 1 | Auth strategy not deployed on VPS | Approve Option A (GoTrue) or B (Auth.js) |
| 2 | No restore-test report (Stage 14) | Run export + restore on VPS |
| 3 | Dual-write risk if parsers switched early | Parsers stay on Supabase until site cutover |
| 4 | Storage URL continuity | Plan CDN proxy or pre-copy blobs |
| 5 | Migration drift (108 local vs 50 applied migrations) | Reconcile before restore |
| 6 | 4 GB RAM | Tune Postgres; monitor site+DB together |

---

## 14. Next steps (safe order)

1. **Stage 1:** Run `ops/vps/scripts/setup-postgres.sh` on VPS (creates DB user, backups).
2. **Stage 2:** Run `scripts/vps-migration/export-supabase-prod-dump.sh` (requires `SUPABASE_DB_URL` — direct Postgres connection string, not anon key).
3. **Stage 3:** Restore + `scripts/vps-migration/validate-vps-db-restore.mjs`.
4. **Stage 4:** Deploy GoTrue/PostgREST; add `DB_PROVIDER` flag; smoke scripts.
5. **Stage 5–6:** Parser then site cutover in maintenance window.

---

## 15. Artifacts created with this inventory

| Path | Purpose |
|------|---------|
| `ops/vps/scripts/setup-postgres.sh` | Stage 1 VPS Postgres |
| `ops/vps/scripts/backup-postgres-daily.sh` | Daily pg_dump |
| `ops/vps/scripts/restore-postgres-test.sh` | Restore-test runbook |
| `scripts/vps-migration/export-supabase-prod-dump.sh` | Stage 2 export |
| `scripts/vps-migration/validate-vps-db-restore.sh` | Stage 3 counts |
| `scripts/vps-migration/smoke-vps-db.sh` | Stage 4 smoke |
| `ops/env/postgres.env.example` | Env template |

**INVENTORY_COMPLETE**
