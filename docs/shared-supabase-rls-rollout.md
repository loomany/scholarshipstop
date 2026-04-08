# Shared Supabase RLS Rollout

## Goal
Safely enable and standardize Row Level Security in one shared Supabase database used by three independent services:

- site
- parser
- content hub

Constraints for this rollout:

- no application code changes
- no migrations applied as part of this document
- no "enable RLS everywhere at once"
- production-safe, reversible, table-by-table rollout only

This document is the final architecture/access plan based on the previously completed audits of all three repositories plus schema/runtime evidence confirmed in the current site repository.

## Assumptions And Uncertainties
- `service_role` bypass remains available and is intentionally relied on by parser, content hub, internal/admin routes, webhook handlers, and some provider enrichment flows.
- `content_topics` is confirmed by prior content hub audit, but its exact live schema is not visible in the current site repository. Access model is still clear: `service-only`.
- `scholarship_categories` exists in the site repo schema, but cross-repo runtime usage outside the site is not fully confirmed here. Treat as `uncertainty` for public exposure.
- `provider_scholarship_stats` and `provider_hub_listing` are public views and require manual review before any tightening of underlying table policies, because view behavior can surprise teams if assumptions about base-table visibility are wrong.
- `scholarships` already has a broad public `SELECT` policy in this repo's migrations. Live production state in the shared DB must still be snapshotted before rollout.

## Client Types Used Across Services
- `browser anon`: frontend browser client with anon key, optionally carrying user session JWT.
- `server anon`: backend/server code using anon key plus cookies/JWT from the signed-in user.
- `user JWT`: authenticated Supabase request evaluated under the current user.
- `service role`: backend privileged client using `SUPABASE_SERVICE_ROLE_KEY`, bypassing RLS.

## Unified Table Access Matrix

| Table | Services using it | Operations in use | Client types in use | Target RLS model | Priority |
|---|---|---|---|---|---|
| `profiles` | site | `select`, `insert`, `update`, `upsert` | browser anon + user JWT, server anon + JWT, service role | authenticated owner-only + service-only override writes | Wave 3 |
| `subscriptions` | site | `select`, `upsert` | server anon + JWT, service role | owner-only read + backend/service-only write | Wave 3 |
| `scholarships` | site, parser, content hub | `select`, `insert`, `update`, `upsert` | server anon/public, authenticated user, service role | mixed model: public/auth read + service-only write | Wave 3 |
| `categories` | site | `select` | server anon/public | public read + backend/service-only write | Wave 1 |
| `scholarship_categories` | site (confirmed), parser/content hub uncertain | `select` likely future-facing, write via backfill/backend | server anon/public uncertain, service role/backend uncertain | backend/service-only initially; public read only after explicit review | Wave 2 |
| `content_posts` | site, content hub | `select`, `update`, `insert`/`upsert` in hub pipeline | server anon/public, service role | mixed model: public read only for published rows + service-only write | Wave 2 |
| `content_topics` | content hub | `select`, `insert`, `update` | service role | backend/service-only | Wave 1 |
| `providers` | site, content hub/internal enrich flows | `select`, `insert`, `update` | server anon/public, service role | public read + backend/service-only write | Wave 1 |
| `products` | site billing/pricing | `select`, `upsert`, `delete` | server anon/public, service role | public read + backend/service-only write/delete | Wave 1 |
| `prices` | site billing/pricing | `select`, `upsert`, `delete` | server anon/public, service role | public read + backend/service-only write/delete | Wave 1 |
| `customers` | site billing backend | `select`, `upsert`, `update` | service role | backend/service-only | Wave 1 |
| `users` | site billing/account helpers | `select`, `update` | user JWT, service role | keep existing owner-only model | Manual review only |
| `provider_scholarship_stats` view | site | `select` | server anon/public | review view security separately | Manual review |
| `provider_hub_listing` view | site | `select` | server anon/public | review view security separately | Manual review |

## Final Table Classification By Rollout Wave

### Wave 1: can enable or standardize first with minimal risk
- `customers`
- `products`
- `prices`
- `content_topics`
- `categories`
- `providers`

Why Wave 1:
- either already private and service-only
- or simple public read tables with no user ownership logic
- low coupling to auth edge-cases
- failures are usually obvious and easy to detect with focused smoke tests

### Wave 2: after Wave 1 is stable
- `content_posts`
- `scholarship_categories` only after explicit review

Why Wave 2:
- `content_posts` needs row predicate logic, not just table-level public access
- `scholarship_categories` may become a hidden dependency if browse/category UX later reads it directly

### Wave 3: high-risk, only after exact test plan and manual review
- `profiles`
- `subscriptions`
- `scholarships`
- public views `provider_scholarship_stats`
- public view `provider_hub_listing`

Why Wave 3:
- user ownership semantics
- critical site account/billing paths
- parser/content hub dependence on service-role bypass
- `scholarships` is central shared data used by all three services

## Per-Table Recommended Policies

### `profiles`
Services:
- site browser account/onboarding
- site server account/session reads
- site webhook/callback/admin updates through service role

Observed operations:
- browser/user JWT: `select`, `upsert`, `update`
- server/JWT: `select`, some account updates
- service role: `update`, `upsert`

Target model:
- authenticated owner-only
- exactly one user should only see and mutate own row
- service-role continues to bypass for webhook/internal/admin flows

Why this is sensitive:
- browser upsert already exists in account/onboarding flows
- auth callback and verify-email routes update `email_verified`
- billing webhook sync updates `is_subscribed` and `subscription_plan`

Recommended policy rules:
- `SELECT`: user can read own row only
- `INSERT`: user can create row only where `id = auth.uid()`
- `UPDATE`: user can update own row only where `id = auth.uid()`
- no anon access
- no public read
- no user `DELETE` policy unless there is an explicit product requirement

SQL draft:

```sql
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

Potential risks:
- enabling RLS without `SELECT` policy breaks account/profile pages even if `INSERT`/`UPDATE` policy exists
- owner policy on `UPDATE` without matching `INSERT` breaks onboarding upsert
- too-broad owner update can let users overwrite service-maintained fields; this is acceptable only because code-level field selection already limits updates, but it remains a business risk

What to test after enablement:
- signed-in user can load own account/profile
- signed-in user can save onboarding/profile changes
- user A cannot read/update user B profile
- email verification callback still marks `email_verified`
- webhook/admin updates still update `is_subscribed` and `subscription_plan`

### `subscriptions`
Services:
- site account/billing UI
- site webhook/billing backend

Observed operations:
- server/JWT: `select`
- service role: `upsert`

Target model:
- authenticated owner-only read
- backend/service-only write

Important nuance:
- current site code reads latest subscription without explicitly filtering by `user_id`, so RLS must provide the user scoping

Recommended policy rules:
- `SELECT`: user can read rows where `user_id = auth.uid()`
- no user `INSERT`, `UPDATE`, or `DELETE`
- service role remains bypass path for all writes

SQL draft:

```sql
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);
```

Potential risks:
- if owner `SELECT` is missing, account/subscription UI breaks
- if a broad public `SELECT` appears by mistake, billing data becomes exposed
- if service role is not used consistently by webhook sync, writes will start failing immediately

What to test after enablement:
- signed-in user sees own current subscription only
- signed-out user cannot read subscriptions
- webhook creates/updates subscriptions successfully
- account page still resolves pricing/product join via subscription row

### `scholarships`
Services:
- site
- parser
- content hub

Observed operations:
- site: `select`
- parser: `select`, `insert`, `update`, dedupe/backfill/upsert behavior via service role
- content hub: `select`

Target model:
- mixed model
- public/auth read for site
- service-role/backend-only write for parser and backend jobs

Required business rule:
- do not make parser depend on anon write
- do not remove public/site readability

Recommended visibility predicate:
- prefer `public read only for active/indexable rows`
- if direct detail pages must continue to open specific inactive rows during transition, keep current broad read temporarily and tighten later only after confirming business intent

Recommended policy rule, conservative target:
- `SELECT` for `anon, authenticated` only when row is safe for public catalog usage
- no user write policies
- parser/content hub/backend continue through service role

Recommended target predicate:
- `is_active = true`
- and if SEO/public catalog should hide non-indexable rows: `coalesce(is_indexable, true) = true`
- optionally exclude bad statuses if that is a firm business rule, but do not encode guessed status lists into RLS unless product owners confirm them

SQL draft, safer public-catalog version:

```sql
alter table public.scholarships enable row level security;

drop policy if exists "scholarships_select_public" on public.scholarships;
create policy "scholarships_select_public"
  on public.scholarships
  for select
  to anon, authenticated
  using (
    coalesce(is_active, false) = true
    and coalesce(is_indexable, true) = true
  );
```

Transitional SQL draft, lowest-risk compatibility version:

```sql
alter table public.scholarships enable row level security;

drop policy if exists "scholarships_select_public" on public.scholarships;
create policy "scholarships_select_public"
  on public.scholarships
  for select
  to anon, authenticated
  using (true);
```

Decision note:
- if the current production site depends on seeing inactive/non-indexable detail rows, start with transitional compatibility version, then tighten in a second step after measuring impact

Potential risks:
- adding public `SELECT` predicate too strict can blank search/listings/detail pages
- removing public `SELECT` entirely will break the site immediately
- adding any non-service write path is dangerous because parser dedupe/backfill should remain privileged

What to test after enablement:
- scholarship search/list API works anonymously
- scholarship detail pages load anonymously and while signed in
- parser insert/update/backfill jobs still succeed with service role
- content hub scholarship reads still work via service role
- provider pages that query scholarships still return rows

### `categories`
Services:
- site

Observed operations:
- `select`

Target model:
- public read for active taxonomy
- backend/service-only write

Recommended policy rules:
- `SELECT` for `anon, authenticated` on active rows
- no user write policies

SQL draft:

```sql
alter table public.categories enable row level security;

drop policy if exists "categories_select_public_active" on public.categories;
create policy "categories_select_public_active"
  on public.categories
  for select
  to anon, authenticated
  using (coalesce(is_active, false) = true);
```

Potential risks:
- enabling RLS without public `SELECT` breaks browse/category APIs
- if inactive taxonomy must remain visible in internal CMS/admin tools, those flows must use service role

What to test after enablement:
- categories API returns active L2 categories
- category browse pages continue resolving slugs
- no anon write possible

### `scholarship_categories`
Services:
- site confirmed in schema
- parser/content hub usage not fully confirmed here

Observed operations:
- currently backend/backfill-oriented
- public read dependency is not fully established

Target model:
- start as backend/service-only
- add public read later only if there is a confirmed runtime need

Recommended initial policy rules:
- enable RLS with no anon/auth policies
- writes remain service-role/backend only by bypass

SQL draft, initial safe posture:

```sql
alter table public.scholarship_categories enable row level security;
```

Optional future public-read draft, only after review:

```sql
drop policy if exists "scholarship_categories_select_public" on public.scholarship_categories;
create policy "scholarship_categories_select_public"
  on public.scholarship_categories
  for select
  to anon, authenticated
  using (true);
```

Potential risks:
- if any site path starts reading this table directly, enabling RLS with no `SELECT` policy will break it
- if later opened publicly, join-table exposure may reveal category relationships for hidden scholarships unless the model is coordinated with scholarship visibility

What to test after enablement:
- all category pages and SEO pages still work
- any backfill/admin linking process still works via service role
- if public `SELECT` is introduced later, verify no hidden scholarship relationships leak

### `content_posts`
Services:
- site
- content hub

Observed operations:
- site: `select`
- content hub/internal pipeline: `select`, `update`, likely `insert`/`upsert`

Target model:
- public read only for published rows
- service-role write only

Required business rule:
- public read only for published rows

Recommended policy rules:
- `SELECT` for `anon, authenticated` when `status = 'published'`
- optionally require non-null/non-empty slug for listing-specific paths, but do not encode slug requirement into table-level RLS unless every public read depends on it
- no user write policies

SQL draft:

```sql
alter table public.content_posts enable row level security;

drop policy if exists "content_posts_select_published" on public.content_posts;
create policy "content_posts_select_published"
  on public.content_posts
  for select
  to anon, authenticated
  using (status = 'published');
```

Potential risks:
- enabling RLS without public `SELECT` policy breaks `/resources`
- over-constraining predicate can hide valid published content
- content hub write/update flows must keep using service role

What to test after enablement:
- resources listing loads anonymously
- article detail by slug loads only for published posts
- unpublished rows are not exposed anonymously
- internal article matching route still loads and updates rows through service role

### `content_topics`
Services:
- content hub

Observed operations:
- `select`, `insert`, `update` via service role

Target model:
- service-only

Recommended policy rules:
- enable RLS
- no anon/auth policies

SQL draft:

```sql
alter table public.content_topics enable row level security;
```

Potential risks:
- low, as long as all real callers use service role
- exact live schema remains an uncertainty and should be manually verified before applying

What to test after enablement:
- content hub reads/writes still work
- no anon/auth access exists

### `providers`
Services:
- site
- backend enrichment/internal flows

Observed operations:
- public/server reads
- service-role `insert`, `update`, fallback bootstrap/enrichment

Target model:
- public read
- service-role write only

Recommended policy rules:
- `SELECT` for `anon, authenticated`
- no user writes

SQL draft:

```sql
alter table public.providers enable row level security;

drop policy if exists "providers_select_public" on public.providers;
create policy "providers_select_public"
  on public.providers
  for select
  to anon, authenticated
  using (true);
```

Potential risks:
- if public `SELECT` is missing, provider profile and hub-related reads break
- provider bootstrap/enrichment must continue via service role

What to test after enablement:
- provider profile pages load
- provider hub counts/pages still work
- enrich/insert/update paths still work via service role

### `products`
Services:
- site billing/pricing backend/UI

Observed operations:
- public/server `select`
- service-role `upsert`, `delete`

Target model:
- public read
- service-only write/delete

Recommended policy rules:
- `SELECT` for `anon, authenticated`
- no user writes

SQL draft:

```sql
alter table public.products enable row level security;

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products
  for select
  to anon, authenticated
  using (true);
```

Potential risks:
- low
- missing public `SELECT` can break pricing queries

What to test after enablement:
- pricing UI/server queries still load active products
- sync/delete jobs still work via service role

### `prices`
Services:
- site billing/pricing backend/UI

Observed operations:
- public/server `select`
- service-role `upsert`, `delete`

Target model:
- public read
- service-only write/delete

Recommended policy rules:
- `SELECT` for `anon, authenticated`
- no user writes

SQL draft:

```sql
alter table public.prices enable row level security;

drop policy if exists "prices_select_public" on public.prices;
create policy "prices_select_public"
  on public.prices
  for select
  to anon, authenticated
  using (true);
```

Potential risks:
- low
- missing public `SELECT` can break subscription joins and pricing display

What to test after enablement:
- pricing/subscription joins still resolve prices
- billing sync/delete jobs still work via service role

### `customers`
Services:
- site billing backend

Observed operations:
- service-role `select`, `upsert`, `update`

Target model:
- backend/service-only

Recommended policy rules:
- enable RLS
- no anon/auth policies

SQL draft:

```sql
alter table public.customers enable row level security;
```

Potential risks:
- low, provided all access is truly service role
- dangerous only if any non-service billing helper secretly relies on direct table access

What to test after enablement:
- checkout/customer creation flow still works
- customer lookup/update mapping still works
- signed-in users cannot read customer records directly

### `users`
Services:
- site account/billing internals

Observed operations:
- owner `select`, owner `update`, service-role updates in billing helpers

Target model:
- keep existing owner-only model

Recommended policy rules:
- no change in first rollout unless live state differs from expected baseline

Potential risks:
- not part of requested rollout, but changes here can affect billing metadata sync

What to test if touched:
- own user row visible to signed-in user only
- billing helper updates still work

## Snapshot SQL Before Any Change
Run before every wave and save output externally.

### 1. Current RLS state

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in (
    'profiles',
    'subscriptions',
    'scholarships',
    'categories',
    'scholarship_categories',
    'content_posts',
    'content_topics',
    'providers',
    'products',
    'prices',
    'customers',
    'users'
  )
order by c.relname;
```

### 2. Current policies

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'subscriptions',
    'scholarships',
    'categories',
    'scholarship_categories',
    'content_posts',
    'content_topics',
    'providers',
    'products',
    'prices',
    'customers',
    'users'
  )
order by tablename, policyname;
```

### 3. Current grants

```sql
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles',
    'subscriptions',
    'scholarships',
    'categories',
    'scholarship_categories',
    'content_posts',
    'content_topics',
    'providers',
    'products',
    'prices',
    'customers',
    'users',
    'provider_scholarship_stats',
    'provider_hub_listing'
  )
order by table_name, grantee, privilege_type;
```

### 4. Validate public views

```sql
select table_schema, table_name, view_definition
from information_schema.views
where table_schema = 'public'
  and table_name in ('provider_scholarship_stats', 'provider_hub_listing');
```

## Final Safe Rollout Plan

### Phase 0: pre-rollout preparation
1. Snapshot current RLS state, policies, grants, and view definitions.
2. Record baseline smoke-test results for site, parser, and content hub before any DB change.
3. Confirm which Railway service uses which env keys:
   - site browser/server anon
   - site service role
   - parser service role
   - content hub service role
4. Confirm no service is accidentally using anon key for writes expected to bypass RLS.
5. Confirm on-call rollback owner and release window.

### Phase 1: Wave 1 rollout order
Recommended order:
1. `customers`
2. `products`
3. `prices`
4. `content_topics`
5. `categories`
6. `providers`

Between each table:
1. apply only that table's RLS/policies
2. run targeted smoke tests for that table
3. wait and observe logs/errors
4. proceed only if green

Why this order:
- private tables first
- then simple public read tables
- then provider flows which are public-read but still touched by service-role enrichment

### Phase 2: Wave 2 rollout order
Recommended order:
1. `content_posts`
2. `scholarship_categories` only if explicit review confirms it is safe

Between each table:
1. apply table policy
2. verify public reads
3. verify internal/service updates
4. review logs for 15 to 30 minutes before next step

### Phase 3: Wave 3 rollout order
Recommended order:
1. `profiles`
2. `subscriptions`
3. `scholarships`
4. public views manual review and validation

Why this order:
- `profiles` first because owner semantics must be proven before billing/account dependencies
- `subscriptions` next because account billing reads depend on user-scoped data
- `scholarships` last because it is shared across all three services and the highest blast-radius table

## Smoke Test Checklist

### Baseline before rollout
- anonymous home/search/resources pages load
- anonymous scholarship listing works
- anonymous scholarship detail works
- signed-in account page works
- signed-in profile save works
- subscription/account status renders
- billing webhook test event updates DB correctly
- parser test run can read existing rows and write update/insert
- content hub can read scholarships and write article/content rows

### Wave 1 smoke tests

For `customers`:
- customer lookup/create flow succeeds
- no anon/auth direct read works

For `products` and `prices`:
- pricing UI/server query succeeds
- subscription joins still resolve prices/products
- billing sync can upsert/delete through service role

For `content_topics`:
- content hub topic read/update/write path succeeds

For `categories`:
- categories API returns active rows
- category browse pages still resolve labels/slugs

For `providers`:
- provider hub listing works
- provider detail page works
- provider enrichment/update still succeeds

### Wave 2 smoke tests

For `content_posts`:
- `/resources` index works anonymously
- published article page works anonymously
- unpublished article is not exposed anonymously
- internal article matching/update route still writes

For `scholarship_categories`:
- all category/SEO pages still work
- no backfill/admin relation write fails
- if public read is opened later, confirm hidden scholarship relations are not leaked

### Wave 3 smoke tests

For `profiles`:
- sign in and load account
- onboarding/profile form upsert succeeds
- user A cannot read/update user B row
- verify-email route still flips `email_verified`
- webhook/internal plan updates still update profile

For `subscriptions`:
- signed-in user sees only own subscription
- signed-out user cannot access any subscription data
- webhook upsert still works

For `scholarships`:
- anonymous scholarship list API works
- anonymous scholarship detail works
- signed-in scholarship flows work
- parser dedupe/known-index/backfill writes work
- content hub scholarship reads still work
- provider pages still show scholarship lists

## Rollback Checklist

Principle:
- rollback must be table-by-table, reverse order within the current wave
- do not start rollback by touching unrelated tables

### Immediate rollback triggers
- spike in 401/403/406/500 from Supabase-backed pages
- account page cannot load
- onboarding/profile save fails
- webhook write failures
- parser insert/update failures
- content hub publish/update failures
- scholarship listings/details blank out

### Per-table rollback steps
1. Identify last changed table.
2. Disable only the new policy set for that table.
3. Restore prior policy definition from the Phase 0 snapshot.
4. Re-run the table-specific smoke test.
5. Re-check logs.
6. Stop rollout until root cause is identified.

### Generic rollback SQL patterns

Disable a new policy:

```sql
drop policy if exists "policy_name_here" on public.table_name_here;
```

Restore known previous public read, example:

```sql
create policy "scholarships_select_public"
  on public.scholarships
  for select
  to anon, authenticated
  using (true);
```

Emergency compatibility fallback, only if needed and only for the impacted table:

```sql
alter table public.table_name_here disable row level security;
```

Use this only as a last resort because it reverts the table to pre-RLS behavior and should be followed by a fresh, smaller retry later.

## Tables That Must Not Be Enabled Blindly
- `profiles`
- `subscriptions`
- `scholarships`
- `scholarship_categories`
- `content_posts`
- `provider_scholarship_stats` view
- `provider_hub_listing` view

## Where Enabling RLS Without Owner Policy Is Dangerous
- `profiles`
- `subscriptions`
- `users`

Why:
- these tables represent per-user data
- missing owner policy either leaks data or blocks legitimate reads/writes

## Where Enabling RLS Without Public SELECT Policy Is Dangerous
- `scholarships`
- `categories`
- `content_posts`
- `providers`
- `products`
- `prices`
- `provider_scholarship_stats` view
- `provider_hub_listing` view

Why:
- the site has anonymous or server-anon read paths for these objects

## Where Services Depend On Service Role Bypass
- parser on `scholarships` writes and dedupe/backfill logic
- content hub on `content_topics` writes
- content hub on `content_posts` writes
- internal article matching route on `content_posts` updates
- site webhook handlers on `subscriptions` upserts
- site webhook/callback/admin paths on `profiles` updates
- provider bootstrap/enrichment on `providers` insert/update
- billing/customer mapping on `customers`
- product/price sync on `products` and `prices`

## Recommended Manual Review List Before Applying Anything
- `profiles`: confirm all browser upsert fields are intentionally user-editable
- `subscriptions`: confirm no non-service write path exists
- `scholarships`: decide final public predicate, especially whether `is_indexable` must be enforced in RLS
- `scholarship_categories`: confirm whether any public runtime reads it directly
- `content_topics`: verify exact live schema exists and all callers use service role
- `content_posts`: confirm only `published` should ever be public
- `provider_scholarship_stats` view: verify it does not bypass intended underlying visibility
- `provider_hub_listing` view: verify it does not expose rows inconsistent with provider/scholarship visibility

## Recommended Final Decisions
- `profiles`: owner-only model is mandatory and must include `SELECT`, `INSERT`, and `UPDATE`.
- `subscriptions`: owner-only read and backend-only write is mandatory.
- `scholarships`: mixed model is mandatory: public/auth read for site plus service-role write for parser/backend.
- `content_topics`: service-only must be fixed and not opened publicly.
- `content_posts`: public read only for published rows; all writes remain service-only.
- use `public read only for published/active/indexable rows` where row visibility clearly has a content-state meaning:
  - `content_posts`: published only
  - `categories`: active only
  - `scholarships`: active and, after manual confirmation, indexable only

## Minimal Execution Sequence
1. Snapshot live state.
2. Baseline smoke tests.
3. Wave 1, one table at a time.
4. Wave 2, one table at a time.
5. Manual review checkpoint.
6. Wave 3, one table at a time.
7. Post-rollout smoke tests across all three services.
8. Keep rollback SQL and baseline snapshots until rollout is fully stable.
