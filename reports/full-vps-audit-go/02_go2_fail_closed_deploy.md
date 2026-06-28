# Production GO-2 Fail-closed Deploy

Date: 2026-06-29 (Asia/Qyzylorda), 2026-06-28 UTC on production
Operator: Codex over `ubuntu` SSH with passwordless `sudo`
Branch: `fix/full-vps-audit-p0-p1`
Commit deployed: `8936bf8`
Previous commit/image: commit unavailable in the prior source snapshot; image `sha256:12ea7627d71dc9dd048ac6926b7cbe11d49b23208ceb8d3479e7c42a6cf789e4`
Production touched: **APP IMAGE/SOURCE + THREE FAIL-CLOSED ENV FLAGS ONLY**
DB migrations applied: **NO**
Env changed: `COUNTRY_SIGNUP_MODE`, `LEMON_MODE`, `AI_GUEST_ACCESS_ENABLED` only
Lemon dashboard/IDs/secrets changed: **NO**
DNS/firewall changed: **NO**
Nginx config changed: **NO**; one `nginx -t` and technical reload were performed after the site container changed IP
Secrets exposed: **NO**

## Scope and final status

GO-2 fail-closed deploy is complete. The application and the three approved flags are live. No DBSEC migration, provider mutation, payment canary, production signup/reset/OAuth, DNS/firewall change or Nginx configuration change was performed.

This is a scoped GO-2 pass, not a full production remediation verdict:

```text
CODE_READY: YES
GO-2_LIVE_FIXED: YES
LIVE_FIXED_OVERALL: NO
CURRENT_OVERALL_PRODUCTION_VERDICT: FAIL_P0
```

The overall verdict remains `FAIL_P0` until the separately approved GO-3 DBSEC work and GO-4 Lemon live validation/canary are complete.

## Snapshot and rollback baseline

- GO-2 snapshot: `/root/scholarshiptop-go2-failclosed-snapshot-20260628_152817`
- Previous image rollback tag: `scholarshiptop-site:go2-before-20260628_152817`
- Previous image ID: `sha256:12ea7627d71dc9dd048ac6926b7cbe11d49b23208ceb8d3479e7c42a6cf789e4`
- Previous app snapshot: `/opt/scholarshiptop/backups/app.pre-go2-20260628_152817`
- Previous `Dockerfile.prebuilt`: snapshot present in the GO-2 snapshot directory
- Full pre-change `site.env`: protected root-only snapshot; never printed
- Valid GO-1 dump remains present: `213575801` bytes
- Env mode after change: `0600`

## Pre-flight commands and results

| Command/check | Result |
|---|---|
| `npm run build` | **PASS** in the full local gate; clean packaged build also PASS; exact `8936bf8` VPS build PASS in 383.3s, Build ID `nJS6eQX-pmKaRQKcjNbaa` |
| `npx tsc --noEmit` | **PASS**, including after the GO-2 route correction |
| `npm run lint` | **PASS with existing baseline warnings** |
| `npm run test:webhooks` | **PASS, 33/33** |
| `npx tsx --test lib/security/__tests__/*.test.ts lib/payments/__tests__/*.test.ts` | **PASS, 61/61** |
| `npm --prefix services/content-hub run test:security` | **PASS, 1/1**; combined security/payment total **62/62** |
| `npm run test:seo-lib` | **PASS, 85/85** |
| `npm run test:essays-lib` | **PASS, 6/6** |
| `npm audit --omit=dev` | **NON-ZERO: 5 open findings**, 3 low, 1 moderate, 1 high; full remediation currently proposes a breaking Next 16 upgrade |

The audit result is a disclosed residual risk and is not reported as PASS.

## Packaging corrections before deploy

The first clean VPS build failed before any production switch because a root security test imported content-hub service source while the root install did not contain the service-only `marked` dependency. Production image, env and container remained unchanged.

Commit `d29e503` isolated that service test under the service package and added its own security test command. The clean root build and service build/test then passed.

Before the production switch, the unsigned webhook contract was found to return 500 when Lemon was disabled. Commit `8936bf8` changed the disabled response to 503 and extended its contract test. The exact patched candidate was rebuilt successfully on the VPS.

The first candidate start could not bind `127.0.0.1:3100` because an existing host Next process owned that port. No existing process was stopped. The candidate was started on free loopback port `3102` and passed all checks.

## Env flags

```text
COUNTRY_SIGNUP_MODE=disabled
LEMON_MODE=disabled
AI_GUEST_ACCESS_ENABLED=0
```

- Non-flag env SHA-256 before: `3714e20f765448c2a346351608c2e460aa29096b2b4c252dc3e918cbb546023a`
- Non-flag env SHA-256 after: `3714e20f765448c2a346351608c2e460aa29096b2b4c252dc3e918cbb546023a`
- Exactly three approved flag lines are present in the env file and active container.
- No Lemon IDs, webhook secrets, Supabase keys, DB URLs, SMTP, DNS or firewall values were changed.

## Candidate gate

Candidate image: `sha256:d0730a798ada8dcf25ab6ebd351ef33ff0cc2d0e0eb5ef5927f5bf160e98dce3`

| Check | Result |
|---|---|
| Core pages | `/`, `/signin`, `/signin/signup`, `/scholarships`, `/subscription` all 200 |
| Account guest | 307 expected auth redirect |
| Country signup | 503, disabled marker present, no credential fields |
| Unsigned webhook | 503, disabled |
| AI guest endpoints | 403 for voice, guest and guest-message |
| Response secret scan | PASS |
| Fatal/OpenAI log matches | 0 / 0 |
| Restarts | 0 |

## Deploy

Source/image preparation used an isolated Docker context containing only the prepared app and `Dockerfile.prebuilt`; production env, secrets, logs, backups and dump were not sent to the Docker build context.

Deploy command:

```bash
docker tag scholarshiptop-site:go2-candidate-8936bf8 scholarshiptop-site:staging
docker compose --profile site -f /opt/scholarshiptop/docker-compose.yml \
  up -d --no-deps --no-build --force-recreate site
docker exec scholarshiptop-nginx nginx -t
docker exec scholarshiptop-nginx nginx -s reload
```

- Image before: `sha256:12ea7627d71dc9dd048ac6926b7cbe11d49b23208ceb8d3479e7c42a6cf789e4`
- Image after: `sha256:d0730a798ada8dcf25ab6ebd351ef33ff0cc2d0e0eb5ef5927f5bf160e98dce3`
- Deployed commit marker: `8936bf8`
- Deployed Build ID: `nJS6eQX-pmKaRQKcjNbaa`
- Container status: `running/healthy`
- Container restart count: `0`
- Final observation window: `648` seconds after container start
- Separate loopback candidate container: removed after the final gate; candidate image retained
- Compose checksum unchanged: `7b3c430c5f630f052a12687ddca6c6191f9e2365d125f15b7a2a2cf949a9200c`
- Nginx tree checksum unchanged: `84fdd58c134cfb38d51c2faf4cf6ccd6be86e949b04369c09b4dcb0d85b1b169`

## Production smoke results

| Check | Result |
|---|---|
| Homepage | 200 |
| Signin | 200 |
| Signup page | 200 |
| Account guest | 307 expected auth redirect |
| Scholarships | 200 |
| Subscription | 200 with `LEMON_MODE=disabled` active |
| GoTrue health | 200; container `running/healthy` |
| PostgREST health | 200 using the existing anon credential without printing it; container running |
| Country signup | 503 with `COUNTRY_SIGNUP_DISABLED` |
| Test `.invalid` user count | 0 before, 0 after |
| Password/session/token fields | none returned |
| Unsigned webhook | 503, not 500; no replay |
| AI voice/guest/guest-message | 403/403/403 |
| Response secret scan | PASS |

No checkout creation action was invoked because it can create a provider-side object. Checkout disablement was verified through the active `LEMON_MODE=disabled` flag, the passing runtime/checkout contracts, the healthy subscription page and the absence of checkout/provider calls in logs.

## Database and provider invariants

- `public.schema_migrations`: 54 before and 54 after.
- `auth.schema_migrations`: 76 before and 76 after.
- DB migrations, grants, RLS and DBSEC: **NOT TOUCHED**.
- Lemon dashboard, variants, webhook secret, checkout, canary, refund, replay and reconciliation: **NOT TOUCHED**.
- DNS, Cloudflare and firewall: **NOT TOUCHED**.
- Production user creation/reset/OAuth: **NOT RUN**.

## Logs

- Fatal/panic/uncaught matches: 0
- `EACCES`/permission denied matches: 0
- `sessionPassword` matches: 0
- Checkout matches: 0
- OpenAI matches after disabled AI probes: 0
- Restart count: 0
- Final homepage/Auth health after 648 seconds: 200/200

Two identical Node internal `TransformStream` errors with digest `1615827556` appeared early after container start. They were disclosed and investigated: six sequential core GET requests all returned expected status codes, the error counter remained 2, health stayed green and restart count remained 0. They are classified as a non-reproducing, non-P0 runtime warning, not omitted from the result.

## Commit groups

| Group | Hashes |
|---|---|
| Atomic/restorable backup | `2f653b1`, live permission-boundary correction `338110a` |
| Fail-closed country signup | `3a3acdd` |
| DBSEC preparation, not applied live | `7620e75` |
| Lemon live/test separation | `5abafce` |
| VPS edge/runtime hardening | `be67896` |
| Essays/IQ/sitemap fixes | `2ae6456` |
| IQ payment validation/ledger | `46c494b` |
| Verified purchase analytics | `1a69cf1` |
| Expensive AI guard | `706fccd` |
| Sanitizer/dependency patches | `aefa90a` |
| Legacy public users cleanup | `ff486a5` |
| Lemon debug endpoint removal | `dea5e33` |
| Deterministic lint baseline | `8ea2507` |
| Final local gate/report | `54bc8c2` |
| Lockfile normalization | `a1b689e` |
| GO-1 live evidence | `297f7bc` |
| GO-2 packaging boundary | `d29e503` |
| GO-2 webhook disabled status | `8936bf8` |

## Rollback

Rollback is ready and was not performed. The safe flags must remain disabled during an application rollback.

```bash
docker tag scholarshiptop-site:go2-before-20260628_152817 scholarshiptop-site:staging
docker compose --profile site -f /opt/scholarshiptop/docker-compose.yml \
  up -d --no-deps --no-build --force-recreate site
docker exec scholarshiptop-nginx nginx -t
docker exec scholarshiptop-nginx nginx -s reload
```

The previous app source and Dockerfile snapshots are also retained. Do not restore the old missing/unsafe env behavior without a separate emergency decision.

## Verdict

```text
APP_DEPLOYED: YES
COUNTRY_SIGNUP_MODE=disabled active: YES
LEMON_MODE=disabled active: YES
AI_GUEST_ACCESS_ENABLED=0 active: YES
AUTH_UNSAFE_FLOW_DISABLED_LIVE: YES
CHECKOUT_DISABLED_LIVE: YES
AI_GUEST_DISABLED_LIVE: YES
CORE_SITE_HEALTHY: YES
SUPABASE_AUTH_HEALTHY: YES
POSTGREST_HEALTHY: YES
NO_NEW_P0_LOGS: YES
ROLLBACK_READY: YES
DB_MIGRATIONS_APPLIED: NO
LEMON_CHANGED: NO
DNS_FIREWALL_CHANGED: NO
ROLLBACK_PERFORMED: NO
GO-2_FAIL_CLOSED_DEPLOYED: YES
```

## Next recommended stage

`GO-3 DBSEC migration`, only after separate explicit approval and a fresh confirmation that the validated GO-1 backup is still present/restorable. GO-3 and GO-4 were not started.
