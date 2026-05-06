# Railway Logs Toolkit

Local observability/debug tooling for ScholarshipTop using real Railway CLI commands.

## Prerequisites

- Railway CLI installed (`npm install -g @railway/cli`)
- Authorized Railway session (`railway login`)
- Linked project/environment in this repo (`railway link`)

## Scripts

- `npm run logs:fetch`  
  Fetch historical logs for all Railway services into `/logs`.

- `npm run logs:fetch -- --lines 2500`  
  Fetch with custom line count (clamped to 1000-3000).

- `npm run logs:fetch -- --since 2h`  
  Fetch logs since relative/ISO time accepted by Railway.

- `npm run logs:fetch -- --service "Сайт"`  
  Fetch only one matching service (name or ID).

- `npm run logs:tail`  
  Live follow mode for all services (`railway logs` stream) and append to local log files.

- `npm run logs:tail -- --service "Скрипты"`  
  Live follow only one service.

- `npm run logs:analyze`  
  Analyze logs and write summary report to `reports/log-analysis.md`.

- `npm run logs:collector`  
  Continuous live collector for all services with auto-reconnect and health report.

- `npm run logs:collector:site`  
  Continuous collector for service "Сайт" only.

- `npm run logs:collector:scripts`  
  Continuous collector for service "Скрипты" only.

## Files created

- `logs/*.log` - raw Railway logs in JSON-lines format (`railway logs --json`)
- `logs/live/{service}/{YYYY-MM-DD}[.partN].log` - continuous live stream logs with 50MB rotation
- `reports/log-analysis.md` - keyword and incident-bucket summary report
- `reports/live-health.md` - collector health status (active/disconnected/reconnect/uptime)

## Notes

- This setup does not modify production code.
- This setup does not deploy anything.
- It is observability/debug tooling only.
