-- public.profiles is canonical; public.users no longer exists on the VPS database.
begin;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

commit;
