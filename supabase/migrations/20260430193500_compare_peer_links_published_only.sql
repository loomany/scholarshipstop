-- Only suggest peer universities when a published compare page exists for the pair.

create or replace function public.get_compare_peer_institutions(
  p_institution_id uuid,
  p_limit int default 3
)
returns table (
  peer_id uuid,
  peer_slug text,
  peer_name text,
  compare_slug text,
  peer_grant_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select s.institution_id as iid, count(*)::bigint as c
    from public.scholarships s
    where coalesce(s.is_active, true)
      and s.institution_id is not null
    group by s.institution_id
  ),
  anchor as (
    select anc.id, anc.slug, anc.state
    from public.institutions anc
    where anc.id = p_institution_id
  )
  select
    peer.id as peer_id,
    peer.slug as peer_slug,
    peer.name as peer_name,
    case
      when peer.slug < anchor.slug then peer.slug || '-vs-' || anchor.slug
      else anchor.slug || '-vs-' || peer.slug
    end as compare_slug,
    coalesce(c.c, 0::bigint) as peer_grant_count
  from public.institutions peer
  cross join anchor
  left join counts c on c.iid = peer.id
  where peer.id <> p_institution_id
    and coalesce(c.c, 0) >= 1
    and exists (
      select 1
      from public.compare_pages cp
      where cp.status = 'published'
        and cp.slug = (
          case
            when peer.slug < anchor.slug then peer.slug || '-vs-' || anchor.slug
            else anchor.slug || '-vs-' || peer.slug
          end
        )
    )
  order by
    case
      when anchor.state is not null
        and peer.state is not null
        and peer.state = anchor.state
      then 0
      else 1
    end,
    coalesce(c.c, 0) desc,
    peer.slug asc
  limit coalesce(nullif(p_limit, 0), 3);
$$;
