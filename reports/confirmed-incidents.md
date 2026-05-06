# Confirmed incidents analysis

Generated: 2026-05-06T12:32:08.768Z
Analysis window start: 2026-05-06T06:32:08.401Z
Analysis window end: 2026-05-06T12:32:08.667Z

## Top unstable services ranking

1. `сайт` - score 26
2. `контент хаб` - score 6
3. `рассылка` - score 6
4. `рассылка провайдеры` - score 6
5. `сео аудит` - score 6
6. `сео генерация` - score 6
7. `сео индексация` - score 6
8. `скрипты` - score 6

# CONFIRMED

- **Repeated reconnect loop** | service: `контент хаб` | severity: medium
  - root cause: Collector stream instability with repeated disconnects.
  - fix: Add jittered backoff, monitor network/CLI stability, and track gap duration.
  - evidence: [2026-05-06T12:30:58.002Z] `logs/live/Контент Хаб/2026-05-06.log` -> stream disconnected; reconnect #1 in 2s
  - evidence: [2026-05-06T12:31:07.979Z] `logs/live/Контент Хаб/2026-05-06.log` -> stream disconnected; reconnect #2 in 2s
  - evidence: [2026-05-06T12:31:17.834Z] `logs/live/Контент Хаб/2026-05-06.log` -> stream disconnected; reconnect #3 in 2s
  - evidence: [2026-05-06T12:31:27.239Z] `logs/live/Контент Хаб/2026-05-06.log` -> stream disconnected; reconnect #4 in 2s
  - evidence: [2026-05-06T12:31:33.081Z] `logs/live/Контент Хаб/2026-05-06.log` -> stream disconnected; reconnect #5 in 2s
- **Repeated reconnect loop** | service: `рассылка` | severity: medium
  - root cause: Collector stream instability with repeated disconnects.
  - fix: Add jittered backoff, monitor network/CLI stability, and track gap duration.
  - evidence: [2026-05-06T12:31:01.915Z] `logs/live/Рассылка/2026-05-06.log` -> stream disconnected; reconnect #1 in 2s
  - evidence: [2026-05-06T12:31:08.017Z] `logs/live/Рассылка/2026-05-06.log` -> stream disconnected; reconnect #2 in 3s
  - evidence: [2026-05-06T12:31:13.799Z] `logs/live/Рассылка/2026-05-06.log` -> stream disconnected; reconnect #3 in 6s
  - evidence: [2026-05-06T12:31:24.847Z] `logs/live/Рассылка/2026-05-06.log` -> stream disconnected; reconnect #4 in 12s
  - evidence: [2026-05-06T12:31:39.696Z] `logs/live/Рассылка/2026-05-06.log` -> stream disconnected; reconnect #5 in 24s
- **Repeated reconnect loop** | service: `рассылка провайдеры` | severity: medium
  - root cause: Collector stream instability with repeated disconnects.
  - fix: Add jittered backoff, monitor network/CLI stability, and track gap duration.
  - evidence: [2026-05-06T12:30:58.142Z] `logs/live/Рассылка провайдеры/2026-05-06.log` -> stream disconnected; reconnect #1 in 2s
  - evidence: [2026-05-06T12:31:05.633Z] `logs/live/Рассылка провайдеры/2026-05-06.log` -> stream disconnected; reconnect #2 in 2s
  - evidence: [2026-05-06T12:31:11.257Z] `logs/live/Рассылка провайдеры/2026-05-06.log` -> stream disconnected; reconnect #3 in 2s
  - evidence: [2026-05-06T12:31:17.849Z] `logs/live/Рассылка провайдеры/2026-05-06.log` -> stream disconnected; reconnect #4 in 2s
  - evidence: [2026-05-06T12:31:22.852Z] `logs/live/Рассылка провайдеры/2026-05-06.log` -> stream disconnected; reconnect #5 in 2s
- **Telegram notification failure** | service: `сайт` | severity: medium
  - root cause: Missing recipient mapping/config for Telegram notifications.
  - fix: Validate TELEGRAM_ADMIN_IDS/telegram_users mapping and add fallback recipients.
  - evidence: [2026-05-06T11:42:40.471Z] `logs/live/Сайт/2026-05-06.log` -> [telegram] notifyTelegramAdminsVisitorFirstTouch: no recipient chat IDs for source facebook_paid (per-source and traffic category empty — check TELEGRAM_ADMIN_IDS / telegram_users prefs)
  - evidence: [2026-05-06T11:42:40.472Z] `logs/live/Сайт/2026-05-06.log` -> [telegram] notifyTelegramAdminsVisitorFirstTouch: no recipient chat IDs for source facebook_paid (per-source and traffic category empty — check TELEGRAM_ADMIN_IDS / telegram_users prefs)
  - evidence: [2026-05-06T11:43:14.704Z] `logs/live/Сайт/2026-05-06.log` -> [telegram] notifyTelegramAdminsVisitorFirstTouch: no recipient chat IDs for source facebook_paid (per-source and traffic category empty — check TELEGRAM_ADMIN_IDS / telegram_users prefs)
  - evidence: [2026-05-06T11:46:57.448Z] `logs/live/Сайт/2026-05-06.log` -> [telegram] notifyTelegramAdminsVisitorFirstTouch: no recipient chat IDs for source facebook_paid (per-source and traffic category empty — check TELEGRAM_ADMIN_IDS / telegram_users prefs)
  - evidence: [2026-05-06T11:49:17.791Z] `logs/live/Сайт/2026-05-06.log` -> [telegram] notifyTelegramAdminsVisitorFirstTouch: no recipient chat IDs for source facebook_paid (per-source and traffic category empty — check TELEGRAM_ADMIN_IDS / telegram_users prefs)
- **Repeated reconnect loop** | service: `сайт` | severity: medium
  - root cause: Collector stream instability with repeated disconnects.
  - fix: Add jittered backoff, monitor network/CLI stability, and track gap duration.
  - evidence: [2026-05-06T11:53:00.698Z] `logs/live/Сайт/2026-05-06.log` -> stream disconnected; reconnect #1 in 2s
  - evidence: [2026-05-06T11:53:05.301Z] `logs/live/Сайт/2026-05-06.log` -> stream disconnected; reconnect #2 in 2s
  - evidence: [2026-05-06T11:53:48.147Z] `logs/live/Сайт/2026-05-06.log` -> stream disconnected; reconnect #1 in 2s
  - evidence: [2026-05-06T11:53:53.507Z] `logs/live/Сайт/2026-05-06.log` -> stream disconnected; reconnect #2 in 2s
  - evidence: [2026-05-06T11:53:58.264Z] `logs/live/Сайт/2026-05-06.log` -> stream disconnected; reconnect #3 in 2s
- **Cache/cookies misuse** | service: `сайт` | severity: high
  - root cause: Dynamic cookie access used inside cache scope.
  - fix: Read cookies outside cache function and pass dynamic values as args.
  - evidence: [2026-05-06T12:09:27.103Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
  - evidence: [2026-05-06T12:09:24.667Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
  - evidence: [2026-05-06T12:09:27.103Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
  - evidence: [2026-05-06T12:09:24.169Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
  - evidence: [2026-05-06T12:09:24.667Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
- **unstable_cache violation** | service: `сайт` | severity: high
  - root cause: Next.js unstable_cache runtime constraint violation.
  - fix: Refactor cached path to avoid dynamic data APIs inside unstable_cache.
  - evidence: [2026-05-06T12:09:27.103Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
  - evidence: [2026-05-06T12:09:24.667Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
  - evidence: [2026-05-06T12:09:27.103Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
  - evidence: [2026-05-06T12:09:24.169Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
  - evidence: [2026-05-06T12:09:24.667Z] `logs/live/Сайт/2026-05-06.log` ->   message: 'Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data
- **Repeated reconnect loop** | service: `сео аудит` | severity: medium
  - root cause: Collector stream instability with repeated disconnects.
  - fix: Add jittered backoff, monitor network/CLI stability, and track gap duration.
  - evidence: [2026-05-06T12:30:56.542Z] `logs/live/Сео Аудит/2026-05-06.log` -> stream disconnected; reconnect #1 in 2s
  - evidence: [2026-05-06T12:31:01.351Z] `logs/live/Сео Аудит/2026-05-06.log` -> stream disconnected; reconnect #2 in 3s
  - evidence: [2026-05-06T12:31:09.605Z] `logs/live/Сео Аудит/2026-05-06.log` -> stream disconnected; reconnect #3 in 6s
  - evidence: [2026-05-06T12:31:18.186Z] `logs/live/Сео Аудит/2026-05-06.log` -> stream disconnected; reconnect #4 in 12s
  - evidence: [2026-05-06T12:31:34.067Z] `logs/live/Сео Аудит/2026-05-06.log` -> stream disconnected; reconnect #5 in 24s
- **Repeated reconnect loop** | service: `сео генерация` | severity: medium
  - root cause: Collector stream instability with repeated disconnects.
  - fix: Add jittered backoff, monitor network/CLI stability, and track gap duration.
  - evidence: [2026-05-06T12:30:58.003Z] `logs/live/Сео генерация/2026-05-06.log` -> stream disconnected; reconnect #1 in 2s
  - evidence: [2026-05-06T12:31:05.774Z] `logs/live/Сео генерация/2026-05-06.log` -> stream disconnected; reconnect #2 in 3s
  - evidence: [2026-05-06T12:31:13.754Z] `logs/live/Сео генерация/2026-05-06.log` -> stream disconnected; reconnect #3 in 6s
  - evidence: [2026-05-06T12:31:23.591Z] `logs/live/Сео генерация/2026-05-06.log` -> stream disconnected; reconnect #4 in 12s
  - evidence: [2026-05-06T12:31:38.704Z] `logs/live/Сео генерация/2026-05-06.log` -> stream disconnected; reconnect #5 in 24s
- **Repeated reconnect loop** | service: `сео индексация` | severity: medium
  - root cause: Collector stream instability with repeated disconnects.
  - fix: Add jittered backoff, monitor network/CLI stability, and track gap duration.
  - evidence: [2026-05-06T12:30:56.577Z] `logs/live/Сео индексация/2026-05-06.log` -> stream disconnected; reconnect #1 in 2s
  - evidence: [2026-05-06T12:31:01.032Z] `logs/live/Сео индексация/2026-05-06.log` -> stream disconnected; reconnect #2 in 3s
  - evidence: [2026-05-06T12:31:07.916Z] `logs/live/Сео индексация/2026-05-06.log` -> stream disconnected; reconnect #3 in 6s
  - evidence: [2026-05-06T12:31:17.029Z] `logs/live/Сео индексация/2026-05-06.log` -> stream disconnected; reconnect #4 in 12s
  - evidence: [2026-05-06T12:31:35.180Z] `logs/live/Сео индексация/2026-05-06.log` -> stream disconnected; reconnect #5 in 24s
- **Repeated reconnect loop** | service: `скрипты` | severity: medium
  - root cause: Collector stream instability with repeated disconnects.
  - fix: Add jittered backoff, monitor network/CLI stability, and track gap duration.
  - evidence: [2026-05-06T12:30:56.875Z] `logs/live/Скрипты/2026-05-06.log` -> stream disconnected; reconnect #1 in 2s
  - evidence: [2026-05-06T12:31:01.649Z] `logs/live/Скрипты/2026-05-06.log` -> stream disconnected; reconnect #2 in 3s
  - evidence: [2026-05-06T12:31:12.010Z] `logs/live/Скрипты/2026-05-06.log` -> stream disconnected; reconnect #3 in 6s
  - evidence: [2026-05-06T12:31:22.097Z] `logs/live/Скрипты/2026-05-06.log` -> stream disconnected; reconnect #4 in 12s
  - evidence: [2026-05-06T12:31:36.964Z] `logs/live/Скрипты/2026-05-06.log` -> stream disconnected; reconnect #5 in 24s

# LIKELY

No incidents.

# POSSIBLE

No incidents.

# Noise / ignored matches

- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
- `OOM` from `logs/live/Сайт/2026-05-06.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
