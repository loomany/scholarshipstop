'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import clsx from 'clsx';
import { Info, Lock, Star } from 'lucide-react';
import {
  formatDeadlineTooltipText,
  getScholarshipDeadlineDisplayParts,
  resolveScholarshipCardAwardDisplay,
  scholarshipPublicPath,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import {
  SCHOLARSHIP_ACTION_FILL,
  SCHOLARSHIP_ACTION_FILL_PRESSED,
  SCHOLARSHIP_ACTION_FOCUS_VISIBLE
} from '@/lib/constants/scholarshipActionUi';
import {
  getScholarshipCatalog,
  payoutMethodChipLabel,
  scholarshipCardChips
} from '@/lib/scholarships/scholarshipCatalog';
import { scholarshipDeadlineHasPassed } from '@/lib/scholarships/similarScholarships';
import {
  recordGuestScholarshipDetailFreeNavigation,
  shouldBlockGuestScholarshipDetailNavigation
} from '@/lib/scholarships/guestScholarshipDetailClickBudget';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';
import ScholarshipCatalogChipRow from '@/components/scholarships/ScholarshipCatalogChipRow';

type ScholarshipCardProps = {
  scholarship: Scholarship;
  isUnread?: boolean;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onHide?: (id: string) => void;
  ignoreAction?: 'hide' | 'restore';
  /** Kept for API compatibility with category/long-tail pages; no separate report control in the compact layout. */
  reported?: boolean;
  onToggleReport?: (id: string) => void;
  /** Save + Not relevant (and Restore on Ignored tab). */
  showCardActions?: boolean;
  /**
   * Single-column layout for narrow containers (e.g. article previews): same card chrome,
   * meta + body stack vertically without the wide-screen three-column grid.
   */
  stackedListing?: boolean;
  /** Signed-in user without active subscription. */
  subscriptionLocked?: boolean;
  /** Hub listing tab — used for Hot Deadlines lock affordance. */
  listingTab?: ScholarshipListTabId;
  /** Open subscription modal when premium category chip is clicked. */
  onSubscriptionLockedCategoryClick?: (categoryId: string) => void;
  /**
   * Guest-only: after two free navigations to scholarship details (per browser tab session),
   * the next click opens the parent’s registration modal instead of navigating.
   */
  onGuestDetailNavigate?: () => void;
};

const METRIC_LABEL =
  'mt-1 text-xs font-normal leading-snug text-gray-500';

export default function ScholarshipCard({
  scholarship,
  isUnread = false,
  saved,
  onToggleSave,
  onHide,
  ignoreAction = 'hide',
  showCardActions = true,
  stackedListing = false,
  subscriptionLocked = false,
  listingTab,
  onSubscriptionLockedCategoryClick,
  onGuestDetailNavigate
}: ScholarshipCardProps) {
  const detailHref = scholarshipPublicPath(scholarship);
  const deadlinePassed = scholarshipDeadlineHasPassed(scholarship);

  /** Save / Not relevant — right column; full width of column on large screens. */
  const cardActionsWrap =
    'relative z-10 flex w-full max-w-[11rem] shrink-0 flex-col gap-2 self-start pointer-events-auto sm:max-w-[13rem] lg:max-w-none lg:w-full lg:self-stretch';

  const cardActionBtnBase = `w-full rounded-lg px-2.5 py-2 text-center text-xs font-semibold text-white transition ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;
  const cardActionSaveClass = `${cardActionBtnBase} ${SCHOLARSHIP_ACTION_FILL}`;
  const cardActionSavedClass = `${cardActionBtnBase} ${SCHOLARSHIP_ACTION_FILL_PRESSED}`;

  const awardLine = resolveScholarshipCardAwardDisplay(scholarship);
  const awardCell = awardLine.line;
  const hasAwardContent = !awardLine.isPlaceholder;

  const deadlineRaw = scholarship.deadline?.trim() ?? '';
  const hasDeadline =
    Boolean(deadlineRaw) || Boolean(scholarship.deadlineAt?.trim());
  const deadlineParts = getScholarshipDeadlineDisplayParts(scholarship);

  const reqCount = scholarship.eligibility?.length ?? 0;
  const reqDisplayCount =
    scholarship.requirementsCount != null &&
    !Number.isNaN(Number(scholarship.requirementsCount))
      ? Number(scholarship.requirementsCount)
      : reqCount;
  const requirementsSummary =
    scholarship.listRequirementsSummary?.trim() ||
    (reqCount === 0
      ? '0 requirements: No requirements'
      : `${reqCount} requirement${reqCount === 1 ? '' : 's'}: Listed in detail`);

  const requirementsMetric =
    reqDisplayCount === 0
      ? 'None'
      : reqDisplayCount === 1
        ? '1 requirement'
        : `${reqDisplayCount} requirements`;

  const requirementsMetricInner = (
    <>
      <p
        className={`break-words text-sm font-semibold leading-snug sm:text-[0.9375rem] ${
          deadlinePassed ? 'text-gray-600' : 'text-slate-900'
        }`}
      >
        {requirementsMetric}
      </p>
      <p className={METRIC_LABEL}>Requirements</p>
    </>
  );

  const summaryLine =
    scholarship.summaryShort?.trim() || requirementsSummary;

  const catalogChips = useMemo(
    () => scholarshipCardChips(scholarship).visible,
    [scholarship]
  );
  const LOCKED_CARD_CATEGORY_IDS = new Set([
    'easy_apply',
    'quick_apply'
  ]);
  const easyApplyIds = getScholarshipCatalog(scholarship).easyApplyIds;
  const showHotDeadlinesLockBadge =
    subscriptionLocked && listingTab === 'hot-deadlines';
  const showEasyApplyLockBadge =
    subscriptionLocked &&
    !showHotDeadlinesLockBadge &&
    easyApplyIds.some((id) => LOCKED_CARD_CATEGORY_IDS.has(id));
  const showTopRightLockBadge =
    showHotDeadlinesLockBadge || showEasyApplyLockBadge;
  const payoutLine = payoutMethodChipLabel(scholarship.payoutMethod);

  const hasApplicants =
    scholarship.applicantCount != null &&
    !Number.isNaN(scholarship.applicantCount);

  const providerLine = scholarship.provider?.trim() || '';
  const providerSlugTrimmed = scholarship.providerSlug?.trim() ?? '';
  const providerProfileHref = providerSlugTrimmed
    ? `/providers/${encodeURIComponent(providerSlugTrimmed)}`
    : null;

  const deadlineTooltipText = formatDeadlineTooltipText(scholarship);

  const showBadgeRow =
    scholarship.recurring ||
    Boolean(scholarship.credibilityLabel?.trim());

  const applicantsTitle = scholarship.applicantsCountIsEstimated
    ? 'Approximate applicant volume when available.'
    : 'Applicant count when available.';

  const cardActionControls =
    ignoreAction === 'restore' ? (
      <button
        type="button"
        className={cardActionSaveClass}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onHide?.(scholarship.id);
        }}
      >
        Restore to matches
      </button>
    ) : (
      <>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved' : 'Save scholarship'}
          className={saved ? cardActionSavedClass : cardActionSaveClass}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(scholarship.id);
          }}
        >
          {saved ? 'Saved ✓' : 'Save'}
        </button>
        <button
          type="button"
          className={cardActionSaveClass}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onHide?.(scholarship.id);
          }}
        >
          Not relevant
        </button>
      </>
    );

  const cardArticleClass = deadlinePassed
    ? 'group relative flex w-full min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/95 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md focus-within:border-zinc-300 focus-within:shadow-md'
    : 'group relative flex w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-lg focus-within:border-gray-300 focus-within:shadow-lg';

  const shellPad = stackedListing
    ? 'gap-4 px-4 py-4 sm:px-5 sm:py-5'
    : 'gap-5 px-5 py-5 sm:px-6 sm:py-6';

  const metaGrid = stackedListing
    ? 'flex flex-col gap-3'
    : 'flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.1fr)] lg:items-start lg:gap-x-8';

  const titleColSpan = !stackedListing
    ? showCardActions
      ? 'lg:col-span-6'
      : 'lg:col-span-8'
    : '';

  const reqColSpan = !stackedListing
    ? showCardActions
      ? 'lg:col-span-3'
      : 'lg:col-span-4'
    : '';

  return (
    <article className={cardArticleClass} data-scholarship-card>
      <Link
        href={detailHref}
        onClick={(e) => {
          if (!onGuestDetailNavigate) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          if (shouldBlockGuestScholarshipDetailNavigation()) {
            e.preventDefault();
            onGuestDetailNavigate();
            return;
          }
          recordGuestScholarshipDetailFreeNavigation();
        }}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A1A]/50"
        aria-label={`View scholarship: ${scholarship.title}`}
      >
        <span className="sr-only">Open scholarship details</span>
      </Link>
      <div
        className={`relative z-[1] w-1.5 shrink-0 self-stretch rounded-l-[0.75rem] pointer-events-none ${deadlinePassed ? 'bg-zinc-400' : 'bg-slate-900'}`}
        aria-hidden
      />

      <div
        className={clsx(
          'relative z-[1] flex min-w-0 flex-1 flex-col pointer-events-none',
          shellPad
        )}
      >
        {/* Row 1: provider + NEW | deadline | award (matches wide “SaaS” card) */}
        <div className={metaGrid}>
          <div className="min-w-0 lg:justify-self-start">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs font-medium text-gray-500 sm:text-[13px]">
              {scholarship.featured ? (
                <span
                  className="pointer-events-none flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50/95 text-amber-800 ring-1 ring-amber-200/60"
                  aria-label="Featured scholarship"
                >
                  <Star
                    className="h-3 w-3 fill-amber-400/90 text-amber-600/80"
                    aria-hidden
                  />
                </span>
              ) : null}
              {providerLine ? (
                providerProfileHref ? (
                  <Link
                    href={providerProfileHref}
                    className="group relative z-10 inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md text-gray-500 outline-none transition pointer-events-auto hover:text-emerald-700 hover:underline hover:decoration-emerald-600/40 hover:underline-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`View provider: ${providerLine}`}
                  >
                    <Info
                      className="h-3.5 w-3.5 shrink-0 text-gray-400 transition group-hover:text-emerald-600"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{providerLine}</span>
                  </Link>
                ) : (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Info
                      className="h-3.5 w-3.5 shrink-0 text-gray-400"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{providerLine}</span>
                  </span>
                )
              ) : null}
              {isUnread ? (
                <span
                  className="pointer-events-none inline-flex h-5 shrink-0 items-center rounded-md bg-[#FF7A1A] px-2 text-[10px] font-bold uppercase leading-none tracking-wide text-white shadow-sm"
                  aria-label="New — not opened yet"
                >
                  NEW
                </span>
              ) : null}
              {scholarship.verified ? (
                <span className="pointer-events-none shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/70">
                  Verified
                </span>
              ) : null}
              {showTopRightLockBadge ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSubscriptionLockedCategoryClick?.(
                      showHotDeadlinesLockBadge ? 'hot_deadlines' : 'easy_apply'
                    );
                  }}
                  className="relative z-30 inline-flex h-5 w-[34px] shrink-0 items-center justify-center rounded-md bg-[#FF7A1A] text-white shadow-sm transition hover:bg-[#E6670C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-1 pointer-events-auto"
                  title="Start your free access to unlock this category"
                  aria-label="Locked category. Start free access to unlock."
                >
                  <Lock className="h-3 w-3" strokeWidth={2.2} aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          <div
            className={clsx(
              'min-w-0',
              !stackedListing && 'lg:text-center'
            )}
            title={hasDeadline ? deadlineTooltipText : undefined}
          >
            {hasDeadline ? (
              <>
                <p
                  className={clsx(
                    'min-w-0 break-words font-bold tabular-nums leading-tight',
                    deadlinePassed
                      ? 'text-base text-gray-500 sm:text-lg'
                      : 'text-base text-slate-900 sm:text-lg'
                  )}
                >
                  {deadlineParts.primary}
                </p>
                {deadlineParts.secondary ? (
                  <p
                    className={clsx(
                      'mt-0.5 text-xs font-medium leading-snug',
                      deadlinePassed ? 'text-gray-400' : 'text-gray-500'
                    )}
                  >
                    {deadlineParts.secondary}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-base font-bold text-gray-400">—</p>
            )}
          </div>

          <div
            className={clsx(
              'min-w-0',
              !stackedListing && 'lg:text-right'
            )}
          >
            <p
              title={awardLine.lineTitle}
              className={clsx(
                'min-w-0 max-w-full truncate font-bold leading-tight',
                awardLine.isNumeric && 'tabular-nums',
                !hasAwardContent && 'text-sm text-gray-400',
                hasAwardContent &&
                  deadlinePassed &&
                  'text-base text-gray-600 sm:text-lg',
                hasAwardContent &&
                  !deadlinePassed &&
                  'text-lg text-slate-900 sm:text-xl'
              )}
            >
              {awardCell}
            </p>
            <p
              className={clsx(
                METRIC_LABEL,
                !stackedListing && 'lg:text-right'
              )}
            >
              Award Amount
            </p>
            {payoutLine ? (
              <p
                className={clsx(
                  'mt-1 text-xs font-medium text-gray-500',
                  !stackedListing && 'lg:text-right'
                )}
              >
                {payoutLine}
              </p>
            ) : null}
          </div>
        </div>

        {/* Row 2: title + summary | requirements | actions */}
        <div
          className={clsx(
            'grid grid-cols-1 gap-5',
            !stackedListing && 'lg:grid-cols-12 lg:items-start lg:gap-6'
          )}
        >
          <div
            className={clsx(
              'min-w-0 space-y-1.5',
              titleColSpan
            )}
          >
            <h2
              className={clsx(
                'min-w-0 overflow-hidden text-lg font-bold leading-snug tracking-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:text-xl',
                deadlinePassed
                  ? 'text-gray-600 group-hover:text-gray-600'
                  : 'text-slate-900 group-hover:text-slate-800'
              )}
              title={scholarship.title}
            >
              {scholarship.title}
            </h2>
            <p
              className="min-w-0 overflow-hidden text-sm leading-relaxed text-gray-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
              title={summaryLine}
            >
              {summaryLine}
            </p>
            {hasApplicants ? (
              <p
                className="min-w-0 truncate text-xs tabular-nums text-gray-500"
                title={applicantsTitle}
              >
                <span className="font-medium text-gray-700">
                  {scholarship.applicantCount!.toLocaleString()}
                </span>{' '}
                applicants
                {scholarship.applicantsCountIsEstimated ? ' (est.)' : ''}
              </p>
            ) : null}
            {showBadgeRow ? (
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                {scholarship.recurring ? (
                  <span
                    className="inline-flex max-w-full items-center gap-1 text-gray-500"
                    title="This scholarship recurs periodically."
                  >
                    <span className="text-gray-400" aria-hidden>
                      ↻
                    </span>
                    <span className="truncate">Recurring</span>
                  </span>
                ) : null}
                {scholarship.credibilityLabel?.trim() ? (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400"
                      aria-hidden
                    />
                    <span className="truncate">
                      {scholarship.credibilityLabel.trim()}
                    </span>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={clsx('min-w-0', reqColSpan)}>
            {requirementsMetricInner}
          </div>

          {showCardActions ? (
            <div
              className={clsx(
                cardActionsWrap,
                !stackedListing && 'lg:col-span-3'
              )}
            >
              {cardActionControls}
            </div>
          ) : null}
        </div>

        {catalogChips.length > 0 ? (
          <div
            className="min-w-0 border-t border-gray-200 pt-4"
            aria-label="Scholarship tags"
          >
            <ScholarshipCatalogChipRow chips={catalogChips} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
