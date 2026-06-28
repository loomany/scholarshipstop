\set ON_ERROR_STOP on

begin transaction read only;

select 'auth_users' as invariant, count(*)::bigint as value
from auth.users
union all
select 'profiles', count(*)::bigint
from public.profiles
union all
select 'auth_users_missing_profile', count(*)::bigint
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
union all
select 'profiles_missing_auth_user', count(*)::bigint
from public.profiles p
where not exists (select 1 from auth.users u where u.id = p.id)
union all
select 'iq_pending_older_than_24h', count(*)::bigint
from public.iq_report_orders
where status = 'pending' and created_at < now() - interval '24 hours';

-- Stable pseudonymous IDs support manual review without printing email or raw UUIDs.
select
  'auth_user_missing_profile' as candidate_type,
  left(md5(u.id::text), 16) as id_hash
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
order by id_hash;

with canonical as (
  select
    p.id,
    p.is_subscribed as cached_access,
    exists (
      select 1
      from public.subscriptions s
      where s.user_id = p.id
        and (
          lower(coalesce(s.status::text, '')) in ('active', 'trialing', 'on_trial')
          or (
            lower(coalesce(s.status::text, '')) = 'cancelled'
            and s.current_period_end > now()
          )
        )
    ) as canonical_access
  from public.profiles p
)
select
  'profile_entitlement_mismatch' as candidate_type,
  left(md5(id::text), 16) as id_hash,
  cached_access,
  canonical_access
from canonical
where cached_access is distinct from canonical_access
order by id_hash;

select
  'stale_iq_pending' as candidate_type,
  left(md5(id::text), 16) as id_hash,
  floor(extract(epoch from (now() - created_at)) / 3600)::bigint as age_hours
from public.iq_report_orders
where status = 'pending' and created_at < now() - interval '24 hours'
order by age_hours desc, id_hash;

commit;
