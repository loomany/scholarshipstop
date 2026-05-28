'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BrainCircuit, Lock } from 'lucide-react';

import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import {
  recordGuestCompareHubNavigation,
  shouldBlockGuestCompareHubNavigation,
  type HubBudgetScope
} from '@/lib/guest/guestHubClickBudget';
import type { CompareIndexItem } from '@/lib/seo/compareIndexFilters';
import type { CompareHubGridIqCopy } from '@/lib/i18n/hubUiCopy';
import { getCompareHubUiCopy, getHubToolbarUiCopy } from '@/lib/i18n/hubUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { isIqSitePromoVisible } from '@/lib/iq/iqSitePromoVisibility';

type CompareCardGridProps = {
  items: CompareIndexItem[];
  emptyMessage: string;
  gridIq?: CompareHubGridIqCopy;
  iqHref?: string;
  locale?: LocalizedUiLocale;
};

function CompareGridIqAssessmentCard({
  iq,
  href
}: {
  iq: CompareHubGridIqCopy;
  href: string;
}) {
  if (!isIqSitePromoVisible()) return null;

  return (
    <Link
      href={href}
      aria-label={iq.startIqAria}
      className="group relative flex h-full min-h-[15rem] flex-col overflow-hidden rounded-2xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_12px_40px_-18px_rgba(234,88,12,0.58)] ring-1 ring-[#FFE2C2] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-18px_rgba(234,88,12,0.74)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:p-6"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
        aria-hidden
      />
      <div
        className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[#FF7A1A]/16 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-10 h-24 w-24 rounded-full bg-sky-300/20 blur-2xl"
        aria-hidden
      />

      <div className="relative flex h-full min-w-0 flex-col justify-between pl-1">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB875] bg-white/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3 w-3 text-[#F97316]" aria-hidden />
              {iq.featuredTool}
            </span>
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              {iq.badge}
            </span>
          </div>
          <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-950 sm:text-xl">
            {iq.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{iq.body}</p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-orange-100 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {iq.assessmentLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 transition group-hover:text-[#B45309]">
            {iq.startIqTest}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

const DEFAULT_GRID_IQ: CompareHubGridIqCopy = {
  featuredTool: 'Featured Tool',
  badge: 'Decision fit',
  title: 'Not sure which path fits you?',
  body: 'Take a cognitive assessment and discover the thinking strengths that can guide your scholarship strategy.',
  assessmentLabel: 'IQ assessment',
  startIqTest: 'Start IQ test',
  startIqAria: 'Start IQ assessment'
};

export default function CompareCardGrid({
  items,
  emptyMessage,
  gridIq = DEFAULT_GRID_IQ,
  iqHref = '/iq/assessment?intent=college_fit',
  locale = 'en'
}: CompareCardGridProps) {
  const compareUi = getCompareHubUiCopy(locale);
  const readMoreLabel = getHubToolbarUiCopy(locale).readMore;
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

  const showIqPromoInGrid = isIqSitePromoVisible();

  return (
    <AuthStatusProvider>
      {({ isAuthenticated, hasSubscription, authResolved }) => (
        <>
          <ul className="mt-6 grid list-none gap-6 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const isUniversity = item.type === 'universities';
              const badgeClass = isUniversity
                ? 'bg-sky-100 text-sky-800'
                : 'bg-emerald-100 text-emerald-800';
              const eyebrow = isUniversity
                ? compareUi.toolbar.categoryUniversities
                : compareUi.toolbar.categoryStates;
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
                <Fragment key={item.id}>
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
                          {readMoreLabel}
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
                  {showIqPromoInGrid && index === 2 ? (
                    <li key="compare-grid-iq-assessment">
                      <CompareGridIqAssessmentCard iq={gridIq} href={iqHref} />
                    </li>
                  ) : null}
                </Fragment>
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
