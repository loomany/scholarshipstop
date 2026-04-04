-- Full main-column HTML snapshot (fallback so no text is lost if section splits miss content).

alter table public.scholarships
  add column if not exists full_content_html text;

comment on column public.scholarships.full_content_html is 'Full .scholarship-content inner HTML (script/style/svg stripped); fallback archive of page body';
