-- Fallback DDL for public.seo_hub_content on VPS PostgreSQL.
--
-- Problem: Supabase dump defines id DEFAULT extensions.uuid_generate_v4().
-- If schema "extensions" or uuid-ossp is missing at pg_restore time, the table
-- is skipped entirely. restore-postgres-pre.sh creates schema extensions + uuid-ossp;
-- this file is the post-restore safety net (gen_random_uuid() default).
-- Applied automatically by restore-postgres-post.sh when the table is missing or empty.
CREATE TABLE IF NOT EXISTS public.seo_hub_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    canonical_path text NOT NULL,
    title text,
    h1 text,
    intro_html text,
    faq_json jsonb,
    model_version text DEFAULT 'gemini-1.5-flash'::text,
    generated_at timestamp with time zone DEFAULT now(),
    is_published boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    content_html text,
    cost_of_living_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    meta_description text,
    CONSTRAINT seo_hub_content_canonical_path_unique UNIQUE (canonical_path)
);

CREATE INDEX IF NOT EXISTS seo_hub_content_updated_at_idx
  ON public.seo_hub_content (updated_at DESC);

ALTER TABLE public.seo_hub_content ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seo_hub_content'
      AND policyname = 'seo_hub_content_select_public'
  ) THEN
    CREATE POLICY "seo_hub_content_select_public"
      ON public.seo_hub_content
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_seo_hub_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seo_hub_content_set_updated_at ON public.seo_hub_content;
CREATE TRIGGER seo_hub_content_set_updated_at
  BEFORE INSERT OR UPDATE ON public.seo_hub_content
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seo_hub_content_updated_at();
