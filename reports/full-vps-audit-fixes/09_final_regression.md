# 09. Final regression and staged production plan

Final code verdict: **CODE_READY_FOR_STAGED_GO**
Live fixed: **NO**
Current production verdict: **FAIL_P0**
Production touched: **NO**
Secrets exposed: **NO**

Production is still the audited code/config. No `PASS` is claimed until the backup, fail-closed deploy, DBSEC verification and Lemon live canary have completed under separate approvals.

## Commands and results

| Command/check | Result |
|---|---|
| `npm run build` | **PASS**, Next 14.2.35 production build in 139.3s; warnings only |
| `npx tsc --noEmit` | **PASS** |
| `npm run lint` | **PASS**, non-interactive; existing hooks/a11y/image warnings remain |
| `npx tsx --test lib/security/__tests__/*.test.ts lib/payments/__tests__/*.test.ts` | **PASS, 62/62** |
| `npm run test:seo-lib` | **PASS, 85/85** |
| `npm run test:essays-lib` | **PASS, 6/6** |
| Total final Node tests | **PASS, 153/153** |
| Provider ledger disposable PostgreSQL test | **PASS** |
| Essay unaccent disposable PostgreSQL test | **PASS** |
| Legacy trigger apply/rollback disposable PostgreSQL test | **PASS** |
| DBSEC apply/check/rollback disposable PostgreSQL test | **PASS** |
| Backup success/failure/restore-list local test | **PASS** |
| Disposable Nginx `nginx -t` | **PASS** |
| Content-hub build | **PASS** |
| Root `npm audit --omit=dev` | **5 open: 3 low, 1 moderate, 1 high** |
| Content-hub `npm audit --omit=dev` | **PASS, 0 findings** |

The Windows host has no usable `/bin/bash`; new migration shell artifacts were exercised by running the same SQL sequence directly against disposable `postgres:17-alpine` containers.

## What is fixed in code

- Unsafe country signup is fail-closed, never confirms email or returns credentials, and has IP/email/session throttling plus native duplicate-submit disabling.
- Lemon live/test configuration is explicit; production test mode, hosted fallback and invalid provider variants are rejected.
- Backup creation is atomic, nonzero and `pg_restore --list` validated.
- DBSEC, essay unaccent, provider ledger and legacy-trigger migrations have down migrations and disposable tests.
- IQ order webhooks validate store/variant/mode/amount/currency and claim durable event keys before side effects.
- Origin default hosts, forwarded host handling, security headers and runtime cache ownership are hardened in config.
- Broken IQ/sitemap canonicals and empty localized child sitemap publications are corrected.
- URL-only purchase analytics is disabled; expensive guest AI routes are guarded and fail closed by default.
- Critical sanitizer and high `form-data`/`ws` dependency findings are closed; malicious HTML fixtures pass.
- The Lemon debug endpoint and legacy `public.users` writes are removed; lint now runs non-interactively.

## Not applied to production

- No code/image deploy, env change, live DB migration, backup-script install or cron change.
- No Cloudflare/DNS/provider firewall, UFW, PostgreSQL listener, SSH, fail2ban or filesystem permission change.
- No Lemon live variants, webhook, secrets, checkout, canary, replay, refund or reconciliation.
- No live signup/reset/OAuth, DB write, user creation, webhook replay or stale IQ/profile repair.
- Live `/essays`, IQ old-host routing, origin IP exposure, public 5432, cache EACCES and old backup behavior are therefore not claimed fixed.

## Commit groups

| Hash | Group |
|---|---|
| `2f653b1` | Atomic/restorable PostgreSQL backup |
| `3a3acdd` | Fail-closed country signup |
| `7620e75` | DBSEC migration table lockdown |
| `5abafce` | Lemon live/test separation |
| `be67896` | VPS edge, headers, host trust and cache ownership |
| `2ae6456` | Essays/IQ/sitemap migration fixes |
| `46c494b` | IQ payment validation and provider event ledger |
| `1a69cf1` | Disable unverified purchase conversion |
| `706fccd` | Expensive AI endpoint guard |
| `aefa90a` | Production sanitizer/transitive dependency patches |
| `ff486a5` | Legacy public users cleanup and DB reconciliation audit |
| `dea5e33` | Remove Lemon debug endpoint |
| `8ea2507` | Deterministic lint baseline and hook fixes |

## Exact production GO order

### GO-1: backup only

1. Snapshot the current backup script, cron/timer and destination metadata.
2. Install/run the reviewed backup patch without applying any DB migration.
3. Record the new dump identifier, checksum and size; require size greater than zero.
4. Require `pg_restore --list` PASS and no `permission denied` in the run log.
5. Copy the validated artifact off-host according to the approved encryption/retention procedure.
6. Stop immediately on failure; restore the snapshotted script/cron. Do not proceed to GO-2.

### GO-2: fail-closed auth and payment deploy

1. Set `COUNTRY_SIGNUP_MODE=disabled`, `LEMON_MODE=disabled` and `AI_GUEST_ACCESS_ENABLED=0` in the approved production env change.
2. Deploy the reviewed branch/image; do not enable checkout.
3. Smoke homepage, standard signup/signin, account, Auth health, PostgREST and key listing routes.
4. Verify the country endpoint creates no user/session and checkout returns the safe unavailable state.
5. Roll back the image/env if auth or core routes regress.

### GO-3: DBSEC only

1. Reconfirm GO-1 backup freshness and restore-list result.
2. Capture the read-only ACL/RLS/policy snapshot.
3. Apply only the DBSEC migration first.
4. Prove `anon` and `authenticated` cannot read/write the three service tables.
5. Prove GoTrue health, login and token refresh still pass; prove PostgREST/core app health.
6. On regression, apply the ACL down migration from the snapshot or restore the validated dump.

### GO-4: Lemon live

1. Create and independently review live store variants and the live webhook endpoint/secret; keep test IDs separate.
2. Apply the provider ledger migration before enabling IQ/payment side effects.
3. Set only reviewed live env values and validate store, variants, mode, amount and currency through the provider API.
4. Change `LEMON_MODE=live` only after validation passes.
5. Run one approved low-value live canary and verify exactly one entitlement/order transition and expected notifications.
6. Replay the signed provider event; require a duplicate response with no repeated side effects.
7. Execute the approved refund test and verify access/state reconciliation.
8. Reconcile provider orders, subscriptions, ledger entries and the 23 stale IQ pending rows using the read-only report before any repair.
9. Disable `LEMON_MODE` and roll back the image/env immediately if any invariant fails.

## After GO-4

Apply P1 DB migrations (`/essays`, legacy trigger) and edge/firewall/5432/SSH changes only in their own approved windows with the prepared snapshots. A Next 16/React compatibility branch, shared AI quota store, CAPTCHA/spend alerts, server-verified ad conversions and remaining lint warnings are follow-up work.

## Rollback readiness

Application changes are separated into scoped commits. DB migrations have down scripts; backup/edge/host changes have snapshot procedures; auth/payment/AI controls default to disabled. Rollback is prepared locally but has not been proven against live production because no production change was authorized.
