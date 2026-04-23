'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const detail = error.message?.trim();
  const safeDetail =
    detail && detail !== 'An unexpected error occurred.'
      ? detail.slice(0, 240)
      : null;

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        An unexpected error occurred. You can try again or return to the home page.
      </p>
      {safeDetail ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {safeDetail}
        </p>
      ) : null}
      {error.digest ? (
        <p className="mt-2 text-xs text-zinc-500">Error ID: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
        >
          Home
        </a>
      </div>
    </div>
  );
}
