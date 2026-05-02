-- Keep Easy Apply hub queries index-friendly after public listing moved to
-- scholarships_safe_listing. The app now relies on easy_apply_flags for
-- no-essay matching instead of broad ILIKE scans over description text.

create index if not exists scholarships_active_easy_apply_flags_gin
  on public.scholarships using gin (easy_apply_flags jsonb_path_ops)
  where is_active = true
    and easy_apply_flags is not null;

-- One-time normalization: rows that clearly say "no essay" should carry the
-- indexed no_essay flag so the Easy Apply tab does not need text scans.
update public.scholarships
set easy_apply_flags = (
  select coalesce(jsonb_agg(distinct value), '[]'::jsonb)
  from jsonb_array_elements_text(
    coalesce(public.scholarships.easy_apply_flags, '[]'::jsonb) || '["no_essay"]'::jsonb
  ) as flags(value)
)
where is_active = true
  and not (coalesce(easy_apply_flags, '[]'::jsonb) @> '["no_essay"]'::jsonb)
  and (
    title ~* '(no[-[:space:]]+essay|without[[:space:]]+an[[:space:]]+essay|essay[[:space:]]+not[[:space:]]+required)'
    or requirements_text_clean ~* '(no[-[:space:]]+essay|without[[:space:]]+an[[:space:]]+essay|essay[[:space:]]+not[[:space:]]+required)'
  );

analyze public.scholarships;
notify pgrst, 'reload schema';
