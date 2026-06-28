# 08. P1 payments, analytics, dependencies and abuse controls

Issue IDs covered: `PAY-002`, `AN-001`, `DEP-001`, `API-001`, `AUTH-002`, `DB-001`
Production touched: **NO**
Secrets exposed: **NO**

## Files changed

- IQ checkout now requires explicit live/test variants, validates the provider variant before creating a pending order, and fails closed when configuration is incomplete.
- IQ `order_created` validates store, variant, mode, exact minor-unit total and currency before changing order state.
- `provider_webhook_events` migration/RPC claims each provider order before side effects; duplicate deliveries return without repeating email or Telegram. A rollback is included.
- The public subscription success page no longer emits `purchase_success`; server-verified conversion emission remains deliberately disabled.
- Public AI routes have minute/day budgets by IP/session/user, concurrency caps, streamed JSON/body limits and provider timeouts. Anonymous production access requires `AI_GUEST_ACCESS_ENABLED=1`.
- The DB reconciliation SQL is read-only and emits only aggregates or truncated hashes for missing profiles, entitlement mismatches and stale IQ orders.
- `sanitize-html`, DOMPurify, `form-data` and `ws` received non-breaking security updates in the relevant lockfiles. Both application and content-hub sanitizer paths have malicious fixtures.

## Commands run

- Payment/security Node test suites and `tsc --noEmit`.
- Disposable PostgreSQL apply/claim/duplicate/fail/reclaim test for the provider event ledger.
- `npm audit --omit=dev` in the root and `services/content-hub`.
- Content-hub TypeScript build and malicious HTML sanitizer tests.
- Deterministic `npm run lint` after adding an explicit ESLint config/plugin.

## Tests passed/failed

- Payment tests: **PASS, 50/50**.
- Provider event ledger disposable DB test: **PASS**.
- AI abuse limiter tests: **PASS, 3/3**.
- Malicious sanitizer fixtures: **PASS, 2/2**.
- Content-hub build: **PASS**.
- Root production audit: **5 remaining** (`3 low`, `1 moderate`, `1 high`); critical sanitizer and high `form-data`/`ws` findings are closed.
- Content-hub production audit: **PASS, 0 findings**.
- Lint: **PASS with existing warnings**; command is non-interactive.

## GO smoke and reconciliation plan

1. Require a verified live backup, apply the ledger migration, then deploy with IQ checkout disabled.
2. Configure and independently verify the live IQ variant, store, amount/currency and live webhook secret.
3. Run one approved canary; confirm one ledger row, one order transition and one email/Telegram side-effect set. Replay the signed event and confirm `duplicate` with no new effects.
4. Run `audit-db-consistency-readonly.sql`; review hashes against the prior audit and verify all entitlement candidates against Lemon/Stripe before any write.
5. Keep anonymous AI disabled until the desired budgets and provider spend alerts are approved. Add a shared limiter before horizontal scaling.

## Rollback plan

- Disable `LEMON_MODE`/IQ checkout first, then roll back the application image. Drop the ledger only before live events exist; otherwise preserve it and restore from the validated backup.
- Keep purchase conversion disabled during rollback.
- Set `AI_GUEST_ACCESS_ENABLED=0` to fail closed without a code rollback.
- Dependency rollback is the preceding lockfile/package commit; do not roll back the sanitizer patch while untrusted content is served.

## Remaining risks

- No live IQ canary, signed replay or reconciliation has run without GO. The 23 audited stale pending rows are untouched.
- External side effects use the durable event/order state, but a transactional outbox would provide stronger cross-service delivery guarantees.
- Next 14 remains on an audit-reported high-severity advisory set. The available automated fix is a breaking Next 16/React migration, so it is not forced into this production-recovery patch.
- Root `@supabase/ssr`/Next transitive low/moderate findings remain; upgrading them requires compatibility work.
- AI counters are process-local for the current single-instance VPS; Redis/shared quota, CAPTCHA and provider spend alerts remain before multi-instance or broad guest enablement.
- Server-verified ad conversion delivery is not implemented; false purchase events are prevented by leaving conversion emission off.
