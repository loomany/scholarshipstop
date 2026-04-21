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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        /**
         * `@supabase/ssr` 0.1.0: if `options` is passed without `cookies`, destructuring sets
         * `cookies` to `undefined`, then storage getItem does `cookies.get` → runtime error.
         * Empty object keeps the built-in `document.cookie` path (no `get` on cookies).
         */
        cookies: {},
        auth: {
          /**
           * Default GoTrue uses `navigator.locks` with a timeout → "steal", which
           * rejects the other holder with `AbortError: Lock broken by another request
           * with the 'steal' option.` (common with Turbo/HMR, multiple tabs, or fast
           * successive auth calls). A no-op lock runs the critical section without
           * cross-tab exclusivity; session sync still uses cookies + BroadcastChannel.
           */
          lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) =>
            fn()
        }
      }
    );
  }
  return browserClient;
};
