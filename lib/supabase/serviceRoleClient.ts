import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

export function createServiceRoleSupabaseClient():
  | ReturnType<typeof createClient<Database>>
  | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}
