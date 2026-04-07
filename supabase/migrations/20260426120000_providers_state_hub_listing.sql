-- US state for provider HQ / primary operations + denormalized hub listing view.

alter table public.providers
  add column if not exists state text;

comment on column public.providers.state is
  'USPS state code (e.g. CA) when headquartered or primarily operating in that US state; null if unknown, national scope, or non-US.';

create index if not exists providers_state_idx
  on public.providers (state)
  where state is not null and length(trim(state)) = 2;

-- Hub list: scholarship counts from stats + profile fields from providers (left join).
create or replace view public.provider_hub_listing as
select
  s.slug,
  coalesce(
    nullif(trim(p.display_name), ''),
    nullif(trim(s.display_name), ''),
    s.slug
  ) as display_name,
  s.scholarship_count,
  case
    when p.state is not null and length(trim(p.state)) = 2 then upper(trim(p.state))
    else null
  end as state,
  p.ai_description
from public.provider_scholarship_stats s
left join public.providers p on p.slug = s.slug;

comment on view public.provider_hub_listing is
  'Providers hub: active scholarship counts plus optional providers.state and ai_description for cards.';

grant select on public.provider_hub_listing to anon, authenticated;
