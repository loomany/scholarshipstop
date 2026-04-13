-- Public bucket for Essay Hub hero images (WebP served from Supabase CDN; smaller than raw FAL PNGs).

insert into storage.buckets (id, name, public, file_size_limit)
values ('essay-heroes', 'essay-heroes', true, 6291456)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Anyone can read hero images (public pages).
drop policy if exists "essay_heroes_public_read" on storage.objects;
create policy "essay_heroes_public_read"
  on storage.objects for select
  using (bucket_id = 'essay-heroes');

-- Server uploads use service role (bypasses RLS). If you add client uploads later, scope policies here.
