'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import {
  recordGuestCompareHubNavigation,
  shouldBlockGuestCompareHubNavigation,
  type HubBudgetScope
} from '@/lib/guest/guestHubClickBudget';
import type { CompareIndexItem } from '@/lib/seo/compareIndexFilters';

type CompareCardGridProps = {
  items: CompareIndexItem[];
  emptyMessage: string;
};

export default function CompareCardGrid({
  items,
  emptyMessage
}: CompareCardGridProps) {
  const [offerOpen, setOfferOpen] = useState(false);
  const [, hubTick] = useState(0);
  useEffect(() => {
    const sync = () => hubTick((n) => n + 1);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, []);

  const openOffer = useCallback(() => setOfferOpen(true), []);

  if (items.length === 0) {
    return <p className="mt-12 text-center text-gray-600">{emptyMessage}</p>;
  }

  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription, authResolved }) => (
        <>
          <ul className="mt-6 grid list-none gap-6 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isUniversity = item.type === 'universities';
              const badgeClass = isUniversity
                ? 'bg-sky-100 text-sky-800'
                : 'bg-emerald-100 text-emerald-800';
              const eyebrow = isUniversity
                ? 'University vs University'
                : 'State vs State';
              const headingId = `compare-card-title-${item.id}`;
              const hubBudgetScope: HubBudgetScope =
                isAuthenticated && authResolved && !hasSubscription
                  ? 'account'
                  : 'guest';
              const catalogFreeTier = authResolved && !hasSubscription;
              const showLock =
                catalogFreeTier &&
                shouldBlockGuestCompareHubNavigation(hubBudgetScope);

              const onCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                if (!authResolved) return;
                if (hasSubscription) return;
                if (shouldBlockGuestCompareHubNavigation(hubBudgetScope)) {
                  e.preventDefault();
                  openOffer();
                  return;
                }
                recordGuestCompareHubNavigation(hubBudgetScope);
              };

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-labelledby={headingId}
                    aria-describedby={
                      showLock ? `${headingId}-lock-hint` : undefined
                    }
                    onClick={onCardClick}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.16)]"
                  >
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <span
                        className={`mb-3 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
                      >
                        {eyebrow}
                      </span>
                      <h2
                        id={headingId}
                        className="text-lg font-bold leading-snug tracking-tight text-gray-900 group-hover:text-gray-800 sm:text-xl"
                      >
                        {item.title}
                      </h2>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
                        {item.description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 group-hover:text-orange-700">
                        {showLock ? (
                          <Lock
                            className="h-4 w-4 shrink-0 text-orange-500/90"
                            strokeWidth={2.2}
                            aria-hidden
                          />
                        ) : null}
                        Read more →
                      </span>
                      {showLock ? (
                        <span id={`${headingId}-lock-hint`} className="sr-only">
                          Sign in and start a trial to open comparisons after your
                          free previews.
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <ScholarshipRegistrationWallModal
            open={offerOpen}
            onClose={() => setOfferOpen(false)}
            signedInWithoutSubscription={
              Boolean(isAuthenticated && authResolved && !hasSubscription)
            }
          />
        </>
      )}
    </AuthStatusProvider>
  );
}
