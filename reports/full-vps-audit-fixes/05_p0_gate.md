# 05. P0 verification gate

Issue IDs covered: `AUTH-001`, `DBSEC-001`, `PAY-001`, `AUTH-003`, `PAY-003`, `OPS-001`  
Verdict: **P0_MITIGATED_NEEDS_LIVE_CANARY**  
Production touched: **NO**  
Secrets exposed: **NO**

## Gate results

| Check | Result |
|---|---|
| Auth/payment security tests | PASS, 14/14 |
| Existing webhook tests | PASS, 33/33 |
| SEO library tests | PASS, 82/82 |
| Essays library tests | PASS, 6/6 |
| Backup success/failure tests | PASS |
| DBSEC disposable PostgreSQL apply/check/rollback | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS, 206 static pages |
| Deterministic lint | NOT PASS; existing script remains interactive |

Total Node tests in this gate: **135 PASS, 0 FAIL**.

## P0 status

- `AUTH-001`: **MITIGATED_IN_CODE**. Default disabled; safe optional mode creates no confirmed user/session before email proof.
- `DBSEC-001`: **READY_FOR_BACKUP_AND_GO**. Migration/rollback/regression pass disposable DB, not applied live.
- `PAY-001`: **MITIGATED_IN_CODE**. Default disabled; no hosted/test fallback. Live dashboard/webhook/canary remain.
- Backup prerequisite: **PATCH_TESTED, LIVE_PROOF_MISSING**.

## Smoke checklist status

- Homepage/auth/account/build routes: build PASS; live remains unchanged.
- Unsafe country signup disabled: code/test PASS; live deployment pending.
- GoTrue health and PostgREST: pre-change read-only health known PASS; post-migration smoke pending GO.
- Anon migration table denial: disposable PASS; production pending backup + GO.
- Checkout disabled/live-safe: code/test PASS; production deployment pending.
- Webhook signatures: 33 existing tests PASS; live signed delivery pending GO.

## Files changed

See reports `01` through `04` for the exact P0 file lists.

## Commands run

Targeted Node tests, existing webhook/SEO/essays suites, shell backup tests, disposable PostgreSQL test, TypeScript and Next production build.

## Rollback plan

Each P0 has an isolated rollback in its report. Operational default is fail-closed: `COUNTRY_SIGNUP_MODE` and `LEMON_MODE` stay disabled while DB change can be rolled back from ACL snapshot/down migration or full validated dump.

## Remaining risks

- Current live production is still the audited code/config and therefore remains `FAIL_P0`.
- No current nonzero live backup/restore-check exists yet.
- No production DB negative test or GoTrue post-migration smoke has run.
- No Lemon live endpoint, signed event, canary or refund reconciliation has run.
- The tracked example env contained credential-shaped values; local template is sanitized, but validity/rotation/history cleanup require GO.
