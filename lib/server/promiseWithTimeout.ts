import 'server-only';

/** Rejects when `promise` does not settle within `ms`. */
export class PromiseTimeoutError extends Error {
  override readonly name = 'PromiseTimeoutError';

  constructor(message: string) {
    super(message);
  }
}

export async function promiseWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new PromiseTimeoutError(
              label
                ? `${label} timed out after ${ms}ms`
                : `Operation timed out after ${ms}ms`
            )
          );
        }, ms);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Homepage Supabase-backed Suspense sections must not block SSG indefinitely.
 * Shorter limit during production build; generous enough for normal SSR.
 */
export function homepageSupabaseFetchTimeoutMs(): number {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return 12_000;
  }
  return 25_000;
}
