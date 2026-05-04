'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { Info, Lock, Star } from 'lucide-react';
import {
  formatDeadlineTooltipText,
  getScholarshipDeadlineDisplayParts,
  resolveScholarshipCardAwardDisplay,
  scholarshipPublicPath,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import {
  buildScholarshipTagHubHref,
  scholarshipCatalogChipHubHref
} from '@/app/scholarships/scholarshipTagHubLinks';
import {
  scholarshipApplicantCountrySeoHref,
  scholarshipHostCountrySeoHref
} from '@/app/scholarships/scholarshipCountrySeo';
import {
  SCHOLARSHIP_ACTION_FILL,
  SCHOLARSHIP_ACTION_FILL_PRESSED,
  SCHOLARSHIP_ACTION_FOCUS_VISIBLE,
  SCHOLARSHIP_PROVIDER_OBSCURE_CLASS
} from '@/lib/constants/scholarshipActionUi';
import {
  renderTextWithObscuredPhrases,
  renderTextWithObscuredProviderName
} from '@/lib/scholarships/renderObscuredProviderText';
import {
  getScholarshipCatalog,
  payoutMethodChipLabel,
  scholarshipCardChips
} from '@/lib/scholarships/scholarshipCatalog';
import {
  isSubscriptionLockedScholarship,
  pickScholarshipLockedTitleBlurPhrase
} from '@/lib/scholarships/subscriptionLockedCategory';
import {
  countryLabelFromCode,
  dedupeHostCountryCodesForDisplay
} from '@/lib/scholarships/countryEligibility/countries';
import { scholarshipDeadlineHasPassed } from '@/lib/scholarships/similarScholarships';
import {
  recordScholarshipDetailFreeNavigation,
  resolveScholarshipDetailClickBudgetMode,
  shouldBlockScholarshipDetailNavigation
} from '@/lib/scholarships/guestScholarshipDetailClickBudget';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';
import ScholarshipCatalogChipRow from '@/components/scholarships/ScholarshipCatalogChipRow';
import { ScholarshipExpiredBadge } from '@/components/scholarships/ScholarshipExpiredBadge';
import { StudyInHostCountriesPopover } from '@/components/scholarships/StudyInHostCountriesPopover';

type ScholarshipCardProps = {
  scholarship: Scholarship;
  isUnread?: boolean;
  badgeLabelOverride?: string | null;
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
   * Single-column stack (award / deadline / actions below title) regardless of viewport.
   * Use inside narrow containers (e.g. landing preview) where `xl:` grid would break layout.
   */
  stackedListing?: boolean;
  /** Signed-in user without active subscription. */
  subscriptionLocked?: boolean;
  isAuthenticated?: boolean;
  hasSubscription?: boolean;
  /** Hub listing tab — used for Hot Deadlines lock affordance. */
  listingTab?: ScholarshipListTabId;
  /** Open subscription modal when premium category chip is clicked. */
  onSubscriptionLockedCategoryClick?: (categoryId: string) => void;
  /** Open the dedicated subscription modal for always-locked grant categories. */
  onLockedScholarshipNavigate?: () => void;
  onSubscriptionDetailNavigate?: () => void;
  /**
   * Guest-only: after ten free navigations to scholarship details,
   * the next click opens the parent’s registration modal instead of navigating.
   */
  onGuestDetailNavigate?: () => void;
  /** Active applicant country filter, used to make the card badge match user intent. */
  selectedApplicantCountryCodes?: Set<string>;
  /** Optional listing URL used by the detail page Back link. */
  returnToHref?: string;
};

const METRIC_LABEL =
  'mt-1 text-[10px] font-normal leading-snug text-gray-500 sm:text-[11px] sm:normal-case';

type ScholarshipCardChip = {
  key: string;
  label: string;
};

type ScholarshipCardBadge = {
  key: string;
  text: string;
  title: string;
  /** Present when `key === 'grant-location-multi'` — sorted unique ISO2 host codes. */
  hostCodes?: string[];
};

function replaceSummaryDollarAwardWithSourceCurrency(
  summary: string,
  scholarship: Scholarship,
  awardDisplay: string,
  hasAwardContent: boolean
): string {
  if (!hasAwardContent) return summary;
  const rawAward = (scholarship.amount ?? scholarship.awardAmount)?.trim();
  const currency = scholarship.awardCurrency?.trim().toUpperCase();
  const hasSourceCurrency =
    Boolean(rawAward && /\b[A-Z]{3}\b/.test(rawAward)) ||
    Boolean(currency && currency !== 'USD');
  if (!hasSourceCurrency) return summary;
  return summary.replace(/(?:\bUS\s*)?\$[\d,.\s]+(?:\s+USD)?/g, awardDisplay);
}

export default function ScholarshipCard({
  scholarship,
  isUnread = false,
  badgeLabelOverride,
  saved,
  onToggleSave,
  onHide,
  ignoreAction = 'hide',
  showCardActions = true,
  stackedListing = false,
  subscriptionLocked = false,
  isAuthenticated = false,
  hasSubscription = false,
  listingTab,
  onSubscriptionLockedCategoryClick,
  onLockedScholarshipNavigate,
  onSubscriptionDetailNavigate,
  onGuestDetailNavigate,
  selectedApplicantCountryCodes = new Set(),
  returnToHref
}: ScholarshipCardProps) {
  const detailHref = useMemo(() => {
    const base = scholarshipPublicPath(scholarship);
    const safeReturnToHref = returnToHref?.trim();
    if (!safeReturnToHref) return base;
    const params = new URLSearchParams();
    params.set('return_to', safeReturnToHref);
    return `${base}?${params.toString()}`;
  }, [scholarship, returnToHref]);
  const deadlinePassed = scholarshipDeadlineHasPassed(scholarship);
  const applicantCountryBadge = useMemo(() => {
    const codes = Array.from(
      new Set(
        (scholarship.applicantCountryCodes ?? [])
          .map((code) => code.trim().toUpperCase())
          .filter((code) => /^[A-Z]{2}$/.test(code))
      )
    ).sort();
    const dedupApplicantAgainstHostCountries = Array.from(
      new Set(
        (scholarship.hostCountryCodes ?? [])
          .map((code) => code.trim().toUpperCase())
          .filter((code) => /^[A-Z]{2}$/.test(code))
      )
    ).sort();
    if (
      scholarship.internationalFriendlyListing === true &&
      dedupApplicantAgainstHostCountries.length === 1 &&
      codes.length === 1 &&
      dedupApplicantAgainstHostCountries[0] === codes[0]
    ) {
      return null;
    }
    const selectedCodes = Array.from(selectedApplicantCountryCodes)
      .map((code) => code.trim().toUpperCase())
      .filter((code) => /^[A-Z]{2}$/.test(code));
    const selectedMatch = selectedCodes.find((code) => codes.includes(code));
    const primary = selectedMatch ?? (codes.length === 1 ? codes[0] : null);
    if (!primary) return null;
    const label = countryLabelFromCode(primary);
    const matchesSelectedCountry = selectedMatch === primary;
    return {
      code: primary,
      extraCount: Math.max(0, codes.length - 1),
      text: `Eligible: ${label}`,
      title:
        matchesSelectedCountry
          ? `Matches your country filter — eligibility tied to ${label}`
          : `Eligibility tied to applicants linked to ${label}`
    };
  }, [
    scholarship.applicantCountryCodes,
    scholarship.hostCountryCodes,
    scholarship.internationalFriendlyListing,
    selectedApplicantCountryCodes
  ]);

  const grantLocationBadge = useMemo<ScholarshipCardBadge | null>(() => {
    const hostCodes = dedupeHostCountryCodesForDisplay(
      (scholarship.hostCountryCodes ?? [])
        .map((code) => code.trim().toUpperCase())
        .filter((code) => /^[A-Z]{2}$/.test(code))
    );
    const hasStateSignal = (scholarship.stateCodes ?? []).some((code) =>
      /^[A-Z]{2}$/i.test(code.trim())
    );
    if (hostCodes.includes('US') || hasStateSignal) {
      const usLabel = countryLabelFromCode('US');
      return {
        key: 'grant-location-us',
        text: `Study in: ${usLabel}`,
        title: `Study opportunity in ${usLabel}`
      };
    }
    if (hostCodes.length === 1) {
      const label = countryLabelFromCode(hostCodes[0]!);
      return {
        key: `grant-location-${hostCodes[0]}`,
        text: `Study in: ${label}`,
        title: `Study opportunity in ${label}`
      };
    }
    if (hostCodes.length > 1) {
      return {
        key: 'grant-location-multi',
        text: `Study in: ${hostCodes.length} countries`,
        title: `Study opportunities spanning ${hostCodes.length} countries`,
        hostCodes: [...hostCodes]
      };
    }
    return null;
  }, [scholarship.hostCountryCodes, scholarship.stateCodes]);

  const grantLocationHubHref = useMemo(() => {
    if (!grantLocationBadge) return null;
    if (grantLocationBadge.key === 'grant-location-multi') return null;
    if (grantLocationBadge.key === 'grant-location-us') {
      return (
        scholarshipHostCountrySeoHref('US') ??
        buildScholarshipTagHubHref({ hostCountryCode: 'US' })
      );
    }
    const prefix = 'grant-location-';
    if (grantLocationBadge.key.startsWith(prefix)) {
      const code = grantLocationBadge.key.slice(prefix.length).toUpperCase();
      if (/^[A-Z]{2}$/.test(code)) {
        return (
          scholarshipHostCountrySeoHref(code) ??
          buildScholarshipTagHubHref({ hostCountryCode: code })
        );
      }
    }
    return null;
  }, [grantLocationBadge]);

  const hostLocationUnspecifiedBadge: ScholarshipCardBadge | null =
    !grantLocationBadge && scholarship.hostProgramLocationUnspecified
      ? {
          key: 'grant-location-unspecified',
          text: 'Host: Not specified',
          title:
            'Host/program location is not specified in the source data yet.'
        }
      : null;

  const hostLocationUnspecifiedHubHref = hostLocationUnspecifiedBadge
    ? buildScholarshipTagHubHref({ hostUnspecified: true })
    : null;

  const applicantCountryHubHref = useMemo(() => {
    if (!applicantCountryBadge) return null;
    return (
      scholarshipApplicantCountrySeoHref(applicantCountryBadge.code) ??
      buildScholarshipTagHubHref({
        appCountryCode: applicantCountryBadge.code
      })
    );
  }, [applicantCountryBadge]);

  const desktopGeoBadgeCount = [
    grantLocationBadge,
    hostLocationUnspecifiedBadge,
    applicantCountryBadge
  ].filter(Boolean).length;
  const desktopHasSingleGeoBadge = desktopGeoBadgeCount === 1;
  const tagGridClass = desktopHasSingleGeoBadge
    ? 'grid min-w-0 grid-cols-1 items-center gap-2 xl:grid-cols-[minmax(0,2.2fr)_minmax(112px,0.48fr)_minmax(164px,0.72fr)] xl:gap-x-2.5'
    : 'grid min-w-0 grid-cols-1 items-center gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:gap-x-3';
  const desktopGeoBadgesWrapClass = desktopHasSingleGeoBadge
    ? 'pointer-events-auto hidden min-w-0 justify-center gap-2 xl:col-start-3 xl:flex xl:w-[148px] xl:justify-self-start'
    : 'pointer-events-auto hidden min-w-0 justify-end gap-2 xl:flex xl:flex-nowrap xl:justify-self-end';

  const gridShell = stackedListing
    ? 'grid min-w-0 flex-1 grid-cols-1 content-start gap-x-5 gap-y-3 px-4 py-4 sm:px-5 sm:py-5'
    : 'grid min-w-0 flex-1 grid-cols-1 content-start gap-x-5 gap-y-3 px-4 py-4 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(112px,0.48fr)_minmax(164px,0.72fr)] xl:grid-rows-[auto_auto_auto] xl:gap-x-2.5 xl:gap-y-2 xl:items-start';

  /** Title spans rows 1–2 on xl so it aligns with deadline+reqs / award+actions. */
  const titleCell = stackedListing
    ? 'min-w-0 text-left'
    : 'min-w-0 text-left xl:col-start-1 xl:row-start-1 xl:row-span-2';

  /** Stacked/narrow listing only — catalog hub uses a mobile combined row + xl grid columns on inner wrappers. */
  const deadlineBlockWrap = 'min-w-0 border-t border-gray-200 pt-3';
  const awardMetricsWrap = 'min-w-0 border-t border-gray-200 pt-3';

  /** Save / Not relevant — under award when stacked; inside award row on catalog mobile. */
  const cardActionsWrap = stackedListing
    ? 'relative z-10 mt-2.5 flex w-full max-w-[148px] shrink-0 flex-col gap-1.5 self-start pointer-events-auto'
    : 'relative z-10 flex w-full max-w-[148px] shrink-0 flex-col gap-1.5 self-start pointer-events-auto xl:mt-0 xl:w-full xl:max-w-[148px] xl:self-start';

  /** Award metrics: left-aligned (reads toward deadline). */
  const awardMetricAlign = 'text-left';
  const awardMetricAlignTight = 'text-left';

  const deadlineInner = 'min-w-0';

  /** Left-aligned on all breakpoints (matches requirements / award on mobile). */
  const deadlineMetricAlign = 'text-left';

  /** Compact vertical stack under award (right column on xl). */
  const cardActionBtnBase = `w-full rounded-lg px-2.5 py-1.5 text-center text-xs font-semibold text-white transition ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;
  const cardActionSaveClass = `${cardActionBtnBase} ${SCHOLARSHIP_ACTION_FILL}`;
  const cardActionSavedClass = `${cardActionBtnBase} ${SCHOLARSHIP_ACTION_FILL_PRESSED}`;
  const countryBadgeClass =
    'inline-flex h-9 min-w-[148px] max-w-[42vw] shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-4 text-center text-xs font-extrabold tracking-tight text-orange-700 shadow-sm ring-1 ring-orange-100 xl:max-w-none xl:whitespace-nowrap';
  const locationBadgeClass =
    'inline-flex h-9 min-w-[148px] max-w-[42vw] shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white px-4 text-center text-xs font-extrabold tracking-tight text-orange-700 shadow-sm ring-1 ring-orange-100';
  const missingLocationBadgeClass =
    'inline-flex h-9 min-w-[148px] max-w-[42vw] shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 text-center text-xs font-extrabold tracking-tight text-slate-600 shadow-sm ring-1 ring-slate-100';

  const geoFilterLinkClass =
    'pointer-events-auto relative z-20 cursor-pointer no-underline transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1';

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
          deadlinePassed ? 'text-gray-600' : 'text-gray-900'
        }`}
      >
        {requirementsMetric}
      </p>
      <p className={METRIC_LABEL}>Requirements</p>
    </>
  );

  const requirementsStackedUnderDeadline = (
    <div className="mt-2 min-w-0 text-left">{requirementsMetricInner}</div>
  );

  const summaryLine =
    replaceSummaryDollarAwardWithSourceCurrency(
      scholarship.summaryShort?.trim() || requirementsSummary,
      scholarship,
      awardCell,
      hasAwardContent
    );

  const catalogChips = useMemo<ScholarshipCardChip[]>(
    () => scholarshipCardChips(scholarship).visible,
    [scholarship]
  );
  const targetedCategoryLocked =
    !hasSubscription && isSubscriptionLockedScholarship(scholarship);
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
  const showTargetedCategoryLockBadge = targetedCategoryLocked;
  const showTopRightLockBadge =
    showHotDeadlinesLockBadge ||
    showEasyApplyLockBadge ||
    showTargetedCategoryLockBadge;
  const topRightBadgeLabel =
    badgeLabelOverride?.trim() || (isUnread ? 'NEW' : null);
  const topRightBadgeAriaLabel = badgeLabelOverride?.trim()
    ? badgeLabelOverride.trim()
    : 'New - not opened yet';
  const payoutLine = payoutMethodChipLabel(scholarship.payoutMethod);

  const hasApplicants =
    scholarship.applicantCount != null &&
    !Number.isNaN(scholarship.applicantCount);

  const providerLine = scholarship.provider?.trim() || '';
  const providerSlugTrimmed = scholarship.providerSlug?.trim() ?? '';
  const providerProfileHref = providerSlugTrimmed
    ? `/providers/${encodeURIComponent(providerSlugTrimmed)}`
    : null;
  const titleBlurPhrase = targetedCategoryLocked
    ? pickScholarshipLockedTitleBlurPhrase(scholarship.title, providerLine)
    : null;

  const canSeeFullText = Boolean(isAuthenticated);
  const providerNameObscured = Boolean(providerLine) && !canSeeFullText;

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

  const handleDetailLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (targetedCategoryLocked) {
      e.preventDefault();
      onLockedScholarshipNavigate?.();
      return;
    }
    const budgetMode = !isAuthenticated
      ? resolveScholarshipDetailClickBudgetMode({
          isAuthenticated,
          hasSubscription
        })
      : null;
    const onBlockedNavigate =
      budgetMode === 'guest' || budgetMode === 'signed-in-no-subscription'
        ? onGuestDetailNavigate ?? onSubscriptionDetailNavigate
        : undefined;
    if (!budgetMode || !onBlockedNavigate) return;
    if (shouldBlockScholarshipDetailNavigation(budgetMode)) {
      e.preventDefault();
      onBlockedNavigate();
      return;
    }
    recordScholarshipDetailFreeNavigation(budgetMode);
  };

  return (
    <article className={cardArticleClass} data-scholarship-card>
      <Link
        href={detailHref}
        onClick={handleDetailLinkClick}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A1A]/50"
        aria-label={
          targetedCategoryLocked
            ? `Locked scholarship: ${scholarship.title}`
            : `View scholarship: ${scholarship.title}`
        }
      >
        <span className="sr-only">{scholarship.title}</span>
      </Link>
      <div
        className={`relative z-[1] w-1.5 shrink-0 self-stretch rounded-l-[0.75rem] pointer-events-none ${deadlinePassed ? 'bg-zinc-400' : 'bg-gray-900'}`}
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
                providerNameObscured ? (
                  <span
                    className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-gray-400"
                    aria-label="Sponsor name hidden. Sign in and start a trial to see the provider."
                  >
                    <Info className="h-3.5 w-3.5 shrink-0 text-gray-300" aria-hidden />
                    <span
                      className={`min-w-0 max-w-[min(100%,18rem)] truncate ${SCHOLARSHIP_PROVIDER_OBSCURE_CLASS}`}
                      aria-hidden
                    >
                      {providerLine}
                    </span>
                  </span>
                ) : providerProfileHref ? (
                  <Link
                    href={providerProfileHref}
                    className="group relative z-10 inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md text-gray-500 outline-none transition pointer-events-auto hover:text-emerald-700 hover:underline decoration-emerald-600/40 underline-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1"
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
                  <>
                    <Info
                      className="h-3.5 w-3.5 shrink-0 text-gray-400"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{providerLine}</span>
                  </>
                )
              ) : null}
              {scholarship.verified ? (
                <span
                  className="pointer-events-none shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/70"
                >
                  Verified
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 self-start">
              {typeof scholarship.profileMatchPercent === 'number' &&
              !Number.isNaN(scholarship.profileMatchPercent) ? (
                <span
                  className="pointer-events-none shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200/80"
                  title="Match score from your profile"
                >
                  Match: {Math.round(scholarship.profileMatchPercent)}%
                </span>
              ) : null}
              {deadlinePassed ? (
                <ScholarshipExpiredBadge />
              ) : topRightBadgeLabel ? (
                <span
                  className="pointer-events-none inline-flex h-5 shrink-0 items-center rounded-md bg-[#FF7A1A] px-2 text-[10px] font-bold uppercase leading-none tracking-wide text-white shadow-sm"
                  aria-label={topRightBadgeAriaLabel}
                >
                  {topRightBadgeLabel}
                </span>
              ) : null}
              {showTopRightLockBadge ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (showTargetedCategoryLockBadge) {
                      onLockedScholarshipNavigate?.();
                      return;
                    }
                    onSubscriptionLockedCategoryClick?.(
                      showHotDeadlinesLockBadge ? 'hot_deadlines' : 'easy_apply'
                    );
                  }}
                  className="relative z-30 inline-flex h-5 w-[34px] shrink-0 items-center justify-center rounded-md bg-[#FF7A1A] text-white shadow-sm transition hover:bg-[#E6670C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-1 pointer-events-auto"
                  title={
                    showTargetedCategoryLockBadge
                      ? 'Premium subscription required'
                      : 'Start your free access to unlock this category'
                  }
                  aria-label={
                    showTargetedCategoryLockBadge
                      ? 'Locked scholarship category. Open subscription plans.'
                      : 'Locked category. Start free access to unlock.'
                  }
                >
                  <Lock className="h-3 w-3" strokeWidth={2.2} aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
          <h2
            className={`mt-1 min-w-0 overflow-hidden text-base font-semibold leading-snug tracking-tight sm:text-[1.0625rem] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
              deadlinePassed
                ? 'text-gray-600 group-hover:text-gray-600'
                : 'text-gray-900 group-hover:text-gray-800'
            }`}
            title={
              providerNameObscured
                ? 'Scholarship title — sponsor name may be obscured until you subscribe.'
                : targetedCategoryLocked && titleBlurPhrase
                  ? 'Scholarship title preview. Upgrade to reveal the full program name.'
                  : scholarship.title
            }
          >
            <Link
              href={detailHref}
              onClick={handleDetailLinkClick}
              className="relative z-10 text-inherit no-underline outline-none pointer-events-auto focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/50 focus-visible:ring-offset-2"
            >
              {targetedCategoryLocked && titleBlurPhrase
                ? renderTextWithObscuredPhrases(scholarship.title, [titleBlurPhrase], {
                    blurEntireWhenNoSubstringMatch: false,
                    lockedObscuredInteractive: false
                  })
                : providerNameObscured
                ? renderTextWithObscuredProviderName(scholarship.title, providerLine, {
                    blurEntireWhenNoSubstringMatch: false
                  })
                : scholarship.title}
            </Link>
          </h2>
          <p
            className="mt-1 min-w-0 overflow-hidden text-[0.8125rem] leading-relaxed text-gray-400 sm:text-sm [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
            title={
              providerNameObscured
                ? 'Summary preview. Sponsor name is hidden until you subscribe.'
                : summaryLine
            }
            aria-label={
              providerNameObscured
                ? 'Scholarship summary. Sponsor name in the text is obscured until you subscribe.'
                : undefined
            }
          >
            {providerNameObscured
              ? renderTextWithObscuredProviderName(summaryLine, providerLine, {
                  blurEntireWhenNoSubstringMatch: false
                })
              : summaryLine}
          </p>
          {hasApplicants ? (
            <p
              className="mt-1.5 min-w-0 truncate text-xs tabular-nums text-gray-500"
              title={applicantsTitle}
            >
              <span className="font-medium text-gray-700">
                {scholarship.applicantCount!.toLocaleString('en-US')}
              </span>{' '}
              applicants
              {scholarship.applicantsCountIsEstimated ? ' (est.)' : ''}
            </p>
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

        {stackedListing ? (
          <>
            <div className={deadlineBlockWrap}>
              <div
                className={deadlineInner}
                title={hasDeadline ? deadlineTooltipText : undefined}
              >
                {hasDeadline ? (
                  <div className={deadlineMetricAlign}>
                    <p
                      className={`min-w-0 break-words text-sm font-semibold tabular-nums leading-snug sm:text-[0.9375rem] ${
                        deadlinePassed ? 'text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {deadlineParts.primary}
                    </p>
                    {deadlineParts.secondary ? (
                      <p
                        className={`mt-0.5 text-[11px] font-medium leading-snug sm:text-xs ${
                          deadlinePassed ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        {deadlineParts.secondary}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className={deadlineMetricAlign}>
                    <p className="text-sm font-semibold text-gray-400">—</p>
                  </div>
                )}
              </div>
              {requirementsStackedUnderDeadline}
            </div>
            <div className={awardMetricsWrap}>
              <div className={awardMetricAlign}>
                <p
                  title={awardLine.lineTitle}
                  className={`min-w-0 max-w-full truncate text-sm font-semibold leading-snug sm:text-[0.9375rem] ${
                    awardLine.isNumeric ? 'tabular-nums' : ''
                  } ${
                    !hasAwardContent
                      ? 'text-gray-400'
                      : deadlinePassed
                        ? 'text-gray-600'
                        : 'text-gray-900'
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
              {showCardActions ? (
                <div className={cardActionsWrap}>{cardActionControls}</div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="col-span-full space-y-3 border-t border-gray-200 pt-3 xl:hidden">
              <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
                <div className={`min-w-0 flex-1 ${awardMetricAlign}`}>
                  <p
                    title={awardLine.lineTitle}
                    className={`min-w-0 max-w-full truncate text-sm font-semibold leading-snug sm:text-[0.9375rem] ${
                      awardLine.isNumeric ? 'tabular-nums' : ''
                    } ${
                      !hasAwardContent
                        ? 'text-gray-400'
                        : deadlinePassed
                          ? 'text-gray-600'
                          : 'text-gray-900'
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
                <div
                  className={`${deadlineInner} min-w-0 max-w-[min(11rem,52%)] shrink-0 text-right`}
                  title={hasDeadline ? deadlineTooltipText : undefined}
                >
                  {hasDeadline ? (
                    <div className="text-right">
                      <p
                        className={`min-w-0 break-words text-sm font-semibold tabular-nums leading-snug sm:text-[0.9375rem] ${
                          deadlinePassed ? 'text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {deadlineParts.primary}
                      </p>
                      {deadlineParts.secondary ? (
                        <p
                          className={`mt-0.5 text-[11px] font-medium leading-snug sm:text-xs ${
                            deadlinePassed ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {deadlineParts.secondary}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-400">—</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0 flex-1 text-left">
                  {requirementsMetricInner}
                </div>
                {showCardActions ||
                applicantCountryBadge ||
                grantLocationBadge ||
                hostLocationUnspecifiedBadge ? (
                  <div className="relative z-10 flex w-full max-w-[148px] shrink-0 flex-col items-end gap-2 self-start pointer-events-auto">
                    {showCardActions ? (
                      <div className={cardActionsWrap}>{cardActionControls}</div>
                    ) : null}
                    {grantLocationBadge ||
                    hostLocationUnspecifiedBadge ||
                    applicantCountryBadge ? (
                      <div className="flex max-w-[calc(100vw-3rem)] flex-nowrap justify-end gap-2 self-end">
                        {applicantCountryBadge ? (
                          applicantCountryHubHref ? (
                            <Link
                              href={applicantCountryHubHref}
                              className={`${countryBadgeClass} ${geoFilterLinkClass} max-w-none whitespace-nowrap`}
                              title={`${applicantCountryBadge.title} — browse matching scholarships`}
                              aria-label={`Browse scholarships filtered by ${applicantCountryBadge.text}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {applicantCountryBadge.text}
                            </Link>
                          ) : (
                            <span
                              className={`${countryBadgeClass} max-w-none whitespace-nowrap`}
                              title={applicantCountryBadge.title}
                              aria-label={applicantCountryBadge.title}
                            >
                              {applicantCountryBadge.text}
                            </span>
                          )
                        ) : null}
                        {grantLocationBadge ? (
                          grantLocationHubHref ? (
                            <Link
                              href={grantLocationHubHref}
                              className={`${locationBadgeClass} ${geoFilterLinkClass} min-w-0 max-w-none whitespace-nowrap`}
                              title={`${grantLocationBadge.title} — browse matching scholarships`}
                              aria-label={`Browse scholarships filtered by ${grantLocationBadge.text}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="truncate">{grantLocationBadge.text}</span>
                            </Link>
                          ) : grantLocationBadge.key === 'grant-location-multi' &&
                            grantLocationBadge.hostCodes &&
                            grantLocationBadge.hostCodes.length > 1 ? (
                            <StudyInHostCountriesPopover
                              hostCodes={grantLocationBadge.hostCodes}
                              triggerText={grantLocationBadge.text}
                              title={grantLocationBadge.title}
                              className={`${locationBadgeClass} ${geoFilterLinkClass} inline-flex min-w-0 max-w-none cursor-pointer whitespace-nowrap transition hover:border-orange-300 hover:bg-orange-50/80 hover:shadow`}
                            />
                          ) : (
                            <span
                              className={`${locationBadgeClass} min-w-0 max-w-none whitespace-nowrap`}
                              title={grantLocationBadge.title}
                              aria-label={grantLocationBadge.title}
                            >
                              <span className="truncate">{grantLocationBadge.text}</span>
                            </span>
                          )
                        ) : null}
                        {hostLocationUnspecifiedBadge ? (
                          <Link
                            href={hostLocationUnspecifiedHubHref!}
                            className={`${missingLocationBadgeClass} ${geoFilterLinkClass} min-w-0 max-w-none whitespace-nowrap`}
                            title={`${hostLocationUnspecifiedBadge.title} — browse matching scholarships`}
                            aria-label={`Browse scholarships filtered by ${hostLocationUnspecifiedBadge.text}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate">{hostLocationUnspecifiedBadge.text}</span>
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="hidden min-w-0 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:block xl:self-start xl:border-0 xl:pt-0">
              <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:gap-3 xl:flex-col xl:items-stretch xl:gap-2">
                <div
                  className={`${deadlineInner} min-w-0 flex-1`}
                  title={hasDeadline ? deadlineTooltipText : undefined}
                >
                  {hasDeadline ? (
                    <div className={deadlineMetricAlign}>
                      <p
                        className={`min-w-0 break-words text-sm font-semibold tabular-nums leading-snug sm:text-[0.9375rem] ${
                          deadlinePassed ? 'text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {deadlineParts.primary}
                      </p>
                      {deadlineParts.secondary ? (
                        <p
                          className={`mt-0.5 text-[11px] font-medium leading-snug sm:text-xs ${
                            deadlinePassed ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {deadlineParts.secondary}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className={deadlineMetricAlign}>
                      <p className="text-sm font-semibold text-gray-400">—</p>
                    </div>
                  )}
                </div>
                <div className="min-w-0 max-w-[min(11rem,46%)] shrink-0 text-right xl:max-w-none xl:w-full xl:shrink xl:text-left">
                  {requirementsMetricInner}
                </div>
              </div>
            </div>
            <div className="hidden min-w-0 xl:col-start-3 xl:row-start-1 xl:row-span-2 xl:block xl:w-full xl:max-w-[200px] xl:justify-self-start xl:self-start xl:border-0 xl:pt-0">
              <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:gap-3 xl:flex-col xl:items-stretch xl:gap-2">
                <div className={`min-w-0 flex-1 ${awardMetricAlign}`}>
                  <p
                    title={awardLine.lineTitle}
                    className={`min-w-0 max-w-full truncate text-sm font-semibold leading-snug sm:text-[0.9375rem] ${
                      awardLine.isNumeric ? 'tabular-nums' : ''
                    } ${
                      !hasAwardContent
                        ? 'text-gray-400'
                        : deadlinePassed
                          ? 'text-gray-600'
                          : 'text-gray-900'
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
                {showCardActions ? (
                  <div className={cardActionsWrap}>{cardActionControls}</div>
                ) : null}
              </div>
            </div>
          </>
        )}

        {catalogChips.length > 0 ||
        applicantCountryBadge ||
        grantLocationBadge ||
        hostLocationUnspecifiedBadge ? (
          <div
            className="col-span-full min-w-0 border-t border-gray-200 pt-2.5 pointer-events-auto xl:row-start-3"
            aria-label="Scholarship tags"
          >
            <div className={tagGridClass}>
              <div className="min-w-0 pointer-events-auto">
                <ScholarshipCatalogChipRow
                  chips={catalogChips}
                  getChipHref={scholarshipCatalogChipHubHref}
                />
              </div>
              <div className={desktopGeoBadgesWrapClass}>
                {applicantCountryBadge ? (
                  applicantCountryHubHref ? (
                    <Link
                      href={applicantCountryHubHref}
                      className={`${countryBadgeClass} ${geoFilterLinkClass}`}
                      title={`${applicantCountryBadge.title} — browse matching scholarships`}
                      aria-label={`Browse scholarships filtered by ${applicantCountryBadge.text}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {applicantCountryBadge.text}
                    </Link>
                  ) : (
                    <span
                      className={countryBadgeClass}
                      title={applicantCountryBadge.title}
                      aria-label={applicantCountryBadge.title}
                    >
                      {applicantCountryBadge.text}
                    </span>
                  )
                ) : null}
                {grantLocationBadge ? (
                  grantLocationHubHref ? (
                    <Link
                      href={grantLocationHubHref}
                      className={`${locationBadgeClass} ${geoFilterLinkClass}`}
                      title={`${grantLocationBadge.title} — browse matching scholarships`}
                      aria-label={`Browse scholarships filtered by ${grantLocationBadge.text}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate">{grantLocationBadge.text}</span>
                    </Link>
                  ) : grantLocationBadge.key === 'grant-location-multi' &&
                    grantLocationBadge.hostCodes &&
                    grantLocationBadge.hostCodes.length > 1 ? (
                    <StudyInHostCountriesPopover
                      hostCodes={grantLocationBadge.hostCodes}
                      triggerText={grantLocationBadge.text}
                      title={grantLocationBadge.title}
                      className={`${locationBadgeClass} ${geoFilterLinkClass} inline-flex cursor-pointer transition hover:border-orange-300 hover:bg-orange-50/80 hover:shadow`}
                    />
                  ) : (
                    <span
                      className={locationBadgeClass}
                      title={grantLocationBadge.title}
                      aria-label={grantLocationBadge.title}
                    >
                      <span className="truncate">{grantLocationBadge.text}</span>
                    </span>
                  )
                ) : null}
                {hostLocationUnspecifiedBadge ? (
                  <Link
                    href={hostLocationUnspecifiedHubHref!}
                    className={`${missingLocationBadgeClass} ${geoFilterLinkClass}`}
                    title={`${hostLocationUnspecifiedBadge.title} — browse matching scholarships`}
                    aria-label={`Browse scholarships filtered by ${hostLocationUnspecifiedBadge.text}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate">{hostLocationUnspecifiedBadge.text}</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
