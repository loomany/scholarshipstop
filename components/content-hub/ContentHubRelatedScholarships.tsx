'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { useCallback, useEffect, useState } from 'react';

import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import type { ContentPostScholarshipLink } from '@/lib/content-hub/contentPostScholarshipLinks';
import {
  recordScholarshipDetailFreeNavigation,
  resolveScholarshipDetailClickBudgetMode,
  shouldBlockScholarshipDetailNavigation
} from '@/lib/scholarships/guestScholarshipDetailClickBudget';
import {
  hasActiveSubscriptionAccess,
  type SubscriptionWithPriceAndProduct
} from '@/lib/payments/subscriptionEntitlements';
import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types_db';

function contextLabel(
  reason: string,
  kind: ContentPostScholarshipLink['kind']
): string {
  if (kind === 'external') return 'External opportunity';
  const r = reason.trim();
  if (!r || /matched\s+by\s+intent|intent\s+match/i.test(r)) {
    return 'Recommended based on this article';
  }
  const lower = r.toLowerCase();
  if (lower.includes('international')) return 'Relevant for international students';
  if (lower.includes('graduate') || lower.includes('phd')) {
    return 'Good match for graduate applicants';
  }
  return 'May fit your goals';
}

const compactCardClass =
  'group flex h-full min-h-[8.5rem] flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2';

const featuredShellClass =
  'group flex w-full flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6';

const featuredCtaClass =
  'inline-flex w-full shrink-0 items-center justify-center rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition group-hover:bg-gray-800 sm:w-auto sm:px-7';

function ScholarshipLinkCardCompact({
  item,
  isAuthenticated,
  hasSubscription,
  onDetailNavigateBlocked
}: {
  item: ContentPostScholarshipLink;
  isAuthenticated: boolean;
  hasSubscription: boolean;
  onDetailNavigateBlocked: () => void;
}) {
  const label = contextLabel(item.reason, item.kind);
  const reasonSnippet =
    item.reason.trim() &&
    !/matched\s+by\s+intent|intent\s+match/i.test(item.reason)
      ? item.reason.trim()
      : '';

  const inner = (
    <>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-orange-600/90">
        {label}
      </p>
      <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-snug tracking-tight text-gray-900 group-hover:text-gray-800">
        {item.title}
      </h3>
      {reasonSnippet ? (
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
          {reasonSnippet}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <span className="mt-4 inline-flex items-center text-sm font-semibold text-orange-600 group-hover:text-orange-700">
        View scholarship →
      </span>
    </>
  );

  if (item.kind === 'external') {
    return (
      <a
        href={item.url}
        className={compactCardClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={`/scholarships/${encodeURIComponent(item.slug)}`}
      scroll
      className={compactCardClass}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const budgetMode = resolveScholarshipDetailClickBudgetMode({
          isAuthenticated,
          hasSubscription
        });
        if (!budgetMode) return;
        if (shouldBlockScholarshipDetailNavigation(budgetMode)) {
          e.preventDefault();
          e.stopPropagation();
          onDetailNavigateBlocked();
          return;
        }
        recordScholarshipDetailFreeNavigation(budgetMode);
      }}
    >
      {inner}
    </Link>
  );
}

function ScholarshipLinkCardFeatured({
  item,
  isAuthenticated,
  hasSubscription,
  onDetailNavigateBlocked
}: {
  item: ContentPostScholarshipLink;
  isAuthenticated: boolean;
  hasSubscription: boolean;
  onDetailNavigateBlocked: () => void;
}) {
  const label = contextLabel(item.reason, item.kind);
  const reasonSnippet =
    item.reason.trim() &&
    !/matched\s+by\s+intent|intent\s+match/i.test(item.reason)
      ? item.reason.trim()
      : '';

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-orange-600">
          {label}
        </p>
        <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight text-gray-900 sm:text-xl">
          {item.title}
        </h3>
        {reasonSnippet ? (
          <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
            {reasonSnippet}
          </p>
        ) : null}
      </div>
      <span className={featuredCtaClass}>View scholarship</span>
    </>
  );

  if (item.kind === 'external') {
    return (
      <a
        href={item.url}
        className={featuredShellClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      href={`/scholarships/${encodeURIComponent(item.slug)}`}
      scroll
      className={featuredShellClass}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const budgetMode = resolveScholarshipDetailClickBudgetMode({
          isAuthenticated,
          hasSubscription
        });
        if (!budgetMode) return;
        if (shouldBlockScholarshipDetailNavigation(budgetMode)) {
          e.preventDefault();
          e.stopPropagation();
          onDetailNavigateBlocked();
          return;
        }
        recordScholarshipDetailFreeNavigation(budgetMode);
      }}
    >
      {body}
    </Link>
  );
}

type ContentHubRelatedScholarshipsProps = {
  links: ContentPostScholarshipLink[];
};

export default function ContentHubRelatedScholarships({
  links
}: ContentHubRelatedScholarshipsProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [registrationWallContent, setRegistrationWallContent] = useState<
    'grant-guest' | 'card-unlock'
  >('grant-guest');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setIsAuthenticated(Boolean(session?.user?.id));
      if (!session?.user?.id) {
        setHasSubscription(false);
        return;
      }
      const [{ data: profile }, { data: subscriptions }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle<Database['public']['Tables']['profiles']['Row']>(),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created', { ascending: false })
          .limit(20)
      ]);
      if (cancelled) return;
      const subscription = pickCanonicalSubscription(
        (subscriptions ?? []) as Database['public']['Tables']['subscriptions']['Row'][]
      ) as SubscriptionWithPriceAndProduct | null;
      setHasSubscription(hasActiveSubscriptionAccess(profile ?? null, subscription));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openDetailBlockedWall = useCallback(() => {
    setRegistrationWallContent(
      isAuthenticated ? 'card-unlock' : 'grant-guest'
    );
    setRegistrationWallOpen(true);
  }, [isAuthenticated]);

  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);

  if (!links.length) return null;

  const count = links.length;
  const useFeatured = count < 3;

  return (
    <section
      className="mt-10"
      aria-labelledby="content-hub-related-scholarships-heading"
    >
      <h2
        id="content-hub-related-scholarships-heading"
        className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
      >
        🎓 Related Scholarships
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
        Based on this article, these scholarships may fit you
      </p>

      <div
        className={clsx(
          'mt-6 grid gap-4',
          count === 1 && 'grid-cols-1',
          count === 2 && 'grid-cols-1 md:grid-cols-2',
          count >= 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {links.map((item, index) =>
          useFeatured ? (
            <ScholarshipLinkCardFeatured
              key={
                item.kind === 'internal' ? item.slug : `${item.url}-${index}`
              }
              item={item}
              isAuthenticated={isAuthenticated}
              hasSubscription={hasSubscription}
              onDetailNavigateBlocked={openDetailBlockedWall}
            />
          ) : (
            <ScholarshipLinkCardCompact
              key={
                item.kind === 'internal' ? item.slug : `${item.url}-${index}`
              }
              item={item}
              isAuthenticated={isAuthenticated}
              hasSubscription={hasSubscription}
              onDetailNavigateBlocked={openDetailBlockedWall}
            />
          )
        )}
      </div>
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
        contentMode={registrationWallContent}
        signedInWithoutSubscription={Boolean(isAuthenticated && !hasSubscription)}
      />
    </section>
  );
}
