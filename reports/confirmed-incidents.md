# Confirmed incidents analysis

Generated: 2026-05-06T12:11:38.681Z

## Top unstable services ranking

1. `сайт` - score 26

# CONFIRMED

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
- `OOM` from `logs/сайт.log`: downgraded: email contains 'oom' substring
  -   toEmail: 'loomany.self@gmail.com'
