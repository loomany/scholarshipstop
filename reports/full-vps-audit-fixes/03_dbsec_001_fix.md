# 03. DBSEC-001 fix

Issue IDs covered: `DBSEC-001`  
Production touched: **NO**  
Secrets exposed: **NO**

## Prepared fix

- Read-only ACL snapshot captures relation owner, RLS, grants, policies and dependencies.
- Corrective migration names all three confirmed production tables explicitly, revokes all privileges from `anon/authenticated` and enables deny-all RLS.
- `service_role` keeps `BYPASSRLS`; current GoTrue connects as PostgreSQL superuser, so service access is not revoked.
- General PostgREST grant script now reapplies the deny rule to current/future `schema_migrations_gotrue_backup_*` tables.
- Regression SQL fails on any anon/authenticated table privilege or disabled RLS.
- Emergency down migration restores the audited prior privileges and clearly warns that it reopens the P0.

## Files changed

- `scripts/vps-migration/dbsec-001-acl-snapshot.sql`
- `supabase/migrations/20260628100000_lock_down_exposed_migration_tables.sql`
- `supabase/rollbacks/20260628100000_lock_down_exposed_migration_tables.down.sql`
- `scripts/vps-migration/check-dbsec-001.sql`
- `scripts/vps-migration/tests/dbsec-001.test.sh`
- `ops/vps/scripts/grant-postgrest-api-roles.sh`

## Commands run

- Read-only production OpenAPI inventory identified the exact three relation names; no keys were printed.
- Disposable PostgreSQL test applies migration, regression check, service-role write, rollback and privilege restoration.

## Tests passed/failed

- Disposable PostgreSQL 17: ACL snapshot, migration, regression query, service-role write, rollback and restored privilege: **PASS**.
- Production negative tests: **NOT RUN (backup + GO required)**.

## Production application gate

1. Stage 1 live dump must be nonzero and pass `pg_restore -l`.
2. Run ACL snapshot to a root-only file and retain it with the change ticket.
3. Apply migration in transaction; run regression SQL.
4. Negative GET/POST/DELETE as anon and authenticated.
5. Verify GoTrue health, login, staging signup/token refresh and service-role access.

## Rollback plan

Use the ACL snapshot as source of truth. The provided down migration restores the known audited state only as an emergency measure; immediately restrict network/API access while rollback is active. Restore the database dump if schema/GoTrue behavior cannot be recovered by ACL rollback.

## Remaining risks

- Migration is deliberately **NOT APPLIED** until a valid production backup and GO exist.
- Exact live owner/grant/dependency snapshot must be captured immediately before application to detect drift.
