-- SEO-001: the restored VPS has unaccent in public, while the old function hardcoded extensions.
begin;

create extension if not exists unaccent with schema public;

create or replace function public.essay_index_normalize(p_input text)
returns text
language sql
immutable
parallel safe
set search_path = public, pg_catalog
as $$
  select trim(
    regexp_replace(
      lower(public.unaccent(coalesce(p_input, ''))),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

comment on function public.essay_index_normalize(text) is
  'Normalized text for essay hub keyword search; unaccent is schema-qualified for VPS restore compatibility.';

commit;
