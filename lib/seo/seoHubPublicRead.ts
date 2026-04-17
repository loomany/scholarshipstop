import { createPublicClient } from '@/utils/supabase/public';

/**
 * Public read for layout metadata when no static `seo-scholarship-content` JSON exists.
 */
export async function fetchSeoHubContentMeta(canonicalPath: string): Promise<{
  title: string | null;
  h1: string | null;
  meta_description: string | null;
} | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const pathKey = canonicalPath.trim().replace(/^\/+/, '').toLowerCase();
  if (!pathKey) return null;

  const { data, error } = await supabase
    .from('seo_hub_content')
    .select('title, h1, meta_description')
    .eq('canonical_path', pathKey)
    .maybeSingle();

  if (error || !data) return null;
  return {
    title: data.title,
    h1: data.h1,
    meta_description: data.meta_description
  };
}
