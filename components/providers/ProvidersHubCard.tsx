'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

import type { ProviderHubRow } from '@/lib/providers/providerHubTypes';
import { providerHubRegionLine } from '@/lib/providers/providerHubRegionLabel';
import {
  recordGuestProviderHubNavigation,
  shouldBlockGuestProviderHubNavigation,
  type HubBudgetScope
} from '@/lib/guest/guestHubClickBudget';

function cardTitle(row: ProviderHubRow): string {
  const n = row.display_name?.trim();
  if (n) return n;
  return row.slug.replace(/-/g, ' ');
}

function descriptionSnippet(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 280 ? `${t.slice(0, 277)}…` : t;
}

type Props = {
  row: ProviderHubRow;
  isAuthenticated: boolean;
  hasSubscription: boolean;
  authResolved: boolean;
  onSubscriptionRequired: () => void;
};

export function ProvidersHubCard({
  row,
  isAuthenticated,
  hasSubscription,
  authResolved,
  onSubscriptionRequired
}: Props) {
  const [, bump] = useState(0);
  useEffect(() => {
    const sync = () => bump((n) => n + 1);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, []);

  const title = cardTitle(row);
  const count = row.scholarship_count ?? 0;
  const href = `/providers/${encodeURIComponent(row.slug)}`;
  const region = providerHubRegionLine(row.state);
  const snippet = descriptionSnippet(row.ai_description);
  const headingId = `provider-hub-card-title-${row.slug}`;

  const hubBudgetScope: HubBudgetScope = !isAuthenticated ? 'guest' : 'account';
  const catalogFreeTier = authResolved && !isAuthenticated;
  const showLock =
    catalogFreeTier && shouldBlockGuestProviderHubNavigation(hubBudgetScope);

  const onCardClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!authResolved) return;
      if (isAuthenticated) return;
      if (shouldBlockGuestProviderHubNavigation(hubBudgetScope)) {
        e.preventDefault();
        onSubscriptionRequired();
        return;
      }
      recordGuestProviderHubNavigation(hubBudgetScope);
    },
    [authResolved, hasSubscription, hubBudgetScope, onSubscriptionRequired]
  );

  const renderActiveScholarshipsBadge = (placement: 'mobile' | 'desktop') => (
    <span
      className={
        placement === 'mobile'
          ? 'inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-right text-[10px] font-semibold leading-none text-emerald-600 ring-1 ring-emerald-100'
          : 'inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold leading-none text-emerald-600 ring-1 ring-emerald-100'
      }
    >
      {count.toLocaleString()} Active {count === 1 ? 'Scholarship' : 'Scholarships'}
    </span>
  );

  return (
    <li className="h-full">
      <Link
        href={href}
        aria-labelledby={headingId}
        onClick={onCardClick}
        aria-describedby={showLock ? `${headingId}-lock-hint` : undefined}
        className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm outline-none transition duration-300 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 sm:p-8"
      >
        <article className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 sm:block">
            <p className="min-w-0 flex-1 text-[11px] font-semibold uppercase leading-none tracking-wider text-zinc-500 sm:flex-none sm:leading-normal">
              {region}
            </p>
            <div className="flex shrink-0 items-center sm:hidden">
              {renderActiveScholarshipsBadge('mobile')}
            </div>
          </div>
          <h2
            id={headingId}
            className="mt-3 line-clamp-2 text-xl font-bold leading-snug tracking-tight text-zinc-900 sm:mt-4 sm:text-2xl sm:leading-snug"
          >
            {title}
          </h2>
          {snippet ? (
            <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-relaxed">
              {snippet}
            </p>
          ) : (
            <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
              Profile details will appear after enrichment.
            </p>
          )}
          <div className="mt-6 hidden sm:block">
            {renderActiveScholarshipsBadge('desktop')}
          </div>
          <span className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-orange-600 transition group-hover:border-zinc-300 group-hover:bg-zinc-50 group-hover:text-orange-700">
            {showLock ? (
              <Lock
                className="h-4 w-4 shrink-0 text-orange-500/90"
                strokeWidth={2.2}
                aria-hidden
              />
            ) : null}
            View Profile
          </span>
          {showLock ? (
            <span id={`${headingId}-lock-hint`} className="sr-only">
              Sign in and start a trial to open provider profiles from this listing
              after your free previews.
            </span>
          ) : null}
        </article>
      </Link>
    </li>
  );
}
