# Supabase RLS P1 Worker Lock Fix — 2026-05-27

## Scope

P1 security fix for Supabase Security Advisor warning `rls_disabled_in_public` on:

- `public.i18n_scholarship_worker_lock`

No application logic, frontend, auth, payments, Lemon, SEO, `categories`, `scholarship_categories`, or `content_topics` code/migrations were changed.

## Migration

Local migration file:

- `supabase/migrations/20260527175738_harden_i18n_scholarship_worker_lock_rls.sql`

SQL:

```sql
alter table public.i18n_scholarship_worker_lock enable row level security;

revoke all on table public.i18n_scholarship_worker_lock from anon;
revoke all on table public.i18n_scholarship_worker_lock from authenticated;

-- No anon/authenticated policies intentionally.
-- service_role bypasses RLS.
-- Existing SECURITY DEFINER RPC/service-role worker path should continue working.
```

Applied to Supabase project `qlqlvhgosxhuibzhfsnh` via Supabase MCP `apply_migration` after local `npx supabase migration new ...` hung without output. Supabase migration history recorded:

- version: `20260527175738`
- name: `20260527225400_harden_i18n_scholarship_worker_lock_rls`

The local file uses the recorded remote version to avoid a future duplicate `db push`.

## Pre-Apply Snapshot

Captured with read-only SQL before applying the migration.

### RLS State

| schema_name | table_name | rls_enabled | force_rls | total_size |
|-------------|------------|-------------|-----------|------------|
| `public` | `i18n_scholarship_worker_lock` | `false` | `false` | `32 kB` |

### Grants

Before the fix, `anon`, `authenticated`, and `service_role` all had:

- `DELETE`
- `INSERT`
- `REFERENCES`
- `SELECT`
- `TRIGGER`
- `TRUNCATE`
- `UPDATE`

### Existing Policies

No RLS policies existed for `public.i18n_scholarship_worker_lock`.

### RPC References

Visible related RPCs:

| function_name | args | security_definer | owner |
|---------------|------|------------------|-------|
| `i18n_scholarship_autopilot_is_locked` | none | `true` | `postgres` |
| `i18n_scholarship_autopilot_try_lock` | `p_run_id text` | `true` | `postgres` |
| `i18n_scholarship_autopilot_unlock` | none | `true` | `postgres` |
| `i18n_scholarship_autopilot_unlock_run` | `p_run_id text` | `true` | `postgres` |

## Post-Apply Snapshot

### RLS State

| schema_name | table_name | rls_enabled | force_rls | total_size |
|-------------|------------|-------------|-----------|------------|
| `public` | `i18n_scholarship_worker_lock` | `true` | `false` | `32 kB` |

### Grants

After the fix, only `service_role` has direct table grants:

- `DELETE`
- `INSERT`
- `REFERENCES`
- `SELECT`
- `TRIGGER`
- `TRUNCATE`
- `UPDATE`

`anon` and `authenticated` have no direct grants on the table.

### Policies

No RLS policies exist for `public.i18n_scholarship_worker_lock`. This is intentional: the table is server-only and service-role/RPC based.

## Verification

### Anon REST

All probes used `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `UPDATE` and `DELETE` targeted a non-existent audit key; no real lock row was deleted.

| Probe | Result |
|-------|--------|
| `SELECT` | `401 Unauthorized`, `42501 permission denied for table i18n_scholarship_worker_lock` |
| `INSERT` | `401 Unauthorized`, `42501 permission denied for table i18n_scholarship_worker_lock` |
| `UPDATE` missing key | `401 Unauthorized`, `42501 permission denied for table i18n_scholarship_worker_lock` |
| `DELETE` missing key | `401 Unauthorized`, `42501 permission denied for table i18n_scholarship_worker_lock` |

### Service Role / RPC

| Check | Result |
|-------|--------|
| service-role table read | OK, count `1` |
| `i18n_scholarship_autopilot_is_locked` RPC | OK |
| `i18n_scholarship_autopilot_try_lock` RPC | OK inside rollback transaction (`try_lock_executed = true`) |

No full i18n autopilot run was started.

### Related Tables

Read-only post-check for related tables:

| table_name | rls_enabled |
|------------|-------------|
| `categories` | `true` |
| `content_topics` | `true` |
| `i18n_scholarship_worker_lock` | `true` |
| `scholarship_categories` | `true` |

No local changes were made to `categories`, `scholarship_categories`, or `content_topics` migrations.

## Local Checks

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Passed |
| IDE diagnostics for changed files | Passed |
| `npm run lint` | Did not complete as lint; `next lint` entered interactive ESLint setup prompt because no ESLint config was detected. No configuration was selected and no settings were changed. |
| targeted worker lock script | Not run: `scripts/i18n/scholarship-detail-autopilot/test-scholarship-autopilot-lock.ts` performs acquire/release and deletes the live lock row on release. Rollback RPC smoke above was used instead to avoid deleting data. |

### Supabase Security Advisor

Security Advisor was re-run after the fix. The target `rls_disabled_in_public` finding is no longer present for `public.i18n_scholarship_worker_lock`.

The remaining target-specific advisor output is informational and expected:

- `rls_enabled_no_policy`
- `Table public.i18n_scholarship_worker_lock has RLS enabled, but no policies exist`

This is intentional because no anon/authenticated policies should exist for this server-only table.

## Changed Files

- `supabase/migrations/20260527175738_harden_i18n_scholarship_worker_lock_rls.sql`
- `reports/security/supabase-rls-p1-worker-lock-fix-2026-05-27.md`

Pre-existing untracked audit report:

- `reports/security/supabase-rls-audit-2026-05-27.md`

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| `public.i18n_scholarship_worker_lock` has RLS enabled | Passed |
| `anon` has no direct table access | Passed |
| `authenticated` has no direct table access | Passed |
| No anon/authenticated policies exist | Passed |
| service-role worker/RPC path still works | Passed |
| No app code changed | Passed |
| No `categories` / `scholarship_categories` / `content_topics` changes | Passed |
| No push performed | Passed |
