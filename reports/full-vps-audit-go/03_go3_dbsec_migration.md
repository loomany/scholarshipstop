# Production GO-3 DBSEC Migration

Date: 2026-06-29
Operator: Codex over `ubuntu` SSH with passwordless `sudo`
Branch: `fix/full-vps-audit-p0-p1`
Reviewed migration commit: `7620e75`
Application commit already live: `8936bf8`
Production touched: **DBSEC ACL/RLS/COMMENTS ONLY**
DBSEC migration applied: **YES**
Other migrations applied: **NO**
Application/env changed: **NO**
Lemon/checkout/webhook changed: **NO**
DNS/firewall/Nginx changed: **NO**
Production signup/reset/OAuth performed: **NO**
Secrets exposed: **NO**

## Verdict

```text
GO-3_DBSEC_MIGRATION_APPLIED: YES
DBSEC_LIVE_VERIFIED: YES
ANON_DENIED_LIVE: YES
AUTHENTICATED_DENIED_LIVE: YES
SERVICE_ROLE_ACCESS_RETAINED: YES
GOTRUE_HEALTHY_LIVE: YES
POSTGREST_HEALTHY_LIVE: YES
CORE_SITE_HEALTHY: YES
NO_NEW_P0_LOGS: YES
ROLLBACK_READY: YES
ROLLBACK_PERFORMED: NO
OTHER_DB_MIGRATIONS_APPLIED: NO
GO-3_VERDICT: PASS_WITH_SAFE_AUTH_LIMITATION
```

The DBSEC live objective passed. Successful password login/getUser/refresh was verified against a disposable clone using the same GoTrue image and the exact DBSEC migration. A successful login/refresh was not run against live production because no existing test credentials were available and production signup/reset was explicitly prohibited. Live GoTrue health and non-mutating password/refresh route rejects passed.

The overall production verdict is not `LIVE_FIXED`: GO-4 Lemon live remains separately gated.

## GO-1 dump prerequisite

- Dump: `/opt/scholarshiptop-db-backups/scholarshiptop_prod-20260628T151756Z.dump`
- Size: `213575801` bytes
- Expected SHA-256: `98c9e70fb2e51899572577ae433d81ecada24d366edac468db72819899883d3c`
- Actual SHA-256: identical
- `sha256sum -c`: exit 0
- `pg_restore -l`: exit 0, 967 catalog lines
- Dump remained present after GO-3.

No new dump was created and no dump was deleted.

## Fresh snapshot

Root-only snapshot:

```text
/root/scholarshiptop-go3-dbsec-snapshot-20260629T011435Z
```

- Directory mode: `0700`
- Evidence file modes: `0600`
- Fresh ACL snapshot includes owners, RLS state, grants, policies and dependencies.
- Target-only custom-format dump: 10,810 bytes; `pg_restore -l` PASS, 26 lines.
- Site, GoTrue and PostgREST inspect/log baselines retained root-only.
- Reviewed up/down/check SQL copies and checksums retained.

## Reviewed SQL

Only this production migration was applied:

```text
supabase/migrations/20260628100000_lock_down_exposed_migration_tables.sql
```

Normalized SHA-256:

```text
9941b6f62dbea853cb88946fecc20734630c4a6dcb1bcc3a1d2090e276e3418a
```

Rollback SQL:

```text
supabase/rollbacks/20260628100000_lock_down_exposed_migration_tables.down.sql
SHA-256: 9a5a3414ac5e1481cf35066a2acac6ec02f354c75bef8f0256a0b406f7cec198
```

Deployed copies differed from the reviewed files only by CRLF line endings; normalized content checksums matched before application.

## ACL before

Exact live relations:

```text
public.schema_migrations
public.schema_migrations_gotrue_backup_20260624t233812z
public.schema_migrations_gotrue_backup_20260625t063235z
```

Before application:

- Owner: `postgres` for all three.
- RLS enabled: 0 of 3.
- Policies: 0.
- `anon`/`authenticated` grants: 36.
- PostgREST GET as anon: 200 on all three.
- PostgREST GET as synthetic authenticated role: 200 on all three.

The fresh pre-state reproduced the audited P0 exposure.

## Apply

Apply started at `2026-06-29T01:16:38+00:00`.

```bash
sudo -u postgres psql -X -v ON_ERROR_STOP=1 \
  -d scholarshiptop_prod < dbsec.up.sql

sudo -u postgres psql -X -v ON_ERROR_STOP=1 \
  -d scholarshiptop_prod < dbsec.check.sql
```

- Apply exit code: 0.
- Regression check exit code: 0.
- Transaction committed once.
- No migration runner, seed or additional SQL migration was invoked.
- `public.schema_migrations`: 54 before and 54 after.
- `auth.schema_migrations`: 76 before and 76 after.

## ACL after

- Forbidden `anon`/`authenticated` grants: 0.
- RLS enabled: 3 of 3.
- Deny-all policy count: 0; with RLS and no grants, the relations remain inaccessible.
- DBSEC table comments present: 3 of 3.
- Privilege matrix: 0 true results across 42 role/table/privilege checks.
- Direct `SET ROLE anon` reads: permission denied on 3 of 3.
- Direct `SET ROLE authenticated` reads: permission denied on 3 of 3.
- `SET ROLE service_role` read: PASS.

PostgREST results:

| Relation | anon | authenticated |
|---|---:|---:|
| `schema_migrations` | 401 denied | 403 denied |
| `schema_migrations_gotrue_backup_20260624t233812z` | 401 denied | 403 denied |
| `schema_migrations_gotrue_backup_20260625t063235z` | 401 denied | 403 denied |

No response exposed migration row data after application.

## PostgREST and core smoke

- Allowed `scholarships_safe_listing` anon GET: 200.
- PostgREST container: running, restart count 0.
- Homepage: 200.
- Site container: running/healthy, restart count 0.
- GO-2 fail-closed env remained unchanged.

## GoTrue verification

### Live production

- `/supabase/auth/v1/health`: 200.
- GoTrue container: running/healthy, restart count 0.
- Nonexistent `.invalid` password login: expected 400.
- Invalid refresh token: expected 400.
- Response credential/token field scan: none.
- `auth.users`: 556 before and after.
- `auth.sessions`: 731 before and after.
- `auth.refresh_tokens`: 1202 before and after.
- No production user, session or refresh-token row was created.

### Successful isolated flow

A disposable clone of `scholarshiptop_auth_test` was adjusted to the exact three-relation production shape, received the same DBSEC up/check SQL and used `supabase/gotrue:v2.184.0`.

- GoTrue health: 200.
- Password login: 200.
- getUser: 200.
- Refresh token flow: 200 with new access/refresh tokens.
- Test user cleanup: PASS, user count 555 before and after.
- Temporary container: removed.
- Temporary database: removed.
- Production DBSEC remained 0 forbidden grants / 3 RLS-enabled relations throughout.

Earlier shadow setup attempts stopped before auth execution because the existing auth-test database had different historical backup-table names and an assertion initially counted indexes. Every temporary database/container was removed; those diagnostics did not alter production.

## Logs

Observation window after apply: 769 seconds.

- Site fatal/panic/uncaught/EACCES/permission matches: 0.
- GoTrue fatal/panic/uncaught/EACCES/permission matches: 0.
- PostgREST fatal/panic/uncaught/EACCES matches: 0.
- GoTrue expected 4xx entries from the two live negative probes: 2.
- Site, GoTrue and PostgREST restart counts: 0/0/0.
- No new P0 was detected.

## Unchanged infrastructure

- Compose checksum: `7b3c430c5f630f052a12687ddca6c6191f9e2365d125f15b7a2a2cf949a9200c`
- Nginx tree checksum: `84fdd58c134cfb38d51c2faf4cf6ccd6be86e949b04369c09b4dcb0d85b1b169`
- Application image/env: unchanged.
- Lemon dashboard, IDs, secrets, checkout, canary and webhook replay: not touched.
- DNS, Cloudflare, firewall and Nginx: not touched.
- SEO deploy: not run.

## Rollback readiness

The exact down migration was rehearsed in a disposable PostgreSQL database:

- Up + regression check: PASS.
- Down: PASS.
- Restored forbidden grants: 36.
- Restored RLS enabled count: 0.
- Rehearsal database: removed.

Emergency rollback command:

```bash
sudo -u postgres psql -X -v ON_ERROR_STOP=1 \
  -d scholarshiptop_prod \
  < /root/scholarshiptop-go3-dbsec-snapshot-20260629T011435Z/dbsec.down.sql
```

The down migration deliberately reopens the audited P0 and must be used only for an auth/service regression. After rollback, rerun the fresh ACL snapshot and health checks. The validated GO-1 dump and target-only pre-change dump are retained as recovery layers.

Rollback performed on production: **NO**.

## Next stage

Await explicit acceptance of GO-3. The next possible stage is separately approved GO-4 Lemon live. No GO-4 action was started.
