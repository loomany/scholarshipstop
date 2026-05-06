# Unstable Cache Second-Pass Audit

Generated: 2026-05-06  
Mode: read-only audit

## 1) Deploy SHA verification (local vs Railway)

- Local HEAD:
  - `211a6c66cb2491d2c6b3f9269f912661f2e8fbfa`
- Railway production (`Сайт`) latest deployment:
  - deployment id: `94ac41e4-9164-4434-baa2-e4ebcfe6fc4d`
  - createdAt: `2026-05-06T12:17:59.580Z`
  - commitHash (from `railway status --json`): `211a6c66cb2491d2c6b3f9269f912661f2e8fbfa`

Result:
- Deployment **is updated** and includes the fix commit.

## 2) Full `unstable_cache` inventory (app/lib/utils focus)

Search results:
- `app/**`: no `unstable_cache` matches in current app runtime path.
- `utils/**`: no `unstable_cache` matches.
- `lib/**`: `unstable_cache` exists in:
  - `lib/seo/stateCompareServer.ts`
  - `lib/seo/universityCompareServer.ts`
  - `lib/scholarships/homePageStatsCached.ts`
  - `lib/essays/relatedScholarshipsForEssayGuide.ts`
  - `lib/content-hub/relatedScholarshipsForResourceArticle.ts`
  - `lib/essays/essaysServer.ts`
  - `lib/content-hub/contentPostsServer.ts`
  - `lib/providers/providerHubServer.ts`
  - `lib/providers/providerProfileServer.ts`

## 3) Call graph sanity for each `unstable_cache` path

For all listed `lib/**` cache wrappers, spot-check shows data access through `createPublicClient()`; no evidence of:
- `createClient()`
- `cookies()`
- `headers()`
- `auth.getUser()` request-scoped cookie client inside cache closures

`/api/scholarships` specific path:
- `app/api/scholarships/route.ts` no longer has `unstable_cache(...)` in profile loader.
- profile read is request-scoped (`selectProfile(requestSupabase)`), outside cache closure.

## 4) Fresh-log check only after deploy time

Used post-deploy window (`--since 2026-05-06T12:18:00Z`) on service `Сайт` with filters:
- `unstable_cache`
- `cookies inside`
- `dynamic data sources inside a cache scope`
- `headers inside`
- `createClient inside unstable_cache`

Result:
- **No matches** for all above filters in post-deploy window.

## 5) Why previous report still showed warning

Previous incident output was influenced by accumulated historical sources:
- `logs/live/Сайт/2026-05-06.log` contains pre-fix warning lines around `12:09Z` (before deploy at `12:17:59Z`).
- Analyzer currently reads full file history and does not enforce deploy-time slicing by default.

## 6) Analyzer windowing recommendation (tooling-level)

Recommended improvement (not applied in this read-only audit):
- Add optional analysis window:
  - `--since <timestamp>` (or deploy timestamp)
  - classify incidents only within window
- Keep separate sections:
  - historical incidents
  - current-window incidents

This prevents old warnings from being reported as current regressions immediately after deploy.

## Final verdict

**OLD LOGS ONLY**

Rationale:
- Railway production is on fixed commit SHA.
- No cache-scope warning matches in fresh post-deploy logs.
- Remaining confirmed warning entries come from pre-deploy historical log lines.
