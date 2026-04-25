alter table public.content_posts
  alter column cover_image_url drop not null,
  alter column cover_image_path drop not null;
