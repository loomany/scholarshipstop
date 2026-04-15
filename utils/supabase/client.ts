import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types_db';

/**
 * One browser client per tab. Creating a new `createBrowserClient()` on every call
 * spawns multiple GoTrue clients that fight over the same Web Locks API mutex and throw
 * "Lock … was released because another request stole it".
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export const createClient = () => {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
};
