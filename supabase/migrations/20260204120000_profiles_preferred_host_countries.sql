-- Study-destination preference for personalized Best recommendation (hub host-country SQL filter).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_host_country_codes jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.preferred_host_country_codes IS
  'ISO 3166-1 alpha-2 codes where the user wants to study; Best recommendation overlaps host_country_codes when set (empty = no host filter).';
