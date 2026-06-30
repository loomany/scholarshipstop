# SEO Cleanup After VPS Migration

Date: 2026-06-30 (Asia/Qyzylorda and UTC evidence)
Operator: Codex over `ubuntu` SSH with passwordless `sudo`
Branch: `fix/full-vps-audit-p0-p1`
Production base before this task: `8936bf8`
Final clean deploy commit: `1040c9af9bf9110003b0ce0e3388eb4a0eecc2e9`
Final image: `sha256:0c450fd7f30c695335d5cafc6658076117c4ea33f79fb938a126eaea4431fbe7`
Final Next build ID: `aiWT-mxQVPThh1J7aq-CO`

## Verdict

```text
CODE_READY: YES
SEO_CLEANUP_LIVE_FIXED: YES
ESSAY_UNACCENT_LIVE_FIXED: YES
OVERALL_PRODUCTION_REMEDIATION_COMPLETE: NO
```

This is a scoped live SEO cleanup result. It does not claim that Lemon GO-4 or the
overall production remediation is complete.

## Scope boundaries

Touched: application SEO metadata, root sitemap runtime behavior, the prepared
essay unaccent corrective SQL, one exact Nginx include, the site image, and this
report.

Not touched: Lemon dashboard, variants, checkout, payment canary, webhook replay,
refund, reconciliation, auth configuration, signup/reset/OAuth, DBSEC, any other DB
migration, users, DNS, Cloudflare, firewall, PostgreSQL networking, or unrelated
environment values.

The existing fail-closed values remain active:

```text
COUNTRY_SIGNUP_MODE=disabled
LEMON_MODE=disabled
AI_GUEST_ACCESS_ENABLED=0
```

## Commit groups

| Group | Current-branch commit | Clean deploy commit |
|---|---|---|
| Main SEO cleanup, IQ canonical, redirects, social fallback | `e163d81` | `4384018` |
| Remaining public social metadata routes | `0d32396` | `5e0706d` |
| Runtime root sitemap index | `030ba20` | `1040c9a` |
| Prepared essay/sitemap migration source | `2ae6456` | already present in base ancestry |

The clean deploy line was built from production base `8936bf8` plus only the three
SEO commits. GO-4A payment runtime commits were not included in the production image.

## Backup and rollback proof

- Valid GO-1 dump:
  `/opt/scholarshiptop-db-backups/scholarshiptop_prod-20260628T151756Z.dump`
- Size: `213575801` bytes; mode `0600`; owner `root:root`.
- SHA-256: `98c9e70fb2e51899572577ae433d81ecada24d366edac468db72819899883d3c`.
- `pg_restore -l`: 967 TOC lines, PASS.
- Pre-change snapshot:
  `/root/scholarshiptop-seo-snapshot-20260629T212255Z`.
- Full pre-SEO image tag:
  `scholarshiptop-site:seo-before-20260629T212255Z`.
- Pre-follow-up tag: `scholarshiptop-site:seo-before-followup-20260630T1009Z`.
- Pre-sitemap-runtime tag:
  `scholarshiptop-site:seo-before-sitemap-runtime-20260630T1042Z`.
- Snapshot contains protected site env, Docker inspect data, Nginx include, compose,
  image ID, extension list and previous function definition.

Application rollback remains a retag plus site-only compose recreate and Nginx
test/reload. The essay function fix is backward-compatible and should not be rolled
back to the broken `extensions.unaccent` definition. A DB reversal requires a
separate emergency restore decision using the validated dump.

## Code fixes

- Added 1200x630 Open Graph/Twitter fallback assets and shared metadata constants.
- Added default social images to public scholarship, university, category, provider,
  resource, essay, compare, trust, localized and subscription metadata builders.
- Added canonical/OG/Twitter metadata for all IQ legal pages on apex `/iq/*` routes.
- Replaced obsolete `iq.scholarshiptop.com` guidance in `llms.txt` files.
- Added exact Nginx `/home` and `/home/` one-hop apex redirects preserving query.
- Kept `/login -> /signin` and `/register -> /signin/signup` behavior.
- Changed `/sitemap.xml` to runtime rendering so the service-role count is used;
  build-time safe-view counting had temporarily emitted 10 rather than 13
  scholarship shards.
- Extended the SEO migration contract tests.

## Essay SQL

Applied only:
`supabase/migrations/20260628101000_fix_essay_unaccent_schema.sql`

- SQL SHA-256:
  `debff90dc28f4a2bcccf5d53298d59283b8645b3788a5700908a30e0dfcac006`.
- Transaction completed with `ON_ERROR_STOP=1`.
- Function now calls `public.unaccent`, not `extensions.unaccent`.
- Unicode smoke: `Café Scholarships! -> cafe scholarships`.
- `/essays`, query, sort and pagination variants: 200.
- `public.schema_migrations`: 54 before/after.
- `auth.schema_migrations`: 76 before/after.

## Required command gate

| Command | Result |
|---|---|
| `npm run build` | PASS; final route table shows `/sitemap.xml` dynamic (`ƒ`) |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS with pre-existing warnings |
| `npm run test:webhooks` | PASS, 45/45 |
| `npx tsx --test lib/payments/__tests__/*.test.ts` | PASS, 64/64 |
| `npx tsx --test lib/security/__tests__/*.test.ts` | PASS, 11/11 |
| `npm run test:seo-lib` | PASS, 87/87 |
| `npm run test:essays-lib` | PASS, 6/6 |
| essay migration disposable test | PASS |
| `npm audit --omit=dev` | FAIL/non-zero: 5 findings (3 low, 1 moderate, 1 high) |

The audit findings were not called PASS. Full automated remediation proposes breaking
Next/Supabase upgrades and was outside this SEO production scope.

## Crawl before and after

Baseline: 81 documents, 20,094 unique URLs, 158 sample pages with issues,
151 missing OG images, one `/essays` 500/noindex error, and six missing IQ legal
canonicals.

Final: 81/81 documents fetched, 20,077 unique URLs, zero duplicates, zero invalid
URLs, zero foreign/stale hosts, 200 sampled pages, zero non-200, zero noindex, and
zero missing OG images. The 17 URL delta is explained by the UTC date rollover:
eligible scholarship rows changed from 12,131 for 2026-06-29 to 12,114 for
2026-06-30.

One P2 sample issue remains: raw SSR for client-rendered `/iq` has no H1, although the
rendered client UI supplies it. Sample p95 was 4356 ms versus 1646 ms at baseline;
RSS generation also showed occasional slow responses (up to 26 seconds). These are
disclosed performance follow-ups, not hidden as a clean performance PASS.

## Production smoke

- Core, essays, IQ, metadata routes, robots, AI guidance, social assets and all RSS
  feeds returned 200.
- `/home?utm_source=seo` returns one 301 to
  `https://scholarshiptop.com/?utm_source=seo`.
- Public `http://www...` still takes the Cloudflare-managed www-to-HTTPS hop before
  the apex redirect. Cloudflare/DNS was forbidden and not changed.
- Signin remains `noindex, follow`; guest `/account` remains an expected 307.
- GoTrue direct health: 200, running/healthy, restarts 0.
- PostgREST direct authenticated smoke: 200, running, restarts 0.
- Nginx config test: PASS; deployed include SHA-256:
  `fad8db6109bedd5f7f2a5bb142b78062f1cc46a0bc99af0ce23bd37214aef92a`.
- Root sitemap origin/public: 81 documents, 13 scholarship shards, shard 12 present.

## Observation and incidents

Final observation ran from `2026-06-30T10:40:13Z` through `10:55:46Z`.
Eight checkpoints returned site healthy/restarts 0 and home, essays, GoTrue and
PostgREST all 200. Fatal/permission/OOM matches: 0. Nginx 5xx: 0.

Two known Node `TransformStream` warnings with digest `1615827556` appeared, matching
the previously disclosed GO-2 warning; they produced no Nginx 5xx or restart.

The first full Docker build failed before any switch because its Dockerfile limits
Node heap to 768 MB. A host build with the established 1536 MB setting succeeded.
During that first heavy build, the old live container restart count increased once
and one build-time public fetch saw a transient Cloudflare 504; kernel OOM and fatal
app logs were absent and the old site recovered to 200/healthy. Subsequent builds ran
at lower priority. This incident is disclosed rather than omitted.

## Final state

```text
SEO_CODE_READY=YES
SEO_APP_DEPLOYED=YES
ESSAY_UNACCENT_APPLIED=YES
ROOT_SITEMAP_COMPLETE=YES
CANONICALS_OK=YES
OG_IMAGE_DEFAULT_OK=YES
PRIVATE_ROBOTS_OK=YES
CORE_SITE_HEALTHY=YES
GOTRUE_HEALTHY=YES
POSTGREST_HEALTHY=YES
NO_FINAL_WINDOW_5XX=YES
ROLLBACK_READY=YES
LEMON_CHANGED=NO
AUTH_CHANGED=NO
DBSEC_CHANGED=NO
DNS_FIREWALL_CLOUDFLARE_CHANGED=NO
SEO_CLEANUP_LIVE_FIXED=YES
OVERALL_PRODUCTION_REMEDIATION_COMPLETE=NO
```
