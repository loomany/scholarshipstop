# Subscription Access Verification (Cursor / CI)

This checklist verifies DB schema, manual updates, app access logic, and webhook signature behavior.

## 1) Verify `is_subscribed` column exists

Run in Supabase SQL Editor:

```sql
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'is_subscribed';
```

Expected:

- one row exists
- `data_type = boolean`

## 2) Verify manual update works (including unsubscribe flow)

`profiles` uses `id` as user identifier:

```sql
UPDATE public.profiles
SET is_subscribed = true
WHERE id = 'USER_ID';
```

Then check value:

```sql
SELECT is_subscribed
FROM public.profiles
WHERE id = 'USER_ID';
```

Expected:

- `is_subscribed = true`

Now verify subscription completion (unsubscribe):

```sql
UPDATE public.profiles
SET is_subscribed = false
WHERE id = 'USER_ID';
```

Then:

```sql
SELECT is_subscribed
FROM public.profiles
WHERE id = 'USER_ID';
```

Expected:

- `is_subscribed = false`

## 3) Verify app access logic

Server-side access check must read:

```ts
const { data } = await supabase
  .from('profiles')
  .select('is_subscribed')
  .eq('id', userId)
  .maybeSingle();

const hasFullAccess = Boolean(data?.is_subscribed);
```

Expected:

- `true` -> full access
- `false` -> limited access

## 4) Verify webhook signature validation

Run automated tests:

```bash
npm run test:webhooks
```

Covered cases:

- valid signature passes
- valid `sha256=` prefixed signature passes
- invalid signature fails
- malformed signature fails

## 5) Verify webhook-driven subscription updates

Using Lemon Squeezy events:

- `subscription.created` -> `is_subscribed = true`
- `subscription.updated` -> `true` only for `active|trialing`
- `subscription.deleted` -> `is_subscribed = false`

For `subscription.deleted`, access must be limited right after webhook processing.

## 6) Verify locked premium tabs + modal

For authenticated users with `is_subscribed = false`:

- Premium tabs stay visible with lock icon:
  - `Best recommendation`
  - `Recommendation`
  - `Easy apply`
- Clicking any locked tab opens a modal with 3-day free access offer.

Expected modal content:

- Title: `Get 3 Days of Free Access!`
- CTA: `Get Free Access` -> `/subscription`
- Secondary action: `Maybe Later` closes the modal

## 7) Verify Easy Apply filter lock for unsubscribed users

For authenticated users with `is_subscribed = false`:

- In `More Filters` panel, `Easy apply` options show lock state.
- Clicking/toggling an `Easy apply` checkbox opens the 3-day free access modal.
- Filter is not applied while locked.

For users with active subscription:

- `Easy apply` options work normally and apply to query.

## 8) Verify premium grant categories lock (No Essay / Easy Apply / Quick Apply / Few Requirements)

For authenticated users with `is_subscribed = false`:

- Opening any premium category URL (for example `/scholarships/category/no-essay`) opens the 3-day free access modal.
- Category page shows locked state and does not render premium list content.
- Direct URL access to premium listing context (`tab=easy-apply` and related premium long-tail route) is normalized back to regular catalog view and opens the modal.

For users with active subscription:

- Premium category pages load normally.
- Premium tabs and easy-apply contexts remain navigable without lock modal.
