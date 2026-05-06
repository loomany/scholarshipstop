# Failed Jobs / Cron Audit (Railway)

Generated: 2026-05-06  
Scope:
- Services: `Скрипты`, `Сео генерация`, `Сео индексация`, `Контент Хаб`, `Рассылка`
- Sources:
  - `logs/live/**`
  - Railway logs (`railway logs --since 24h ...`)
  - Railway deployments (`railway deployment list --service ... --json`)
  - `reports/multi-service-health.md`

## Executive summary

- **Recent explicit FAILED/CANCELLED runs:** not confirmed in sampled deployment status history.
- **Observed statuses:** mostly `SUCCESS` for latest runs; many historical entries in deployment list marked `REMOVED` (superseded deployments).
- **Major operational signal:** reconnect churn in live collector streams (tooling/network/platform stream stability), not direct app run failure.
- **Service-specific runtime errors:** concentrated in `Сайт` (Telegram recipient warnings), outside the requested 5-service failed-job set.

## Requested jobs check

Requested labels:
- `Scholarships: email confir...`
- `Scholarship guest/detail up...`
- `Add priority indexing script...`
- `Left-align best-recommen...`

Findings:
- These names were found as deployment commit messages in recent deployment history snapshots.
- Their deployment entries appeared with `status: "REMOVED"` in Railway deployment list outputs.
- In this context `REMOVED` is treated as **superseded/replaced deployment**, not direct proof of job failure.

## Per-service failed/cancelled run audit

## 1) Скрипты

- **Approx timestamp(s):**
  - latest success deployment around `2026-05-06T12:27:15.931Z`
  - historical entries include many `REMOVED` deployments.
- **Confirmed vs possible:** **possible non-critical only**
- **Severity:** low
- **Probable root cause:** frequent redeploy replacement cycle (`REMOVED`) rather than execution failure.
- **Evidence lines:**
  - deployment list: latest `status: SUCCESS`
  - deployment history: repeated `status: REMOVED`
- **Timeout / non-zero / crash / OOM / unhandled rejection:** not confirmed.
- **Supabase/API/Telegram/email failures:** not confirmed from filtered Railway logs.

## 2) Сео генерация

- **Approx timestamp(s):**
  - latest deployment around `2026-05-06T12:27:16.694Z` (now `SUCCESS`)
  - transient `BUILDING` observed in earlier health snapshot.
- **Confirmed vs possible:** **possible transient platform/build phase**
- **Severity:** low to medium
- **Probable root cause:** transient deployment phase transitions during rollout.
- **Evidence lines:**
  - earlier snapshot: latestDeployment `BUILDING`
  - refreshed status: `SUCCESS`
- **Timeout / non-zero / crash / OOM / unhandled rejection:** not confirmed.
- **Supabase/API/Telegram/email failures:** not confirmed in filtered logs.

## 3) Сео индексация

- **Approx timestamp(s):**
  - latest deployment around `2026-05-06T12:27:17.208Z` (currently `SUCCESS`)
  - previously seen transient `DEPLOYING` in one snapshot.
- **Confirmed vs possible:** **possible transient deploy phase only**
- **Severity:** low
- **Probable root cause:** normal deploy-state transition.
- **Evidence lines:**
  - health snapshot showed transient deploy phase
  - current service status now `SUCCESS`
- **Timeout / non-zero / crash / OOM / unhandled rejection:** not confirmed.
- **Supabase/API/Telegram/email failures:** not confirmed.

## 4) Контент Хаб

- **Approx timestamp(s):**
  - latest deployment around `2026-05-06T12:27:16.444Z` (success, stopped)
  - runtime log sample around `2026-05-06T12:32:05Z`.
- **Confirmed vs possible:** **possible harmless/expected stop behavior**
- **Severity:** low
- **Probable root cause:** deployment configured as stopped/exited for this service context.
- **Evidence lines:**
  - service status: `SUCCESS`, `stopped: true`
  - Railway logs sample: `[Cycle] Queue fully drained. Exiting continuous run.`
- **Timeout / non-zero / crash / OOM / unhandled rejection:** not confirmed.
- **Supabase/API/Telegram/email failures:** not confirmed from filtered logs.

## 5) Рассылка

- **Approx timestamp(s):**
  - latest deployment around `2026-05-06T12:27:16.946Z` (`SUCCESS`)
- **Confirmed vs possible:** no confirmed failed runs
- **Severity:** low
- **Probable root cause:** low/idle runtime output in sampled window.
- **Evidence lines:**
  - service status: `SUCCESS`
  - filtered Railway logs returned no failure patterns
- **Timeout / non-zero / crash / OOM / unhandled rejection:** not confirmed.
- **Supabase/API/Telegram/email failures:** not confirmed in service-local filtered logs.

## Real failures vs harmless vs false positives

### Real failures (confirmed)
- None confirmed for the requested 5 services in sampled recent windows.

### Harmless / non-critical
- `REMOVED` deployment entries in history: likely superseded deployments after new rollout.
- Transient `BUILDING` / `DEPLOYING` states that later resolved to `SUCCESS`.
- `Queue fully drained. Exiting continuous run` in `Контент Хаб`: appears expected lifecycle behavior.

### False positives / caution
- Treating `REMOVED` as failure is a likely false positive without corroborating crash/exit evidence.
- Collector reconnect alerts indicate stream instability and can overstate app-failure risk.

## Timeout patterns

- No direct timeout/non-zero-exit evidence found in sampled service logs for requested services.
- No explicit `timed out`, `exit code`, `non-zero` lines confirmed.

## Retry patterns

- Strong retry/reconnect pattern observed at collector level:
  - repeated `stream disconnected, reconnect #N in ...` across multiple services.
- This indicates log-stream instability/noise, not definitive job execution failure.

## Additional checks requested

- **Services stuck in Building:** observed transiently for `Сео генерация`; resolved to `SUCCESS` on refresh.
- **Repeated Railway deploy failures:** not confirmed.
- **Services without logs:** none (all requested services have live files).
- **Silent failures:** not confirmed; low-output services more likely idle/no-runtime-output in window.

## Final verdict

- For the requested 5 services, **no confirmed failed/cancelled runs** were identified in this audit window.
- Primary risk signal is **operational stream instability** (reconnect churn), not clear job crash/failure evidence.
