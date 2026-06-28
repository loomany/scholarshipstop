# 06. P1 security and operations

Issue IDs covered: `SEC-001`, `SEC-002`, `SEC-003`, `SEC-004`, `AUTH-002`, `OPS-001`, `OPS-002`, `PERF-001`  
Production touched: **NO**  
Secrets exposed: **NO**

## Files changed

- Nginx default hosts now return 444; HTTP www/apex redirect directly to HTTPS apex.
- Security headers include adds nosniff, referrer, frame, permissions, 1-day HSTS and CSP Report-Only.
- Proxy routes overwrite `X-Forwarded-Host` with `$host`.
- Production auth/reset origins resolve from canonical env/fallback before reading request headers.
- Both VPS Dockerfiles use `COPY --chown=nextjs:nodejs` for runtime artifacts and writable Next cache.
- Next disables `X-Powered-By`; legacy `/login` and `/register` redirects are added.
- GO-gated snapshot and host-hardening scripts are prepared.

## Commands run

- Static config checks and shell syntax checks.
- Nginx `-t` in a disposable container and Docker ownership contract tests are recorded after execution.

## Tests passed/failed

- Disposable Nginx `nginx -t`: **PASS**.
- Shell syntax for snapshot/hardening scripts: **PASS**.
- Next redirect/powered-header contract: **PASS**.
- Docker `COPY --chown` contract: **PASS**.
- Auth host contract/full TypeScript: pending final regression.

## GO runbook

1. Open provider console and a second verified key-only SSH session.
2. Run `snapshot-security-config-before-go.sh`; copy snapshot ID to the change ticket.
3. Deploy/test Nginx config before firewall: canonical edge 200, unknown Host/bare IP no production content, auth/reset links unchanged.
4. At provider firewall allow 80/443 only from current official Cloudflare IP ranges; deny public 5432. Keep SSH limited to administrator source ranges.
5. Enable host firewall with Docker-aware rules; verify app, GoTrue, PostgREST, cron and SSH tunnel.
6. Apply SSH/filesystem hardening only with all three confirmation variables and console access.
7. Observe CSP reports/browser console before enforcing or increasing HSTS.

## Rollback plan

Restore Nginx directory from snapshot and reload only after `nginx -t`. Restore firewall rules via provider console first if edge/SSH is lost. Restore SSH drop-in through the open second session/provider console. Roll back the site image if cache ownership causes runtime regression.

## Remaining risks

- Firewall, PostgreSQL listener, SSH, permissions and fail2ban are not changed without GO.
- Cloudflare allowlist must be sourced from the current official list at execution time.
- CSP is Report-Only and HSTS deliberately short until browser/GTM/Lemon validation.
- Memory limits wait for a 24-hour profile after the cache/log storm is fixed.
