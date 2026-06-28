-- Use only if unaccent exists in extensions; otherwise restore from the validated DB backup.
begin;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'unaccent' AND n.nspname = 'extensions'
  ) THEN
    RAISE EXCEPTION 'Cannot restore extensions.unaccent definition: extension is not in extensions';
  END IF;
END
$$;

create or replace function public.essay_index_normalize(p_input text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select trim(
    regexp_replace(
      lower(extensions.unaccent(coalesce(p_input, ''))),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

commit;
