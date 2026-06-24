# Stage 10 — Supabase migration audit (read-only)

**Дата:** 2026-06-24  
**Production:** https://scholarshiptop.com → Cloudflare Full (strict) → VPS `213.155.22.74`  
**Supabase project:** `loomany's Project` (`qlqlvhgosxhuibzhfsnh`, region `ap-southeast-2`, Postgres **17.6**)  
**Режим:** read-only audit — **ничего не переносилось, ничего не менялось**

## Verdict: **SUPABASE_AUDIT_ONLY_PASS**

---

## 1. Executive summary

| Question | Answer |
|----------|--------|
| **1. DB size** | **~1.04 GB** (`1042 MB` / `1,092,496,531` bytes) |
| **2. Storage size** | **~0.31 GB** (`313 MB` metadata sum; 5,353 objects) |
| **3. Largest table** | `public.scholarships` — **652 MB** total (432 MB TOAST / large HTML) |
| **4. Supabase services in use** | **Postgres, Auth, Storage, RLS + supabase-js API**; also **pg_net** DB triggers. **Not used:** Realtime, Edge Functions, pgvector, Supabase Cron |
| **5. Move to VPS PostgreSQL?** | **Technically possible** for data volume, but **not recommended as a simple cutover** — app is deeply coupled to Supabase Auth, Storage URLs, RLS policies, and `supabase-js` (no direct `DATABASE_URL` / `pg` client) |
| **6. Migration options** | See §8 — **Option A (keep Supabase)** best near-term; **Option E (hybrid)** if cost-cutting later |
| **7. Risk / cost / downtime** | Full migration: **high risk**, **weeks of effort**, **1–4 h downtime** if forced; keeping Supabase: **~$0 downtime**, ongoing SaaS cost |
| **8. After Railway → VPS** | **Finish all Railway job migrations first**, stabilize VPS under load, **keep Supabase external**, then optional hygiene (archive analytics, storage review) — **do not migrate DB yet** |

**Bottom line:** Data is modest (~1 GB DB + ~0.3 GB storage), but the **integration surface is large** (~667 code files reference Supabase; 50 public tables with RLS; 555 auth users; 2 public storage buckets embedded in production HTML). **Defer Supabase migration until Railway → VPS job migration is complete and stable.**

---

## 2. Current Supabase usage (code audit)

### 2.1 Env keys (names only — no values)

| Key | Used by |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Site, browser client, public server reads, VPS job env templates |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser (`@supabase/ssr`), middleware session refresh, public server reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin writes, cron jobs, content-hub, scripts (bypasses RLS) |
| `SUPABASE_URL` | Content-hub service (alias of project URL) |

**Not found in codebase:** `DATABASE_URL`, `pg` / `postgres` direct client — **all DB access goes through `supabase-js`**.

### 2.2 Client entry points

| File / module | Role |
|---------------|------|
| `utils/supabase/client.ts` | Browser client (`createBrowserClient`, anon key) |
| `utils/supabase/server.ts` | Server client with cookies (`createServerClient`, anon key) |
| `utils/supabase/middleware.ts` | Session refresh in Next.js middleware |
| `utils/supabase/public.ts` | Cacheable public reads (anon, no session) |
| `lib/supabase/serviceRoleClient.ts` | Service-role server client |
| `utils/supabase/admin.ts` | Legacy Stripe billing admin (service role) |
| `services/content-hub/src/lib/supabase.ts` | Content-hub worker (service role + storage uploads) |

### 2.3 Code footprint

| Metric | Count |
|--------|-------|
| Files referencing `supabase` | **~667** |
| SQL migrations in repo (`supabase/migrations/`) | **108** files |
| Migrations applied on live project (Supabase MCP) | **50** versions |
| VPS services with Supabase env | site, content-hub, translation, seo-generation, seo-indexing, seo-audit, mailing, mailing-providers, scripts |

**Note:** Repo has more migration files than Supabase reports as applied — reconcile drift before any future DB migration (some local migrations may be unreleased, renamed, or squashed).

### 2.4 Feature usage map

| Supabase feature | Used? | Where / evidence | Migration difficulty | VPS replacement |
|------------------|-------|------------------|----------------------|-----------------|
| **Postgres** | **Yes** | All app + jobs via `.from()`, `.rpc()`, migrations | Medium (data) / High (logic) | Self-managed Postgres or managed provider |
| **Auth** | **Yes** | `utils/auth-helpers/*`, middleware, OAuth Google, magic link OTP, 555 users | **High** | Auth.js / Clerk / self-hosted GoTrue |
| **Storage** | **Yes** | `essay-heroes`, `content-images` buckets; `lib/essays/essayHeroIngest.ts`, content-hub | **High** (URL breakage) | S3/R2/MinIO + URL rewrite |
| **Realtime** | **No** | No `.channel()` usage | — | — |
| **Edge Functions** | **No** | MCP `list_edge_functions` → empty | — | — |
| **Supabase Cron** | **No** | Cron on Railway/VPS, not `pg_cron` | — | VPS cron (already) |
| **pgvector / Vector** | **No** | Not in extensions | — | — |
| **DB webhooks (pg_net)** | **Yes** | Triggers on `content_posts`, `scholarships` → HTTP to site internal APIs | **Medium** | Install `pg_net` on target Postgres or move to app-level queues |
| **Auto REST / RLS API** | **Partial** | Anon client + RLS for public reads; service role for writes | **High** | Re-implement authz in app or keep PostgREST |
| **RLS-dependent reads** | **Yes** | Profiles, saved scholarships, essay chats, subscriptions; many public SELECT policies | **High** | App-layer authorization or replicate policies |

### 2.5 Auth usage (production-critical)

- **Session model:** `@supabase/ssr` cookies + middleware refresh (`middleware.ts` → `updateSession`)
- **Flows:** email OTP / magic link (`signInWithOtp`), Google OAuth (`signInWithOAuth`), password sign-in, email verification (`app/auth/verify-email`), password reset via service role
- **User data:** `auth.users` → trigger `on_auth_user_created` → `public.handle_new_user` → `profiles`
- **Providers (counts only):** email **402**, google **153** — total **555** users

### 2.6 Storage usage

| Bucket | Public | Objects | Size (metadata) | Code |
|--------|--------|---------|-----------------|------|
| `essay-heroes` | yes | 4,421 | **238 MB** | Essay hub hero WebP images |
| `content-images` | yes | 932 | **75 MB** | Content-hub article covers |

Public URLs are embedded in published pages — migration requires URL rewrite or CDN proxy.

### 2.7 RPC / SQL functions used from app

Examples (not exhaustive): `get_comparison_data`, `get_state_comparison_data`, `provider_profile_scholarship_aggregate`, `google_indexing_try_consume_quota_bucket`, `trial_reserve_quota`, `trial_release_quota`, `seo_generation_sitemap_paths`, `essays_hub_index_page`, `get_scored_similar_scholarships`, `i18n_scholarship_autopilot_try_lock`.

**81 custom functions** in `public` schema (plus extension functions).

---

## 3. DB size

| Metric | Value |
|--------|-------|
| **Total database** | **1042 MB (~1.04 GB)** |
| **Largest schema (user data)** | `public` — **991 MB** |
| **TOAST (oversized columns)** | `pg_toast` — **524 MB** (mostly scholarship HTML / JSON) |

### Top 15 tables by total size

| Rank | Schema | Table | Total | Heap | Indexes | ~Rows |
|------|--------|-------|-------|------|---------|-------|
| 1 | public | `scholarships` | **652 MB** | 46 MB | 174 MB | 21,110 |
| 2 | public | `content_translations` | 99 MB | 55 MB | 16 MB | 34,998 |
| 3 | public | `essays` | 59 MB | 19 MB | 3 MB | 11,790 |
| 4 | public | `visitor_page_views` | 43 MB | 25 MB | 18 MB | 104,511 |
| 5 | public | `anonymous_visitor_first_touch` | 26 MB | 19 MB | 6 MB | 47,538 |
| 6 | public | `google_indexing_queue` | 23 MB | 9 MB | 14 MB | 33,756 |
| 7 | public | `visitor_attribution` | 21 MB | 9 MB | 12 MB | 36,899 |
| 8 | public | `content_posts` | 20 MB | 2 MB | 320 kB | 953 |
| 9 | net | `_http_response` | 16 MB | 16 MB | 168 kB | 0 |
| 10 | public | `grant_email_digest_items` | 12 MB | 5 MB | 7 MB | 45,808 |
| 11 | public | `providers` | 7.6 MB | 5 MB | 824 kB | 6,385 |
| 12 | storage | `objects` | 7.6 MB | — | — | 5,353 |
| 13 | public | `grant_notification_deliveries` | 6.8 MB | 3 MB | 4 MB | 22,239 |
| 14 | auth | `audit_log_entries` | 5.5 MB | 4.6 MB | 840 kB | 17,283 |
| 15 | public | `state_compare_pages` | 3.7 MB | 3 MB | 312 kB | 1,275 |

**`scholarships` breakdown:** 652 MB = **432 MB TOAST** + 174 MB indexes + 46 MB heap — dominated by large HTML/content columns, not row count.

### Top tables by row count (public)

`visitor_page_views` (104k), `anonymous_visitor_first_touch` (47k), `grant_email_digest_items` (46k), `visitor_attribution` (37k), `content_translations` (35k), `google_indexing_queue` (34k), `scholarships` (21k).

---

## 4. Storage size

| Metric | Value |
|--------|-------|
| **Total objects** | 5,353 |
| **Total size (from `metadata.size`)** | **313 MB (~0.31 GB)** |
| **Largest single object** | ~1.08 MB (`content-images` cover JPEG) |
| **Typical essay hero** | ~260–310 KB WebP |

Metadata-based size is reliable here (all sampled objects have `size` in metadata). For billing reconciliation, cross-check Supabase Dashboard → Storage (should be close).

---

## 5. Biggest tables / buckets

| Category | Winner | Size |
|----------|--------|------|
| Largest table | `public.scholarships` | 652 MB |
| Largest analytics table | `public.visitor_page_views` | 43 MB |
| Largest i18n table | `public.content_translations` | 99 MB |
| Largest bucket | `essay-heroes` | 238 MB (4,421 files) |
| Second bucket | `content-images` | 75 MB (932 files) |

---

## 6. Auth / RLS / Storage dependencies

### Auth

| Item | Value |
|------|-------|
| Users | **555** |
| Providers | email (402), google (153) |
| FK coupling | `auth.users` referenced by `profiles`, subscriptions, essay data (CASCADE migrations present) |
| Migration complexity | **High** — sessions, OAuth client config, email templates, password hashes |

### RLS

| Item | Value |
|------|-------|
| `public` tables with RLS enabled | **50** |
| Total policies (`pg_policies`) | **49** |
| App depends on RLS? | **Yes, partially** — browser uses anon key for user-owned rows (profiles, saved scholarships, essay chats); most server paths use **service role** (bypasses RLS) or **public SELECT** policies |
| Migration complexity | **High** if keeping anon-client patterns; **Medium** if all access moves server-side |

**Policy patterns:**
- Public read: scholarships, providers, published essays/content, SEO hubs
- User-owned: profiles, saved scholarships, essay chats/results, questionnaire
- Service-role only: visitor analytics, telegram tables, indexing queues (no anon policies)

**Supabase advisor note:** multiple tables have RLS enabled with **no policies** (e.g. `catalog_countries`, `content_topics`, queues) — accessible only via service role today; document before migration.

### Storage

| Dependency | Impact |
|------------|--------|
| Public bucket URLs in HTML | **High** — thousands of embedded image URLs |
| Upload paths | Service role only (essay pipeline, content-hub) |
| Migration complexity | **High** without CDN proxy or bulk URL rewrite |

### DB triggers (production behavior)

| Trigger | Purpose |
|---------|---------|
| `content_posts_telegram_resource_notify` | pg_net → site internal API on publish |
| `scholarships_admin_notify` / `notify_new_scholarship` | pg_net → Telegram admin notify |
| `on_auth_user_created` | Profile bootstrap |
| `*_set_updated_at` | Timestamp maintenance (many tables) |
| `profiles_prevent_billing_self_updates` | Billing integrity |

**44 triggers** total across auth/public/storage/realtime.

---

## 7. Extensions / functions / triggers

### Extensions (installed)

| Extension | Version | Migration note |
|-----------|---------|----------------|
| `pg_net` | 0.20.0 | **Required** for Telegram notify triggers |
| `pg_trgm` | 1.6 | Scholarship/provider search |
| `unaccent` | 1.1 | Text search |
| `pgcrypto` | 1.3 | Crypto helpers |
| `uuid-ossp` | 1.1 | UUID generation |
| `pg_stat_statements` | 1.11 | Monitoring |
| `supabase_vault` | 0.3.1 | Supabase-managed |
| `hypopg`, `index_advisor` | — | Advisor tooling |

**Not installed:** `pgvector`, `pg_cron`, `postgis`.

### Functions by schema

| Schema | Count |
|--------|-------|
| public | 81 |
| extensions | 71 |
| storage | 17 |
| net | 12 |
| realtime | 12 |

---

## 8. Migration options A–E

### Option A — Keep Supabase (recommended near-term)

| | |
|-|-|
| **Pros** | Lowest risk; Auth/Storage/RLS/pg_net keep working; zero downtime; no migration project now |
| **Cons** | Monthly Supabase cost; vendor dependency; Sydney region latency to VPS (if VPS not APAC) |
| **Best if** | Railway → VPS still in progress (current state) |
| **Effort** | 0 |
| **Downtime** | 0 |

### Option B — Move only Postgres to VPS

| | |
|-|-|
| **Target** | PostgreSQL on VPS + replace Auth/Storage separately |
| **Pros** | Lower DB hosting cost; full SQL control |
| **Cons** | Must replace Auth (555 users), Storage (313 MB + URLs), pg_net, RLS/PostgREST semantics; **rewrite 667 files** or add compatibility layer; backups/monitoring on you |
| **Best if** | Willing to run a multi-month platform project |
| **Effort** | **4–8+ weeks** |
| **Downtime** | **1–4 hours** (optimistic, with rehearsal) |

### Option C — Move Postgres to managed provider (Neon, DO, Railway Postgres, etc.)

| | |
|-|-|
| **Pros** | Managed backups/PITR; less sysadmin than VPS DB |
| **Cons** | Still paid; still need Auth + Storage solution; same app coupling as Option B |
| **Best if** | Want managed Postgres but not full Supabase bill |
| **Effort** | **3–6 weeks** |
| **Downtime** | **30 min – 2 hours** |

### Option D — Self-host full Supabase on VPS

| | |
|-|-|
| **Pros** | Keeps supabase-js / Auth / Storage API surface |
| **Cons** | **4 GB RAM VPS is too tight** for Kong + GoTrue + PostgREST + Realtime + Storage + DB + site; ops complexity |
| **Best if** | Dedicated larger host (8+ GB RAM) and strong ops capacity |
| **Effort** | **2–4 weeks** setup + ongoing maintenance |
| **Downtime** | **2–6 hours** |
| **Verdict** | **Not recommended** on current `4 CPU / 4 GB` VPS |

### Option E — Hybrid (long-term cost/risk balance)

| | |
|-|-|
| **Examples** | Keep Supabase Auth + Storage; archive old `visitor_*` / digest history to cold storage; move read-heavy static exports later; evaluate managed Postgres only after decoupling Auth |
| **Pros** | Gradual risk reduction; can shrink DB over time |
| **Cons** | Two systems during transition |
| **Best if** | Want to reduce cost after platform stabilizes |
| **Effort** | **1–2 weeks** per incremental step |
| **Downtime** | **Near zero** per step |

---

## 9. Cost / size estimate

| Item | Value |
|------|-------|
| DB total | **1.04 GB** |
| Storage total | **0.31 GB** |
| Largest table | `scholarships` — 652 MB |
| Largest bucket | `essay-heroes` — 238 MB |
| Estimated `pg_dump` size | **~0.8–1.2 GB** (custom format, uncompressed ~1 GB) |
| Estimated restore time | **~10–30 min** on VPS (1 GB DB; depends on disk IO) |
| Storage export | `supabase storage` CLI or S3-compatible export — **~313 MB**, **~15–45 min** |

### VPS disk budget (migration formula)

```
Required = DB × 3 + Storage × 2 + 20 GB safety
         = 1.04 × 3 + 0.31 × 2 + 20
         ≈ 24.8 GB peak during migration window
```

| VPS disk (from Stage 9.0 report) | Value |
|----------------------------------|-------|
| Total | **79 GB** |
| Used (snapshot 2026-06-24) | **~14 GB (18%)** |
| Free (approx) | **~65 GB** |
| Safe free threshold (20%) | **≥16 GB free** |

### Can current 80 GB VPS safely host Supabase/Postgres?

| Scenario | Answer |
|----------|--------|
| **Migration staging** (dump + restore coexist) | **Yes** — ~65 GB free >> ~25 GB required |
| **Production Postgres only** (1 GB DB, alongside site + jobs) | **Cautious yes** on disk; **RAM is the bottleneck** (4 GB shared with Next.js + nginx + cron) |
| **Full self-hosted Supabase stack** | **No** — insufficient RAM/complexity |
| **Long-term without monitoring/backups** | **No** — unacceptable risk |

---

## 10. Backup / export feasibility (not executed)

| Check | Status |
|-------|--------|
| SQL read access | **PASS** — all audit queries succeeded via Supabase MCP |
| `pg_dump` connectivity | **Expected PASS** — standard Supabase direct connection (not tested to avoid dump I/O) |
| Schema export command (document only) | `pg_dump --schema-only "$DATABASE_URL" > supabase-schema-only.sql` |
| Full dump command (document only) | `pg_dump --format=custom "$DATABASE_URL" > supabase-full.dump` |
| Auth export | **Complex** — use Supabase Auth Admin API or `auth.users` migration tooling; password hashes are portable but OAuth linking must be preserved |
| Storage export | **Straightforward** — 313 MB, 2 buckets; plan URL mapping |
| Jobs during migration | **Risk** — SEO/essay/i18n workers write continuously; need freeze or logical replication |
| Rollback | Keep Supabase project active until cutover proven |

**Not executed:** full dumps, storage bulk download, connection string tests (secrets not printed).

---

## 11. Risk matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data loss during dump/restore | Critical | Low (if rehearsed) | PITR backup; test restore on staging; verify row counts |
| Production downtime | High | Medium | Blue/green; keep Supabase live until switch proven |
| Broken Auth (sessions, OAuth) | Critical | High on migration | Keep Supabase Auth; or run parallel auth with forced re-login |
| Broken Storage URLs | High | High on migration | CDN proxy old host; or bulk URL rewrite in DB/HTML |
| Broken RLS / permission errors | High | Medium | Audit all anon-client paths; integration tests per role |
| Missing `pg_net` on target | Medium | Medium | Install extension or replace triggers with app queues |
| Missing `pg_trgm` / custom functions | High | Low | Include extensions in target; run all migrations |
| Backups not configured on VPS DB | Critical | High if self-host | Automated daily dumps + off-site storage before cutover |
| VPS disk full | High | Low (current) | Monitor; 20 GB headroom rule; archive analytics tables |
| VPS RAM too low | High | Medium | Postgres tuning; don't co-locate full Supabase; upgrade RAM if needed |
| Jobs writing during migration | Medium | High | Pause VPS/Railway crons; maintenance window |
| Rollback complexity | High | Medium | DNS/env revert; keep Supabase project 7–14 days |
| Schema drift (108 local vs 50 applied migrations) | Medium | Medium | `supabase db diff` / migration reconcile before any move |
| Sydney ↔ VPS latency | Low | Ongoing | Monitor p95 query time; consider connection pooling |

---

## 12. Recommended path

| Field | Recommendation |
|-------|----------------|
| **Option** | **A — Keep Supabase** through Railway → VPS completion; revisit **E (hybrid)** in Q3/Q4 2026 if cost warrants |
| **Why** | ~1 GB data is small, but **Auth + Storage + RLS + pg_net + 667 files** make full exit expensive; Railway migration still in progress |
| **Estimated effort (if migrating later)** | Option B/C: **4–8 weeks** engineering + **1 week** rehearsal |
| **Estimated downtime (if migrating later)** | **1–4 hours** forced cutover; **0** if staying on Supabase |
| **Prerequisites** | All Railway jobs on VPS; site healthy under load; migration drift reconciled; backup runbook tested |
| **Next safe stage** | Stage 10b: **Supabase hygiene audit** (archive `visitor_page_views`, review `net._http_response` bloat, storage lifecycle) — still read-only / optional cleanup, **no host migration** |

---

## 13. What not to do yet

```text
✗ Do not change DATABASE_URL / Supabase env on production
✗ Do not pause or delete Supabase project
✗ Do not run full pg_dump on production without maintenance window approval
✗ Do not self-host Supabase on 4 GB VPS
✗ Do not migrate DB while Railway cron jobs may still dual-write
✗ Do not rotate Supabase keys as part of migration prep (unnecessary risk)
✗ Do not disable RLS or expose service role to browser
```

---

## 14. Next proposed stage

**Stage 10b — Supabase hygiene (optional, low risk)**

1. Reconcile migration history (108 local vs 50 applied).
2. Measure Supabase → VPS query latency p95 under production load.
3. Inventory tables safe to archive (`visitor_page_views`, old queue rows, `net._http_response`).
4. Document Supabase plan tier + monthly cost from dashboard (not available in this audit).
5. After **all** Railway jobs migrated + 2 weeks stable: decision meeting — **stay (A)** vs **hybrid (E)**.

**Trigger for actual DB migration:** explicit product decision + dedicated staging environment + tested rollback — **not before Railway → VPS is 100% complete.**

---

## Appendix A — Direct answers (Russian summary)

1. **БД:** ~**1.04 GB**
2. **Storage:** ~**0.31 GB** (313 MB)
3. **Самые большие таблицы:** `scholarships` (652 MB), `content_translations` (99 MB), `essays` (59 MB)
4. **Используемые сервисы:** Postgres, Auth, Storage, RLS/API (`supabase-js`), pg_net triggers. Не используются: Realtime, Edge Functions, pgvector, Supabase Cron
5. **Перенос на VPS PostgreSQL:** возможен по объёму данных, но **практически — большой проект** из-за Auth/Storage/RLS; простой cutover не рекомендуется
6. **Варианты:** A (оставить) → E (гибрид) → C (managed Postgres) → B (VPS Postgres) → D (self-host Supabase, не на 4 GB)
7. **Риски:** потеря Auth/Storage URL, RLS regressions, downtime 1–4 ч; стоимость миграции — недели инженерии; Supabase SaaS — ongoing monthly fee
8. **После Railway → VPS:** **сначала завершить миграцию jobs**, стабилизировать VPS, **Supabase не трогать**, затем опциональная гигиена данных

---

## Appendix B — Audit method

- Code: ripgrep for `supabase` / `SUPABASE_` (excl. `node_modules`, `.next`, `reports`)
- DB: read-only SQL via Supabase MCP `execute_sql` on project `qlqlvhgosxhuibzhfsnh`
- No secrets printed; no writes; no dumps created
- VPS disk from [090-vps-reboot-autostart-hardening](090-vps-reboot-autostart-hardening-2026-06-24.md) snapshot

**SUPABASE_AUDIT_ONLY_PASS**
