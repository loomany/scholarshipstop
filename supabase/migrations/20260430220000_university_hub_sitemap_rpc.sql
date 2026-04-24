-- Sitemap: /scholarships/{stateSlug}/{universitySlug} university hub URLs (matches app resolver + provider_hub_listing).

create or replace function public.university_hub_sitemap_rows()
returns table (state_slug text, university_slug text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    st.slug as state_slug,
    lower(trim(both from h.slug)) as university_slug,
    coalesce(p.updated_at, p.created_at, now()) as updated_at
  from public.provider_hub_listing h
  inner join public.states st
    on upper(nullif(trim(h.state), '')) = upper(st.code)
  inner join public.providers p
    on lower(trim(both from p.slug)) = lower(trim(both from h.slug))
  where
    h.slug is not null
    and trim(both from h.slug) <> ''
    and coalesce(h.scholarship_count, 0) >= 1
    and h.state is not null
    and length(trim(h.state)) = 2;
$$;

comment on function public.university_hub_sitemap_rows() is
  'Public-safe state+university hub paths for XML sitemap: active scholarship count >= 1, USPS state on provider, known states.slug.';

grant execute on function public.university_hub_sitemap_rows() to anon, authenticated;
