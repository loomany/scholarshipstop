# Production Site Memory Guard

Date: 2026-07-01
Scope: emergency site runtime memory guard after a full VPS stall

## Incident

The public site stopped returning bytes through Cloudflare, direct origin HTTP/HTTPS
was unavailable, and SSH connected at TCP level but timed out before the server
banner. The provider control panel initially failed to reboot the VPS. A manual
power-off/power-on restored the host.

Historical `sar` evidence from the stalled boot:

- RAM used: 87.69%; available memory: 78 MiB.
- Swap used: 8,388,488 KiB, 100% of the configured 8 GiB.
- Load averages: 27.87 / 44.53 / 51.84.
- Blocked tasks: 10.
- `systemd-resolved` and `systemd-journald` repeatedly reported memory pressure.
- Prior kernel OOM records killed `next-server` at approximately 1.7-3.0 GiB RSS
  on 2026-06-25, 2026-06-29 and 2026-06-30.

Before this change, the site container had no memory, memory+swap, PID or Node heap
limit. This allowed an application memory increase to degrade the entire VPS through
swap thrashing instead of containing the failure to the restartable site container.

## Approved guard

Only the `site` service in `ops/vps/docker-compose.yml` changed:

```yaml
environment:
  NODE_OPTIONS: "--max-old-space-size=1024"
mem_limit: "1536m"
memswap_limit: "2048m"
pids_limit: 256
```

The existing `restart: unless-stopped` policy remains active.

## Deployment

- Protected snapshot: `/root/scholarshiptop-memguard-20260701T130709Z`.
- Compose validation passed locally and on the VPS before activation.
- Only `scholarshiptop-site` was force-recreated with `--no-deps --no-build`.
- Application image remained
  `sha256:0c450fd7f30c695335d5cafc6658076117c4ea33f79fb938a126eaea4431fbe7`.
- Application commit remained `1040c9af9bf9110003b0ce0e3388eb4a0eecc2e9`.
- Site env SHA-256 before/after remained
  `5799a69c668dc4d39ebda7f75be6ee1ade8e53487b40bc563a7c6d4fd992ee3e`.
- Nginx config SHA-256 remained
  `fad8db6109bedd5f7f2a5bb142b78062f1cc46a0bc99af0ce23bd37214aef92a`.
- Nginx configuration test passed.

Effective Docker values:

```text
Memory=1610612736
MemorySwap=2147483648
PidsLimit=256
NODE_OPTIONS=--max-old-space-size=1024
```

## Verification

- Core public pages, essays, resources, compare, IQ, subscription, sitemap, robots
  and `llms.txt`: HTTP 200.
- GoTrue health: HTTP 200.
- PostgREST smoke: HTTP 200.
- Fail-closed auth/payment/AI flags remained unchanged.
- Site health: healthy; restarts: 0; OOMKilled: false.
- Five observation checkpoints over five minutes: all healthy and HTTP 200.
- Site usage during observation: 209-274 MiB of the 1.5 GiB limit.
- Host available memory: 2.7-2.8 GiB; swap used: 0.
- Fatal/OOM/permission log matches: 0.
- Nginx 5xx after deployment: 0.

One SSH session reset during observation. Public HTTP, origin HTTP, site health,
memory and restart checks immediately remained normal; it was not a site or VPS
resource regression.

## Boundaries and rollback

No application code/image, Nginx configuration, database, auth, Lemon, DNS,
firewall, parser service or environment file value changed.

Rollback is prepared by restoring
`/root/scholarshiptop-memguard-20260701T130709Z/docker-compose.before.yml`,
recreating only the site service, and testing/reloading Nginx. Rollback was not
needed.

```text
MEMORY_GUARD_DEPLOYED=YES
SITE_HEALTHY=YES
PUBLIC_SITE_HTTP_200=YES
RESTARTS=0
OOM_KILLED=NO
HOST_SWAP_USED=0
ROLLBACK_READY=YES
```
