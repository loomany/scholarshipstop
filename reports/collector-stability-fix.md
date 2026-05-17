# Collector Stability Fix (Tooling-only)

Generated: 2026-05-06T14:53:00Z

## What changed

- Updated `scripts/railway/collector.ts` to pass `--follow` for `railway logs` when supported by current CLI.
- Added CLI capability detection (`railway logs --help`) and safe fallback to `railway logs --service <id> --json` when `--follow` is unavailable.
- Added anomaly filter for collector transport/status phrases (`stream disconnected`, `reconnect #`, `stream active`, `connecting`) so they are not treated as business incidents.
- Updated health report writer to include `Connecting streams` and switched to atomic write (`.tmp` + rename) to avoid partial reads.
- Restarted collector as a single active instance after stopping stale duplicate collectors.

## Typecheck

- `npx tsc --noEmit`: PASS.

## Before / after snapshot

- Before patch/restart (`reports/live-health.md`):
  - Active streams: `0`
  - Disconnected streams: `5`
  - Reconnects were in very high range (legacy collector process had runaway counters).
- After patch/restart and 2+ minutes (`reports/live-health.md`):
  - Active streams: `0`
  - Connecting streams: `2`
  - Disconnected streams: `6`
  - Reconnect counts remain high growth for hot services (e.g. `Сайт`, `Контент Хаб`, `Скрипты`, `Рассылка провайдеры`).

## Reconnect behavior

- Reconnect storm persists for several services despite patch.
- Primary reason: installed Railway CLI in this environment does not support `--follow` argument (`unexpected argument '--follow'`), so collector uses fallback mode.
- Fallback mode still reconnects frequently in this CLI/runtime combination.

## Live log writes check

- Fresh writes are present in `logs/live/*` for all target service folders during verification window.
- Log rotation continues to work (`.partN.log` files are being appended).

## Degraded services remaining

- Yes. Multiple services remain degraded due to persistent disconnect/reconnect cycles.

## 24h recommendation

- Current collector can continue capturing logs, but **not** in stable "low reconnect" mode yet.
- For true 24h stable streams, upgrade Railway CLI to a version with native `logs --follow` support (or use a supported persistent streaming mode), then rerun collector.
