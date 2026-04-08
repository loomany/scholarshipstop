'use client';

import { useEffect } from 'react';

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
    console.error(error);
  }, [error]);

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
