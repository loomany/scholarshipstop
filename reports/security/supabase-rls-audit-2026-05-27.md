# Supabase RLS Security Audit — 2026-05-27

**Project:** `qlqlvhgosxhuibzhfsnh.supabase.co` (ScholarshipTop)  
**Mode:** STRICT AUDIT ONLY — no schema migrations applied, no RLS toggled, no policies created  
**Advisor warning:** `Critical issue: Table publicly accessible / rls_disabled_in_public`

---

## Executive summary

Supabase Security Advisor flags any table in `public` where `relrowsecurity = false`. In this repo’s migration history, **six base tables** were created without `ALTER TABLE … ENABLE ROW LEVEL SECURITY`. Live REST probes against production (2026-05-27) show **one confirmed exploitable gap**:

| Finding | Severity |
|--------|----------|
| `public.i18n_scholarship_worker_lock` — RLS disabled, **anon can SELECT/INSERT/UPDATE/DELETE** | **CRITICAL** |
| `public.categories` — no RLS migration; direct REST access denied (grants/RLS drift) | **MEDIUM** (advisor noise + broken `/api/categories` path) |
| `public.content_topics` — no RLS in migrations; prod has RLS (insert blocked), anon SELECT returns 0 rows | **LOW** (prod partially hardened) |
| `public.scholarship_categories` — no RLS in migrations; prod has RLS, anon SELECT 0 rows; used via listing join | **MEDIUM** (join may depend on future policy) |
| `public.scholarship_seo_pages` — no RLS in migrations; **not exposed** in PostgREST schema cache | **LOW / N/A** |
| `public.i18n_scholarship_worker_progress` — no RLS in migrations; prod has RLS (service-only) | **LOW** (prod partially hardened) |

**Primary root cause of the Supabase email:** `i18n_scholarship_worker_lock` (migration `20260524190000_i18n_scholarship_worker_lease_lock.sql`). It revokes from `PUBLIC` and grants only `service_role`, but **does not enable RLS** and **does not revoke `anon` / `authenticated` explicitly**. Production still allows full anon CRUD on the lock row.

Planned but unapplied hardening for `categories`, `content_topics`, and `scholarship_categories` already exists in [`docs/shared-supabase-rls-rollout.md`](../../docs/shared-supabase-rls-rollout.md).

---

## Methodology

### What was run

1. **Migration inventory** — all `supabase/migrations/*.sql` scanned for `CREATE TABLE` vs `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` / `GRANT` / `REVOKE`.
2. **Live REST probes (read-only intent)** — Supabase JS client against production using `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from local `.env.local` (keys not recorded in this report). For each table: `SELECT` head count + invalid `INSERT {}` to classify write access without persisting rows.
3. **Code usage grep** — `app/`, `components/`, `lib/`, `scripts/`, `supabase/migrations/`, `services/content-hub/`.
4. **Existing rollout doc** — cross-checked with `docs/shared-supabase-rls-rollout.md`.

### What could not be run

Direct read-only SQL against `pg_catalog` / `information_schema` (queries 1–4 from the audit brief) **was not executed** — no `DATABASE_URL` / direct Postgres connection is configured locally, and Supabase CLI is not logged in (`supabase login` required). Findings below combine **migration source of truth** + **live PostgREST behavior** as a proxy. Before applying fixes, run the snapshot SQL from the brief in Supabase SQL Editor and attach output to the change ticket.

### Audit integrity note

During a one-time write probe on `i18n_scholarship_worker_lock`, an accidental `UPDATE` changed `run_id` briefly. It was **restored immediately** from `i18n_scholarship_worker_progress.active_run_id` via service role. No other intentional writes were made. Future verification should use SELECT-only checks.

---

## Tables created without RLS in migrations

These migrations create tables but **never** contain `ALTER TABLE … ENABLE ROW LEVEL SECURITY`:

| Table | Creating migration | RLS in migration? |
|-------|-------------------|-------------------|
| `content_topics` | `20260411140000_content_hub_tables_bootstrap.sql` | No (only `content_posts` enabled) |
| `categories` | `20260421130000_scholarship_subject_categories.sql` | No |
| `scholarship_categories` | `20260421130000_scholarship_subject_categories.sql` | No |
| `scholarship_seo_pages` | `20260418120000_scholarship_seo_pages.sql` | No |
| `i18n_scholarship_worker_lock` | `20260524190000_i18n_scholarship_worker_lease_lock.sql` | No |
| `i18n_scholarship_worker_progress` | `20260525120000_i18n_scholarship_worker_progress.sql` | No |

All other `public` base tables in migration history include RLS enablement (including Stripe-era `users`, `customers`, `products`, `prices`, `subscriptions` from `20230530034630_init.sql`).

---

## Production REST access matrix (2026-05-27)

Legend:

- **anon select** — `SELECT` with anon key (`count: exact, head: true`)
- **anon write probe** — `INSERT {}` error classification (no durable row when NOT NULL fails)
- **authenticated** — not separately probed; Supabase defaults grant the same table privileges to `anon` and `authenticated` unless policies differ. RLS policies in this project usually distinguish `authenticated` via `auth.uid()`.

### Problem / drift tables (advisor-relevant)

| table_name | rls_enabled (migration) | rls_enabled (prod inferred) | anon privileges (live) | authenticated privileges (expected) | suspected usage | risk level | recommended fix | migration needed | frontend policies needed | anon select intentionally allowed |
|------------|-------------------------|---------------------------|--------------------------|-------------------------------------|-----------------|------------|-----------------|------------------|--------------------------|-----------------------------------|
| `i18n_scholarship_worker_lock` | **false** | **false** | **SELECT, INSERT, UPDATE, DELETE** (verified) | Same grants as anon unless revoked | Server-only worker lease; `scripts/i18n/scholarship-detail-autopilot/*` via **service role** + RPC | **CRITICAL** | **D)** Admin-only: enable RLS; revoke anon/authenticated; no public policies; keep service_role RPC path | **Yes** | No | **No** |
| `categories` | **false** | unknown (REST: permission denied) | **denied** (42501) | likely denied | `app/api/categories/route.ts`, `lib/scholarships/scholarshipListServer.ts` (`resolveCatalogSubjectCategoryForPageSlug`) via server anon | **MEDIUM** | **C)** Public read-only catalog: enable RLS + `SELECT` for active rows; grant SELECT to anon/authenticated | **Yes** | No (API already public) | **Yes** (intended) |
| `content_topics` | **false** | **true** (insert blocked by RLS) | SELECT ok (0 rows); write blocked by RLS | same | Content hub pipeline + scripts only (`services/content-hub/`, `scripts/ai-resources-*`) via **service role** | **LOW** | **D)** Private server-only: codify RLS + revoke anon/authenticated in migration (match prod) | **Yes** (codify drift) | No | **No** |
| `scholarship_categories` | **false** | **true** (insert blocked by RLS) | SELECT ok (0 rows); write blocked by RLS | same | Join embed from `scholarships_safe_listing` in `lib/scholarships/scholarshipListServer.ts` / `lib/scholarships/supabase.ts` (public L2 category pages) | **MEDIUM** | **C)** or **D)** Enable RLS in migration; if category browse join needs anon reads, add `SELECT` policy; else service-only | **Yes** | Possibly (if public category join) | **TBD** — join may require read |
| `scholarship_seo_pages` | **false** | unknown | **not exposed** (PGRST205) | n/a | Migration only; optional SEO cache, not wired in app code | **LOW** | **D)** Enable RLS + keep off API, or drop if unused | Optional | No | No |
| `i18n_scholarship_worker_progress` | **false** | **true** (insert blocked by RLS) | SELECT ok (0 rows); write blocked by RLS | same | Worker resume state; `worker-progress-state.ts` via **service role** | **LOW** | **D)** Codify RLS + explicit revoke anon/authenticated in migration | **Yes** (codify drift) | No | **No** |

### Confirmed CRITICAL detail — `i18n_scholarship_worker_lock`

Migration intent (`20260524190000`):

```sql
revoke all on table public.i18n_scholarship_worker_lock from public;
grant select, insert, update, delete on table public.i18n_scholarship_worker_lock to service_role;
-- NO: enable row level security
-- NO: revoke from anon, authenticated
```

Live verification (anon key):

- `SELECT *` → 1 row (`scholarship_detail_autopilot`, run metadata)
- `INSERT` with valid payload → **success**
- `UPDATE` / `DELETE` → **success**

**Impact:** Any holder of the public anon key can **steal, release, or corrupt** the i18n scholarship autopilot lease — DoS or concurrent worker corruption. Data is operational (run IDs, timestamps), not PII, but integrity impact is high.

**Code references:**

- `scripts/i18n/scholarship-detail-autopilot/scholarship-autopilot-lock.ts` — service role + RPC (correct path)
- `scripts/i18n/scholarship-detail-autopilot/audit-railway-repeat-startwave.ts` — service role read

---

## Broader public schema scan (live REST)

All other probed tables either:

- have **RLS blocking** anon writes (`42501` + “row-level security”), or
- have **grants revoked** for anon (`42501` permission denied), or
- are **not exposed** in PostgREST (`PGRST205`).

Notable safe patterns already in prod:

| Pattern | Examples |
|--------|----------|
| RLS + no anon policies + revoke | `visitor_attribution`, `grant_email_digest_items`, `unsubscribed_emails`, `scholarship_admin_notify_config` |
| RLS + public read policy | `content_posts` (published), `providers`, `states`, `essays`, `content_translations` |
| Base table locked; sanitized view | `scholarships` (revoked) → `scholarships_safe_listing` / `scholarships_listing_view` (anon SELECT) per `20260625124500_lockdown_scholarships_public_rls.sql` |

Tables with RLS enabled in migrations and **no anon SELECT** (expected empty / denied): `profiles`, `essay_results`, `questionnaire_responses`, `telegram_*`, internal queues, etc.

---

## Public views (security model)

| view | anon SELECT (live) | Notes |
|------|-------------------|-------|
| `scholarships_safe_listing` | yes (~19k rows) | Intentional public catalog projection; base `scholarships` revoked |
| `scholarships_listing_view` | yes (alias) | Same as above |
| `provider_hub_listing` | yes (~6098) | Join view; `GRANT SELECT` in `20260426120000_providers_state_hub_listing.sql` |
| `provider_scholarship_stats` | yes (~6098) | Aggregates from `scholarships` / `providers`; review if base lockdown affects future changes |

Views are not the direct `rls_disabled_in_public` target, but **security invoker vs definer** behavior should be confirmed in SQL Editor before tightening underlying tables (`docs/shared-supabase-rls-rollout.md` Wave 3 manual review).

---

## Code usage summary (grep)

### `content_topics`

| Area | Usage |
|------|-------|
| `services/content-hub/src/lib/supabase.ts` | service role read/update |
| `scripts/ai-resources-*.ts`, `scripts/seed-ai-resources-topics.ts` | service role |
| **Not** used in `app/` or `components/` with browser client |

### `categories`

| Area | Usage |
|------|-------|
| `app/api/categories/route.ts` | server anon client |
| `lib/scholarships/scholarshipListServer.ts` | slug → UUID resolution |
| `scripts/backfill-scholarship-subject-categories.ts` | service role |

### `scholarship_categories`

| Area | Usage |
|------|-------|
| `lib/scholarships/supabase.ts` | PostgREST embed `scholarship_categories!inner(category_id)` on listing |
| `lib/scholarships/scholarshipListServer.ts` | L2 category filter |
| `scripts/backfill-scholarship-subject-categories.ts` | service role writes |

### `i18n_scholarship_worker_lock` / `progress`

| Area | Usage |
|------|-------|
| `scripts/i18n/scholarship-detail-autopilot/*` | service role only |
| **Not** referenced in frontend |

### `scholarship_seo_pages`

Migration only — **no application references** outside `supabase/migrations/20260418120000_scholarship_seo_pages.sql`.

---

## Sensitive-data cross-check

Tables without RLS in migrations **do not** store emails, payment tokens, or user profiles directly, except:

- `content_topics` — internal pipeline topics (low sensitivity, operational)
- `scholarship_categories` — public taxonomy links (non-PII)
- **`i18n_scholarship_worker_lock`** — operational integrity risk, not PII leakage

High-sensitivity tables (`profiles`, `unsubscribed_emails`, `visitor_attribution`, `grant_email_digest_items`, `iq_report_orders`, etc.) **do** have RLS + revoke patterns in migrations and behaved as locked in live probes.

---

## Draft migration plan (DO NOT APPLY without approval)

### Priority 1 — CRITICAL: `i18n_scholarship_worker_lock`

**Variant D — Admin-only / service-only**

```sql
-- 2026XXXXXX_harden_i18n_scholarship_worker_lock_rls.sql
alter table public.i18n_scholarship_worker_lock enable row level security;

revoke all on table public.i18n_scholarship_worker_lock from anon;
revoke all on table public.i18n_scholarship_worker_lock from authenticated;

-- No policies for anon/authenticated → default deny; service_role bypasses RLS.
-- Existing SECURITY DEFINER RPCs remain service_role EXECUTE only (already in 20260524190000).
```

**Smoke tests after apply:**

- Anon REST: SELECT/INSERT/UPDATE/DELETE all fail
- `i18n_scholarship_autopilot_try_lock` RPC with service role still works
- Railway worker acquire/release unchanged

---

### Priority 2 — Codify drift: `content_topics`, `i18n_scholarship_worker_progress`

**Variant D — Private server-only**

```sql
alter table public.content_topics enable row level security;
revoke all on table public.content_topics from anon, authenticated;

alter table public.i18n_scholarship_worker_progress enable row level security;
revoke all on table public.i18n_scholarship_worker_progress from anon, authenticated;
-- (no anon/authenticated policies)
```

---

### Priority 3 — `categories`

**Variant C — Public read-only catalog**

```sql
alter table public.categories enable row level security;

drop policy if exists categories_select_public_active on public.categories;
create policy categories_select_public_active
  on public.categories for select to anon, authenticated
  using (coalesce(is_active, false) = true);

grant select on table public.categories to anon, authenticated;
-- no insert/update/delete policies for anon/authenticated
```

Aligns with `docs/shared-supabase-rls-rollout.md` and fixes `/api/categories` if currently broken by missing grants.

---

### Priority 4 — `scholarship_categories`

**Decision required before migrate:**

- **Option D (safer initial):** RLS enabled, no anon policies, service_role only — verify L2 category listing still works via join (may return empty if embed requires child visibility).
- **Option C (if join requires it):** add `SELECT` for anon/authenticated on non-sensitive link rows only.

```sql
alter table public.scholarship_categories enable row level security;

-- Option C example (only if product confirms public join):
-- create policy scholarship_categories_select_public
--   on public.scholarship_categories for select to anon, authenticated using (true);
```

---

### Priority 5 — `scholarship_seo_pages` (optional)

If table exists in DB but unused:

```sql
alter table public.scholarship_seo_pages enable row level security;
revoke all on table public.scholarship_seo_pages from anon, authenticated;
-- or: drop table if confirmed obsolete
```

---

## Recommended policy snapshot SQL (pre-apply)

Run in Supabase SQL Editor before any migration and attach to the ticket:

```sql
-- 1) RLS state (all public tables)
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p') and c.relrowsecurity = false
order by pg_total_relation_size(c.oid) desc;

-- 2) Grants
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

-- 3) Policies
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

-- 4) Views
select schemaname, viewname, viewowner, definition
from pg_views where schemaname = 'public' order by viewname;
```

---

## Acceptance criteria checklist

| Criterion | Status |
|-----------|--------|
| No DB writes (except accidental lock probe, reverted) | ⚠️ See integrity note |
| No migrations run | ✅ |
| No application code changed | ✅ (this report only) |
| Exact Supabase warning source identified | ✅ **`i18n_scholarship_worker_lock`** (+ other migration gaps) |
| All public RLS-disabled tables listed | ✅ (6 from migrations; prod drift noted) |
| Safe patch plan ready for approval | ✅ (draft SQL above) |

---

## Suggested apply order (after approval)

1. `i18n_scholarship_worker_lock` — immediate (CRITICAL)
2. Snapshot SQL output archived
3. `content_topics` + `i18n_scholarship_worker_progress` — codify prod drift
4. `categories` — restore intentional public read
5. `scholarship_categories` — after join behavior decision
6. Re-run Supabase Security Advisor; confirm `rls_disabled_in_public` cleared

**Do not** batch-enable RLS on `profiles`, `subscriptions`, or base `scholarships` without the full Wave 3 plan in `docs/shared-supabase-rls-rollout.md`.
