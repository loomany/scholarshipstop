# Multi-Service Railway Health Audit (6h window)

Generated: 2026-05-06  
Scope:
- Railway services in project `Сайт/Контент Хаб`
- Live collector snapshot
- `logs/live/**`
- `npm run logs:analyze -- --since 6h`

## Collector coverage (all target services)

Collector is attached to all requested services:
- `Сайт`
- `Скрипты`
- `Сео генерация`
- `Сео индексация`
- `Сео Аудит`
- `Контент Хаб`
- `Рассылка`
- `Рассылка провайдеры`

Evidence:
- Collector startup log: `Collector running for 8 service(s)`
- Live folders exist for all 8 services under `logs/live/`

## Per-service status

Snapshot sources:
- `reports/live-health.md` at `2026-05-06T12:31:53.591Z`
- live-file stats sampled around `12:32Z`
- Railway status from `railway service list --json`

| service | live stream present | recent logs | last timestamp | log volume | reconnect count (6h) | current status |
|---|---|---|---|---:|---:|---|
| Контент Хаб | yes | yes | 2026-05-06T12:32:29.186Z | 47,556 bytes | 13 | collector: active/disconnecting cycles; Railway: SUCCESS, deployment stopped |
| Рассылка | yes | yes | 2026-05-06T12:32:07.640Z | 888 bytes | 6 | collector: disconnected; Railway: SUCCESS |
| Рассылка провайдеры | yes | yes | 2026-05-06T12:32:29.144Z | 638,504 bytes | 15 | collector: frequent reconnects; Railway: SUCCESS |
| Сайт | yes | yes | 2026-05-06T12:32:28.824Z | 19,635,736 bytes | 19 | collector: connecting/disconnecting; Railway: SUCCESS |
| Сео Аудит | yes | yes | 2026-05-06T12:32:04.982Z | 888 bytes | 6 | collector: disconnected; Railway: SUCCESS |
| Сео генерация | yes | yes | 2026-05-06T12:32:05.709Z | 888 bytes | 6 | collector: disconnected; Railway latest deployment shows BUILDING |
| Сео индексация | yes | yes | 2026-05-06T12:32:02.022Z | 888 bytes | 6 | collector: disconnected; Railway: SUCCESS |
| Скрипты | yes | yes | 2026-05-06T12:32:06.996Z | 888 bytes | 6 | collector: disconnected; Railway: SUCCESS |

## Services with low/no runtime output (why)

Services with tiny volumes (~888 bytes) have stream heartbeat/reconnect events but no substantive app logs in the sampled window:
- `Рассылка`
- `Сео Аудит`
- `Сео генерация`
- `Сео индексация`
- `Скрипты`

Most likely reasons:
- idle workload in this window
- cron not triggered in the sampled interval
- no runtime output emitted by service process
- service state/build phase transition (notably `Сео генерация` showed `BUILDING`)

Not observed:
- missing collector attachment (collector is attached to all 8)

## 6h incident scan (from analyzer + direct counters)

From `npm run logs:analyze -- --since 6h`:
- confirmed incident types currently concentrated on `Сайт`:
  - Telegram notification failures
  - reconnect-loop instability
  - cache/cookies + unstable_cache warning signals (historical in 6h window)

Direct per-service counters (6h sampled):
- **Telegram failures**: only `Сайт` (high)
- **Webhook failures**: none observed
- **Parser failures**: none observed
- **SEO pipeline failures**: none explicitly matched by current pattern scan
- **Cron failures**: none explicitly matched by current pattern scan
- **Build failures**: none explicitly matched in logs

## Unstable ranking (operational)

By observed instability (error density + reconnect churn + active alerts):
1. `Сайт` (highest log volume, repeated reconnect alerts, repeated error/telegram signals)
2. `Рассылка провайдеры` (high volume + reconnect churn)
3. `Контент Хаб` (moderate volume + reconnect churn)
4. `Сео генерация` / `Сео индексация` / `Сео Аудит` / `Скрипты` / `Рассылка` (low-output streams, mostly reconnect/idle signatures)

## Stuck/build/deploy checks

- Services currently stuck in BUILDING at snapshot:
  - `Сео генерация` (latestDeployment.status = `BUILDING`)
- Repeated Railway deploy failures:
  - no explicit repeated deploy-failure evidence in sampled logs
- Services without logs:
  - none (all 8 have live log files)
- Silent failures:
  - no explicit fatal/silent crash signature outside reconnect churn;
  - several low-volume services appear idle/no-output rather than hard-failing.

## Final audit verdict

- **Collector coverage:** OK across all 8 services.
- **Runtime health:** mixed; `Сайт` remains the noisiest service.
- **Platform/deploy health:** mostly stable, with one service (`Сео генерация`) in BUILDING at observed snapshot.
