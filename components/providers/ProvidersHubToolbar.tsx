'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

type Props = {
  defaultQuery: string;
  /** Preserves `?state=` in the form when present (e.g. bookmarked URLs). */
  activeStateCode: string;
};

export function ProvidersHubToolbar({ defaultQuery, activeStateCode }: Props) {
  const [qDraft, setQDraft] = useState(defaultQuery);

  useEffect(() => {
    setQDraft(defaultQuery);
  }, [defaultQuery]);

  return (
    <form action="/providers" method="get" role="search" className="w-full">
      {activeStateCode ? (
        <input type="hidden" name="state" value={activeStateCode} />
      ) : null}
      <label htmlFor="providers-toolbar-q" className="sr-only">
        Search providers
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          id="providers-toolbar-q"
          name="q"
          type="search"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder="Search by provider name, state, or your request..."
          autoComplete="off"
          className="w-full rounded-lg border border-zinc-200 bg-white py-3.5 pl-12 pr-4 text-base text-zinc-900 shadow-sm outline-none ring-zinc-900/0 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-4 focus:ring-zinc-900/[0.06]"
        />
      </div>
    </form>
  );
}
