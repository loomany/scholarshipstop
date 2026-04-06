'use client';

import Link from 'next/link';
import { Info, Star } from 'lucide-react';
import {
  formatDeadlineTooltipText,
  formatScholarshipAwardDisplay,
  getScholarshipDeadlineDisplayParts,
  scholarshipPublicPath,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import {
  SCHOLARSHIP_ACTION_FILL,
  SCHOLARSHIP_ACTION_FILL_PRESSED,
  SCHOLARSHIP_ACTION_FOCUS_VISIBLE
} from '@/lib/constants/scholarshipActionUi';
import {
  payoutMethodChipLabel,
  scholarshipCardChips
} from '@/lib/scholarships/scholarshipCatalog';

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
  showPersonalizedMatch?: boolean;
  /** Save + Not relevant (and Restore on Ignored tab). */
  showCardActions?: boolean;
  /**
   * Single-column stack (award / deadline / actions below title) regardless of viewport.
   * Use inside narrow containers (e.g. landing preview) where `xl:` grid would break layout.
   */
  stackedListing?: boolean;
};

const METRIC_LABEL =
  'mt-1 text-[10px] font-normal leading-snug text-gray-500 sm:text-[11px] sm:normal-case';

function matchTierLabel(score: number): { emoji: string; label: string; className: string } {
  if (score >= 90) {
    return {
      emoji: '🔥',
      label: 'Best Match',
      className: 'bg-orange-50 text-orange-900 ring-1 ring-orange-200/80'
    };
  }
  if (score >= 70) {
    return {
      emoji: '✅',
      label: 'Good Match',
      className: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80'
    };
  }
  return {
    emoji: '⚠️',
    label: 'Possible',
    className: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80'
  };
}

export default function ScholarshipCard({
  scholarship,
  isUnread = false,
  saved,
  onToggleSave,
  onHide,
  ignoreAction = 'hide',
  showPersonalizedMatch = false,
  showCardActions = true,
  stackedListing = false
}: ScholarshipCardProps) {
  const detailHref = scholarshipPublicPath(scholarship);

  const gridShell = stackedListing
    ? 'grid min-w-0 flex-1 grid-cols-1 content-start gap-x-5 gap-y-3 px-4 py-4 sm:px-5 sm:py-5'
    : 'grid min-w-0 flex-1 grid-cols-1 content-start gap-x-5 gap-y-3 px-4 py-4 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(112px,0.48fr)_minmax(164px,0.72fr)] xl:grid-rows-[auto_auto_auto] xl:gap-x-2.5 xl:gap-y-2 xl:items-start';

  /** Title spans rows 1–2 on xl so it aligns with deadline+reqs / award+actions. */
  const titleCell = stackedListing
    ? 'min-w-0 text-left'
    : 'min-w-0 text-left xl:col-start-1 xl:row-start-1 xl:row-span-2';

  /** Deadline only (xl row 1 col 2). Requirements are a separate grid row on xl. */
  const deadlineBlockWrap = stackedListing
    ? 'min-w-0 border-t border-gray-200 pt-3'
    : 'min-w-0 border-t border-gray-200 pt-3 xl:col-start-2 xl:row-start-1 xl:border-0 xl:pt-0';

  /** Award metrics only (xl row 1 col 3). */
  const awardMetricsWrap = stackedListing
    ? 'min-w-0 border-t border-gray-200 pt-3'
    : 'min-w-0 border-t border-gray-200 pt-3 xl:col-start-3 xl:row-start-1 xl:w-full xl:max-w-[200px] xl:justify-self-start xl:border-0 xl:pt-0';

  /** Save / Not relevant — xl row 2 col 3, vertically centered with requirements. */
  const cardActionsWrap = stackedListing
    ? 'relative z-10 mt-2.5 flex w-full max-w-[148px] shrink-0 flex-col gap-1.5 self-start pointer-events-auto'
    : 'relative z-10 mt-2.5 flex w-full max-w-[148px] shrink-0 flex-col gap-1.5 self-start pointer-events-auto xl:col-start-3 xl:row-start-2 xl:mt-0 xl:w-[128px] xl:max-w-none xl:self-center xl:justify-self-start';

  /** Award metrics: left-aligned (reads toward deadline). */
  const awardMetricAlign = 'text-left';
  const awardMetricAlignTight = 'text-left';

  const deadlineInner = 'min-w-0';

  const metricTextAlign = stackedListing ? 'text-left' : 'text-center xl:text-left';
  const metricTextAlignTight = stackedListing ? 'text-left' : 'text-center xl:text-left';

  /** Compact vertical stack under award (right column on xl). */
  const cardActionBtnBase = `w-full rounded-lg px-2.5 py-1.5 text-center text-xs font-semibold text-white transition ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;
  const cardActionSaveClass = `${cardActionBtnBase} ${SCHOLARSHIP_ACTION_FILL}`;
  const cardActionSavedClass = `${cardActionBtnBase} ${SCHOLARSHIP_ACTION_FILL_PRESSED}`;

  const amountRaw = scholarship.amount ?? scholarship.awardAmount;
  const hasAmount =
    amountRaw != null && String(amountRaw).trim() !== '';
  const amount = hasAmount
    ? formatScholarshipAwardDisplay(String(amountRaw).trim())
    : '';

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
      <p className="break-words text-sm font-semibold leading-snug text-gray-900 sm:text-[0.9375rem]">
        {requirementsMetric}
      </p>
      <p className={`${METRIC_LABEL} text-left`}>Requirements</p>
    </>
  );

  const requirementsStackedUnderDeadline = (
    <div className="mt-2 min-w-0 text-left">{requirementsMetricInner}</div>
  );

  const requirementsXlRow = (
    <div className="min-w-0 border-t border-gray-200 pt-3 text-left xl:border-0 xl:pt-0 xl:col-start-2 xl:row-start-2 xl:self-center">
      {requirementsMetricInner}
    </div>
  );

  const summaryLine =
    scholarship.summaryShort?.trim() || requirementsSummary;

  const { visible: catalogChips, overflow: catalogOverflow } =
    scholarshipCardChips(scholarship);
  const payoutLine = payoutMethodChipLabel(scholarship.payoutMethod);

  const hasApplicants =
    scholarship.applicantCount != null &&
    !Number.isNaN(scholarship.applicantCount);

  const providerLine = scholarship.provider?.trim() || '';

  const deadlineTooltipText = formatDeadlineTooltipText(scholarship);

  const matchScore = scholarship.matchScore;
  const showMatchBlock =
    showPersonalizedMatch && matchScore != null && matchScore > 0;
  const matchTier =
    showMatchBlock && matchScore != null ? matchTierLabel(matchScore) : null;

  const showBadgeRow =
    scholarship.recurring ||
    Boolean(scholarship.credibilityLabel?.trim());

  const awardCell = hasAmount ? amount : '—';

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

  return (
    <article className="group relative flex w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-lg focus-within:border-gray-300 focus-within:shadow-lg">
      <Link
        href={detailHref}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/55"
        aria-label={`View scholarship: ${scholarship.title}`}
      >
        <span className="sr-only">Open scholarship details</span>
      </Link>
      <div
        className="relative z-[1] w-1.5 shrink-0 self-stretch rounded-l-[0.75rem] bg-gray-900 pointer-events-none"
        aria-hidden
      />

      <div className={`${gridShell} relative z-[1] pointer-events-none`}>
        <div className={titleCell}>
          <div className="flex min-w-0 items-center justify-between gap-2 text-xs font-medium text-gray-500 sm:text-[13px]">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
                <>
                  <Info
                    className="h-3.5 w-3.5 shrink-0 text-gray-400"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{providerLine}</span>
                </>
              ) : null}
              {scholarship.verified ? (
                <span
                  className="pointer-events-none shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/70"
                >
                  Verified
                </span>
              ) : null}
            </div>
            {isUnread ? (
              <span
                className="pointer-events-none shrink-0 rounded-md bg-[#FF7A1A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                aria-label="New — not opened yet"
              >
                NEW
              </span>
            ) : null}
          </div>
          <h2
            className="mt-1 min-w-0 overflow-hidden text-base font-semibold leading-snug tracking-tight text-gray-900 group-hover:text-gray-800 sm:text-[1.0625rem] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
            title={scholarship.title}
          >
            {scholarship.title}
          </h2>
          <p
            className="mt-1 min-w-0 overflow-hidden text-[0.8125rem] leading-relaxed text-gray-400 sm:text-sm [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
            title={summaryLine}
          >
            {summaryLine}
          </p>
          {hasApplicants ? (
            <p
              className="mt-1.5 min-w-0 truncate text-xs tabular-nums text-gray-500"
              title={applicantsTitle}
            >
              <span className="font-medium text-gray-700">
                {scholarship.applicantCount!.toLocaleString()}
              </span>{' '}
              applicants
              {scholarship.applicantsCountIsEstimated ? ' (est.)' : ''}
            </p>
          ) : null}
          {showMatchBlock && matchTier ? (
            <div className="mt-2 space-y-1 rounded-lg border border-gray-100 bg-gray-50/90 px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${matchTier.className}`}
                >
                  <span aria-hidden>{matchTier.emoji}</span>
                  {matchTier.label}
                </span>
                <span className="text-sm font-semibold tabular-nums text-gray-900">
                  Match: {matchScore}%
                </span>
              </div>
              {scholarship.matchReasons && scholarship.matchReasons.length > 0 ? (
                <ul className="list-disc space-y-0.5 pl-4 text-xs leading-snug text-gray-500">
                  {scholarship.matchReasons.slice(0, 4).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {showBadgeRow ? (
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
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

        <div className={deadlineBlockWrap}>
          <div
            className={deadlineInner}
            title={hasDeadline ? deadlineTooltipText : undefined}
          >
            {hasDeadline ? (
              <div className={metricTextAlign}>
                <p className="min-w-0 break-words text-sm font-semibold tabular-nums leading-snug text-gray-900 sm:text-[0.9375rem]">
                  {deadlineParts.primary}
                </p>
                {deadlineParts.secondary ? (
                  <p className="mt-0.5 text-[11px] font-medium leading-snug text-gray-500 sm:text-xs">
                    {deadlineParts.secondary}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className={metricTextAlign}>
                <p className="text-sm font-semibold text-gray-400">—</p>
              </div>
            )}
          </div>
          {stackedListing ? requirementsStackedUnderDeadline : null}
        </div>

        {stackedListing ? null : requirementsXlRow}

        <div className={awardMetricsWrap}>
          <div className={awardMetricAlign}>
            <p
              className={`min-w-0 break-words text-sm font-semibold tabular-nums leading-snug text-gray-900 sm:text-[0.9375rem] ${
                !hasAmount ? 'text-gray-400' : ''
              }`}
            >
              {awardCell}
            </p>
            <p className={METRIC_LABEL}>Award Amount</p>
            {payoutLine ? (
              <p
                className={`mt-1 text-[11px] font-medium text-gray-500 ${awardMetricAlignTight}`}
              >
                {payoutLine}
              </p>
            ) : null}
          </div>
          {stackedListing && showCardActions ? (
            <div className={cardActionsWrap}>{cardActionControls}</div>
          ) : null}
        </div>

        {!stackedListing && showCardActions ? (
          <div className={cardActionsWrap}>{cardActionControls}</div>
        ) : null}

        {catalogChips.length > 0 || catalogOverflow > 0 ? (
          <div
            className="col-span-full flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-gray-200 pt-2.5 xl:row-start-3"
            aria-label="Scholarship tags"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              {catalogChips.map((c) => (
                <span
                  key={c.key}
                  className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200/80"
                >
                  {c.label}
                </span>
              ))}
              {catalogOverflow > 0 ? (
                <span className="shrink-0 text-[10px] font-semibold text-gray-500">
                  +{catalogOverflow} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
