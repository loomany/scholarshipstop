'use client';

import { useEffect } from 'react';

function isChunkLoadError(error: Error): boolean {
  const message = error.message ?? '';
  return /Loading chunk \d+ failed|ChunkLoadError|failed to fetch dynamically imported module|Importing a module script failed/i.test(
    message
  );
}

function reloadOnceForChunkError(error: Error): boolean {
  if (!isChunkLoadError(error) || typeof window === 'undefined') return false;
  const key = `scholarshiptop:chunk-reload:${window.location.pathname}`;
  if (window.sessionStorage.getItem(key) === '1') return false;
  window.sessionStorage.setItem(key, '1');
  window.location.reload();
  return true;
}

/**
 * Renders when an error bubbles past the root layout. Must define its own
 * <html> and <body> (Next.js App Router requirement).
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (reloadOnceForChunkError(error)) return;
    console.error(error);
  }, [error]);
  const detail = error.message?.trim();
  const safeDetail =
    detail && detail !== 'An unexpected error occurred.'
      ? detail.slice(0, 240)
      : null;

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Please try again. If the problem continues, refresh the page.
          </p>
          {safeDetail ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {safeDetail}
            </p>
          ) : null}
          {error.digest ? (
            <p className="mt-2 text-xs text-zinc-500">Error ID: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
