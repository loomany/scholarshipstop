'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { enrichAllMissingProvidersAction } from '@/app/providers/actions';

type Props = {
  pendingCount: number;
};

export function ProvidersHubBulkEnrichButton({ pendingCount }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6">
      <p className="text-sm font-medium text-zinc-800">
        Dev / admin: {pendingCount} provider{pendingCount === 1 ? '' : 's'} with{' '}
        <code className="rounded bg-white/80 px-1 py-0.5 text-xs text-zinc-700">
          is_enriched = false
        </code>
        {pendingCount <= 0 && !message ? (
          <span className="mt-2 block font-normal text-zinc-600">
            Nothing queued — all rows are already enriched, or the{' '}
            <code className="rounded bg-white/80 px-1 text-xs">providers</code> table has no
            matching rows yet.
          </span>
        ) : null}
      </p>
      <button
        type="button"
        disabled={isPending || pendingCount <= 0}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const res = await enrichAllMissingProvidersAction();
            if (res.ok) {
              setMessage(`Done. Processed ${res.processed} row(s).`);
              router.refresh();
            } else {
              setMessage(res.error);
            }
          });
        }}
        className="mt-4 inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Enriching…' : 'Enrich all missing data'}
      </button>
      {message ? (
        <p className="mt-3 text-sm text-zinc-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
