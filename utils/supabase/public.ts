import 'server-only';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types_db';

let publicClient: SupabaseClient<Database> | null = null;

/**
 * Public read-only Supabase client for cacheable server paths.
 * Do not use this client for user/session-aware reads.
 */
export const createPublicClient = (): SupabaseClient<Database> => {
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
