-- PostgREST PGRST203: two overloads of upsert_visitor_attribution (p_visitor_id text vs uuid)
-- prevented RPC resolution. App passes a UUID string; keep the uuid signature only.
drop function if exists public.upsert_visitor_attribution(text, uuid, text, text, text, text, text, text, text, text);
