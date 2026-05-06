# Next 24h Monitoring (Operational)

## 1) Highest-risk services

- `Сайт` (highest error volume, user-facing impact)
- `Контент Хаб` (reconnect churn + cycle exits)
- `Рассылка провайдеры` (high throughput + reconnect churn)
- `Сео генерация` (recent BUILDING transitions)

## 2) What to monitor

- `railway service list --json` every 1-2h (status drift, build loops)
- `reports/live-health.md` (active vs disconnected streams, reconnect growth)
- `npm run logs:fetch -- --service "Сайт" --lines 1000`
- `npm run logs:analyze -- --since 2h`

## 3) Real failure indicators

- repeated `FAILED/CANCELLED` deployments for same service
- repeated `status: 500`/explicit non-zero exits in runtime logs
- confirmed OOM / out-of-memory / killed process
- cron/job starts without completion signals over multiple runs

## 4) Noise to ignore

- `REMOVED` deployment entries alone
- short transient `BUILDING/DEPLOYING` that resolves to `SUCCESS`
- isolated collector reconnect lines without service errors
- `OOM` substring inside email-like text

## 5) When rollback is actually needed

- `Сайт`: user-facing 500s or broken personalization/sidebar counts
- repeated failed deploys with no successful recovery
- hard runtime crashes (OOM/non-zero) persisting after retries
- SSR latency/user flow degradation confirmed in production behavior

## 6) Alerts actionable immediately

- `Route /api/scholarships ... unstable_cache` appears in fresh post-deploy window
- repeated Telegram failure bursts on `Сайт` (config issue, noisy but fixable)
- same service reconnect count accelerating + no fresh app log lines
- any explicit `timeout`, `unhandled rejection`, `build failed` on monitored services

## 7) Incidents likely harmless

- `Контент Хаб`: `Queue fully drained. Exiting continuous run.` (if expected cycle pattern)
- low-volume logs for cron-like services during idle windows
- single reconnect spikes during deploy transitions
