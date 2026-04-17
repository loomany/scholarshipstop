import 'server-only';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types_db';

let publicClient: SupabaseClient<Database> | null = null;

/** True when anon URL + key are set (e.g. missing on CI/Railway build without build-time env). */
export function isPublicSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

/**
 * Public read-only Supabase client for cacheable server paths.
 * Do not use this client for user/session-aware reads.
 *
 * Returns `null` when `NEXT_PUBLIC_SUPABASE_*` are unset so `next build` can prerender
 * without secrets; callers must fall back to empty data.
 */
export const createPublicClient = (): SupabaseClient<Database> | null => {
  if (!isPublicSupabaseConfigured()) return null;
  if (publicClient) return publicClient;

  publicClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );

  return publicClient;
};
