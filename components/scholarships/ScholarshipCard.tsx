'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { extractLocaleFromPath } from '@/lib/i18n/paths';
import {
  localizedHubCatalogBrowserPath,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';
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
  buildScholarshipProviderBlurPhrases,
  renderTextWithObscuredPhrases
} from '@/lib/scholarships/renderObscuredProviderText';
import {
  getScholarshipCatalog,
  payoutMethodChipLabel,
  scholarshipCardChips
} from '@/lib/scholarships/scholarshipCatalog';
import {
  resolveScholarshipProviderNameLocked,
  resolveScholarshipTargetedCategoryLocked
} from '@/lib/scholarships/scholarshipObscuring';
import {
  isSubscriptionLockedScholarship,
  pickScholarshipLockedTitleBlurPhrase
} from '@/lib/scholarships/subscriptionLockedCategory';
import {
  countryLabelFromCode,
  dedupeHostCountryCodesForDisplay
} from '@/lib/scholarships/countryEligibility/countries';
import { getScholarshipsHubUiCopy } from '@/lib/i18n/scholarshipsHubUiCopy';
import {
  getLocalizedCatalogChipLabel,
  getLocalizedCountryLabel
} from '@/lib/i18n/taxonomyLabels';
import {
  getLocalizedBestForPhrase,
  getLocalizedScholarshipDifficultyLevel,
  getLocalizedScholarshipSourceShortLabel
} from '@/lib/i18n/providerDisplayLabels';
import { scholarshipDeadlineHasPassed } from '@/lib/scholarships/similarScholarships';
import {
  resolveScholarshipDetailClickBudgetMode,
  shouldBlockScholarshipDetailNavigation
} from '@/lib/scholarships/guestScholarshipDetailClickBudget';
import {
  buildScholarshipCardSnippet,
  getScholarshipApplicationDifficulty,
  getScholarshipBestForLabel,
  getScholarshipSourceStatus
} from '@/lib/seo/scholarshipSeoQualityPolicy';
import { SHOW_SCHOLARSHIP_APPLICANT_COUNT_UI } from '@/lib/constants/scholarshipApplicantCountUi';
import {
  SHOW_SCHOLARSHIP_CARD_EFFORT_BADGE,
  SHOW_SCHOLARSHIP_CARD_SOURCE_SIGNAL_BADGE
} from '@/lib/constants/scholarshipCardIntelligenceBadgeUi';
import { SHOW_SCHOLARSHIP_CARD_REQUIREMENTS_METRIC } from '@/lib/constants/scholarshipCardRequirementsMetricUi';
import { dismissRouteProgress } from '@/lib/navigation/dismissRouteProgress';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';
import type { ScholarshipsHubUiCopy } from '@/lib/i18n/scholarshipsHubUiCopy';
import ScholarshipCatalogChipRow from '@/components/scholarships/ScholarshipCatalogChipRow';
import { ScholarshipExpiredBadge } from '@/components/scholarships/ScholarshipExpiredBadge';
import { StudyInHostCountriesPopover } from '@/components/scholarships/StudyInHostCountriesPopover';

type ScholarshipCardProps = {
  scholarship: Scholarship;
  cardCopy?: ScholarshipsHubUiCopy['card'];
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
  /** Any user without active subscription: all scholarship detail navigation is paywalled. */
  subscriptionLocked?: boolean;
  isAuthenticated?: boolean;
  hasSubscription?: boolean;
  /**
   * When `false`, avoid treating a signed-in user as a guest for detail-click
   * budget until auth/subscription has finished resolving.
   * @default true
   */
  authResolved?: boolean;
  /** Hub listing tab — used for Hot Deadlines lock affordance. */
  listingTab?: ScholarshipListTabId;
  /**
   * Main `/scholarships` catalog grid: intelligence badges span the full card width on xl
   * instead of staying inside the narrow title column.
   */
  hubCatalogListing?: boolean;
  /** Open subscription modal when premium category chip is clicked. */
  onSubscriptionLockedCategoryClick?: (categoryId: string) => void;
  /** Open the dedicated subscription modal for always-locked grant categories. */
  onLockedScholarshipNavigate?: () => void;
  onSubscriptionDetailNavigate?: () => void;
  /**
   * Guests and signed-in free tier: no free detail opens — parent shows the payment wall
   * (`grant-guest` / `card-unlock`). Subscribers navigate normally.
   */
  onGuestDetailNavigate?: () => void;
  /**
   * Signed-in, no subscription: email not confirmed — block detail navigation and open parent modal.
   */
  needsEmailConfirmation?: boolean;
  onUnverifiedEmailDetailNavigate?: () => void;
  /** Active applicant country filter, used to make the card badge match user intent. */
  selectedApplicantCountryCodes?: Set<string>;
  /** Optional listing URL used by the detail page Back link. */
  returnToHref?: string;
};

const METRIC_LABEL =
  'mt-1 text-[10px] font-normal leading-snug text-gray-500 sm:text-[11px] sm:normal-case';

/**
 * `nextjs-toploader` attaches a bubbling `document` click listener that calls `NProgress.start()`
 * without checking `defaultPrevented`. Blocked `<Link>` navigations still trigger it; flush after
 * the event stack so the orange bar does not run until route completion times out.
 */
function dismissTopLoaderAfterBlockedDetailNavigation(): void {
  window.setTimeout(() => dismissRouteProgress(), 0);
}

function AuthNoSubBlurUnlock({
  onUnlock,
  label
}: {
  onUnlock: () => void;
  label: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center rounded-md bg-white/45 backdrop-blur-[5px]">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUnlock();
        }}
        className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 shadow-md transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        aria-label={label}
      >
        <Lock className="h-5 w-5" strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}

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

const DEFAULT_CARD_COPY = getScholarshipsHubUiCopy('en').card;

export default function ScholarshipCard({
  scholarship,
  cardCopy,
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
  authResolved = true,
  listingTab,
  hubCatalogListing = false,
  onSubscriptionLockedCategoryClick,
  onLockedScholarshipNavigate,
  onSubscriptionDetailNavigate,
  onGuestDetailNavigate,
  needsEmailConfirmation = false,
  onUnverifiedEmailDetailNavigate,
  selectedApplicantCountryCodes = new Set(),
  returnToHref
}: ScholarshipCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const uiLocale = useMemo((): LocalizedUiLocale => {
    const fromPath = extractLocaleFromPath(pathname ?? '/');
    if (fromPath && isStage2PilotLocale(fromPath)) return fromPath;
    if (typeof window !== 'undefined') {
      const fromWindow = extractLocaleFromPath(window.location.pathname);
      if (fromWindow && isStage2PilotLocale(fromWindow)) return fromWindow;
    }
    return 'en';
  }, [pathname]);
  const cardChrome = useMemo(
    () => ({ ...getScholarshipsHubUiCopy(uiLocale).card, ...cardCopy }),
    [uiLocale, cardCopy]
  );
  const countryLabel = useCallback(
    (code: string) =>
      uiLocale === 'en'
        ? countryLabelFromCode(code)
        : getLocalizedCountryLabel(code, uiLocale, countryLabelFromCode(code)),
    [uiLocale]
  );
  const prefixHubHref = useCallback(
    (href: string | null): string | null => {
      if (!href || uiLocale === 'en') return href;
      const [pathPart, ...rest] = href.split(/(?=[?#])/);
      const localized = localizedHubCatalogBrowserPath(
        uiLocale,
        pathPart ?? href
      );
      return `${localized}${rest.join('')}`;
    },
    [uiLocale]
  );
  const detailHref = useMemo(() => {
    const base = scholarshipPublicPath(scholarship);
    const safeReturnToHref = returnToHref?.trim();
    if (!safeReturnToHref) return base;
    const params = new URLSearchParams();
    params.set('return_to', safeReturnToHref);
    return `${base}?${params.toString()}`;
  }, [scholarship, returnToHref]);
  /** Avoid RSC prefetch of detail route while confirmation modal blocks navigation. */
  const blockDetailPrefetchForEmailGate =
    needsEmailConfirmation && isAuthenticated && !hasSubscription;
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
    const label = countryLabel(primary);
    const matchesSelectedCountry = selectedMatch === primary;
    return {
      code: primary,
      extraCount: Math.max(0, codes.length - 1),
      text: `Eligible: ${label}`,
      title: matchesSelectedCountry
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
      const usLabel = countryLabel('US');
      return {
        key: 'grant-location-us',
        text: `${cardChrome.studyInPrefix} ${usLabel}`,
        title: `Study opportunity in ${usLabel}`
      };
    }
    if (hostCodes.length === 1) {
      const label = countryLabel(hostCodes[0]!);
      return {
        key: `grant-location-${hostCodes[0]}`,
        text: `${cardChrome.studyInPrefix} ${label}`,
        title: `Study opportunity in ${label}`
      };
    }
    if (hostCodes.length > 1) {
      return {
        key: 'grant-location-multi',
        text: cardChrome.studyInMulti(hostCodes.length),
        title: `Study opportunities spanning ${hostCodes.length} countries`,
        hostCodes: [...hostCodes]
      };
    }
    return null;
  }, [
    scholarship.hostCountryCodes,
    scholarship.stateCodes,
    cardChrome,
    countryLabel
  ]);

  const grantLocationHubHrefRaw = useMemo(() => {
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
  const grantLocationHubHref = useMemo(
    () => prefixHubHref(grantLocationHubHrefRaw),
    [grantLocationHubHrefRaw, prefixHubHref]
  );

  const hostLocationUnspecifiedBadge: ScholarshipCardBadge | null =
    !grantLocationBadge && scholarship.hostProgramLocationUnspecified
      ? {
          key: 'grant-location-unspecified',
          text: cardChrome.hostNotSpecified,
          title: cardChrome.hostNotSpecifiedTitle
        }
      : null;

  const hostLocationUnspecifiedHubHref = hostLocationUnspecifiedBadge
    ? prefixHubHref(buildScholarshipTagHubHref({ hostUnspecified: true }))
    : null;

  const applicantCountryHubHrefRaw = useMemo(() => {
    if (!applicantCountryBadge) return null;
    return (
      scholarshipApplicantCountrySeoHref(applicantCountryBadge.code) ??
      buildScholarshipTagHubHref({
        appCountryCode: applicantCountryBadge.code
      })
    );
  }, [applicantCountryBadge]);
  const applicantCountryHubHref = useMemo(
    () => prefixHubHref(applicantCountryHubHrefRaw),
    [applicantCountryHubHrefRaw, prefixHubHref]
  );

  const showGeoBadges = Boolean(
    grantLocationBadge || hostLocationUnspecifiedBadge || applicantCountryBadge
  );

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
    ? 'pointer-events-auto hidden min-w-0 flex-col items-stretch gap-2 xl:col-start-3 xl:flex xl:w-full xl:max-w-[200px] xl:justify-self-start'
    : 'pointer-events-auto hidden min-w-0 flex-row flex-wrap items-center justify-end gap-2 xl:flex xl:w-auto xl:max-w-[min(100%,28rem)] xl:justify-self-end';

  const gridShell = stackedListing
    ? 'grid min-w-0 flex-1 grid-cols-1 content-start gap-x-5 gap-y-3.5 px-4 py-4 sm:px-5 sm:py-5'
    : hubCatalogListing
      ? 'grid min-w-0 flex-1 grid-cols-1 content-start gap-x-5 gap-y-3.5 px-4 py-4 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(112px,0.48fr)_minmax(164px,0.72fr)] xl:grid-rows-[auto_auto_auto] xl:gap-x-2.5 xl:gap-y-2 xl:items-start'
      : 'grid min-w-0 flex-1 grid-cols-1 content-start gap-x-5 gap-y-3.5 px-4 py-4 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(112px,0.48fr)_minmax(164px,0.72fr)] xl:grid-rows-[auto_auto_auto] xl:gap-x-2.5 xl:gap-y-2.5 xl:items-start';

  /** Title spans rows 1–2 on xl so it aligns with deadline+reqs / award+actions. */
  const titleCell = stackedListing
    ? 'min-w-0 text-left'
    : hubCatalogListing
      ? 'min-w-0 text-left xl:col-start-1 xl:row-start-1 xl:row-span-1'
      : 'min-w-0 text-left xl:col-start-1 xl:row-start-1 xl:row-span-2';

  const hubIntelligenceBadgesCell =
    'col-span-full min-w-0 pointer-events-auto hidden xl:col-start-1 xl:col-span-2 xl:row-start-2 xl:block xl:self-start';

  const xlDeadlineMetricRowSpan = hubCatalogListing
    ? 'xl:row-span-1'
    : 'xl:row-span-2';

  const xlAwardMetricRowSpan = hubCatalogListing
    ? 'xl:row-span-2'
    : 'xl:row-span-2';

  /** Stacked/narrow listing only — catalog hub uses a mobile combined row + xl grid columns on inner wrappers. */
  const deadlineBlockWrap = 'min-w-0 border-t border-slate-200/80 pt-3';
  const awardMetricsWrap = 'min-w-0 border-t border-slate-200/80 pt-3';

  /** Save / Not relevant — under award when stacked; inside award row on catalog mobile. */
  const cardActionsWrap = stackedListing
    ? 'relative z-10 mt-2.5 mx-auto flex w-full max-w-[148px] flex-col items-stretch gap-1.5 pointer-events-auto'
    : 'relative z-10 mt-2.5 mx-auto flex w-full max-w-[148px] shrink-0 flex-col gap-1.5 pointer-events-auto xl:w-full xl:max-w-[148px]';

  /** Catalog hub mobile: award + deadline + actions in one equal-width row (`xl:hidden` only). */
  const catalogMobileMetricsRowClass = showCardActions
    ? 'grid w-full min-w-0 grid-cols-3 items-stretch gap-2 sm:gap-2.5'
    : 'grid w-full min-w-0 grid-cols-2 items-stretch gap-2 sm:gap-2.5';
  const catalogMobileMetricCellClass = 'min-w-0 w-full';
  const cardActionsWrapCatalogMobileRow =
    'relative z-10 flex min-w-0 w-full flex-col justify-center gap-1 pointer-events-auto [&_button]:px-1.5 [&_button]:py-1 [&_button]:text-[10px] sm:[&_button]:px-2 sm:[&_button]:text-[11px]';

  /** Award / deadline metric panels (centered inside the bordered box). */
  const metricPanelSurface =
    'rounded-lg border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]';
  const metricPanelCenterClass =
    'flex flex-col items-center justify-center text-center';
  const awardMetricAlign = `${metricPanelSurface} border-orange-100/90 bg-orange-50/50 min-h-full ${metricPanelCenterClass}`;
  const awardMetricAlignTight = 'text-center';

  const deadlineInner = `${metricPanelSurface} min-w-0 border-slate-200/90 bg-slate-50/90 min-h-full ${metricPanelCenterClass}`;

  const deadlineMetricAlign = 'w-full text-center';
  const catalogMobileAwardCellClass = `${catalogMobileMetricCellClass} ${awardMetricAlign}`;
  const catalogMobileDeadlineCellClass = `${catalogMobileMetricCellClass} ${deadlineInner}`;

  /** Compact vertical stack under award (right column on xl). */
  const cardActionBtnBase = `w-full rounded-lg px-2.5 py-1.5 text-center text-xs font-semibold text-white transition ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;
  const cardActionSaveClass = `${cardActionBtnBase} ${SCHOLARSHIP_ACTION_FILL}`;
  const cardActionSavedClass = `${cardActionBtnBase} ${SCHOLARSHIP_ACTION_FILL_PRESSED}`;
  const geoBadgeShell =
    'inline-flex min-h-9 items-center justify-center rounded-full border px-4 py-2 text-center text-xs font-extrabold leading-snug tracking-tight shadow-sm';
  const geoBadgeWidthBlock = 'w-full max-w-full';
  const geoBadgeWidthInline = 'w-auto shrink-0 max-w-[13.5rem]';
  const geoBadgeClass = (
    widthClass: string,
    tone: 'country' | 'location' | 'missing'
  ) => {
    const toneClass =
      tone === 'country'
        ? 'border-orange-200 bg-orange-50 text-orange-700 ring-1 ring-orange-100'
        : tone === 'location'
          ? 'border-orange-200 bg-white text-orange-700 ring-1 ring-orange-100'
          : 'border-slate-200 bg-slate-50 text-slate-600 ring-1 ring-slate-100';
    return `${geoBadgeShell} ${widthClass} ${toneClass}`;
  };
  const geoBadgesColumnClass =
    'flex w-full min-w-0 flex-col items-stretch gap-2';

  const geoFilterLinkClass =
    'pointer-events-auto relative z-20 cursor-pointer no-underline transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1';

  const renderGeoBadgeLinks = (truncateLabels = false, inlineRow = false) => {
    const geoLabel = (text: string) =>
      truncateLabels ? <span className="truncate">{text}</span> : text;
    const badgeWidth = inlineRow ? geoBadgeWidthInline : geoBadgeWidthBlock;
    const countryBadgeClass = geoBadgeClass(badgeWidth, 'country');
    const locationBadgeClass = geoBadgeClass(badgeWidth, 'location');
    const missingLocationBadgeClass = geoBadgeClass(badgeWidth, 'missing');

    return (
      <>
        {applicantCountryBadge ? (
          applicantCountryHubHref ? (
            <Link
              href={applicantCountryHubHref}
              className={`${countryBadgeClass} ${geoFilterLinkClass}`}
              title={`${applicantCountryBadge.title} — browse matching scholarships`}
              aria-label={`Browse scholarships filtered by ${applicantCountryBadge.text}`}
              onClick={(e) => e.stopPropagation()}
            >
              {geoLabel(applicantCountryBadge.text)}
            </Link>
          ) : (
            <span
              className={countryBadgeClass}
              title={applicantCountryBadge.title}
              aria-label={applicantCountryBadge.title}
            >
              {geoLabel(applicantCountryBadge.text)}
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
              {geoLabel(grantLocationBadge.text)}
            </Link>
          ) : grantLocationBadge.key === 'grant-location-multi' &&
            grantLocationBadge.hostCodes &&
            grantLocationBadge.hostCodes.length > 1 ? (
            <StudyInHostCountriesPopover
              hostCodes={grantLocationBadge.hostCodes}
              triggerText={grantLocationBadge.text}
              title={grantLocationBadge.title}
              className={`${locationBadgeClass} ${geoFilterLinkClass} cursor-pointer transition hover:border-orange-300 hover:bg-orange-50/80 hover:shadow`}
            />
          ) : (
            <span
              className={locationBadgeClass}
              title={grantLocationBadge.title}
              aria-label={grantLocationBadge.title}
            >
              {geoLabel(grantLocationBadge.text)}
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
            {geoLabel(hostLocationUnspecifiedBadge.text)}
          </Link>
        ) : null}
      </>
    );
  };

  const awardLine = resolveScholarshipCardAwardDisplay(scholarship, uiLocale);
  const awardCell = awardLine.line;
  const hasAwardContent = !awardLine.isPlaceholder;

  const deadlineRaw = scholarship.deadline?.trim() ?? '';
  const hasDeadline =
    Boolean(deadlineRaw) || Boolean(scholarship.deadlineAt?.trim());
  const deadlineParts = getScholarshipDeadlineDisplayParts(scholarship, uiLocale);

  const reqCount = scholarship.eligibility?.length ?? 0;
  const reqDisplayCount =
    scholarship.requirementsCount != null &&
    !Number.isNaN(Number(scholarship.requirementsCount))
      ? Number(scholarship.requirementsCount)
      : reqCount;
  const requirementsSummary =
    scholarship.listRequirementsSummary?.trim() ||
    (reqCount === 0
      ? cardChrome.requirementsSummaryZero
      : cardChrome.requirementsSummaryListed(reqCount));

  const requirementsMetric =
    reqDisplayCount === 0 ? cardChrome.requirementsNone : `${reqDisplayCount}`;

  const requirementsMetricInner = (
    <div
      className={`${metricPanelSurface} min-w-0 border-slate-200/90 bg-white text-left`}
    >
      <p
        className={`break-words text-sm font-semibold leading-snug sm:text-[0.9375rem] ${
          deadlinePassed ? 'text-gray-600' : 'text-gray-900'
        }`}
      >
        {requirementsMetric}
      </p>
      <p className={METRIC_LABEL}>{cardChrome.requirementsLabel}</p>
    </div>
  );

  const requirementsStackedUnderDeadline = SHOW_SCHOLARSHIP_CARD_REQUIREMENTS_METRIC ? (
    <div className="mt-2 min-w-0 text-left">{requirementsMetricInner}</div>
  ) : null;

  const cardSourceStatus = getScholarshipSourceStatus(scholarship);
  const cardDifficulty = getScholarshipApplicationDifficulty(scholarship);
  const cardBestFor = getLocalizedBestForPhrase(
    getScholarshipBestForLabel(scholarship),
    uiLocale
  );
  const localizedSourceShort = getLocalizedScholarshipSourceShortLabel(
    cardSourceStatus.shortLabel,
    uiLocale
  );
  const localizedEffortLevel = getLocalizedScholarshipDifficultyLevel(
    cardDifficulty.level,
    uiLocale
  );
  const sourceSignalPrefix =
    uiLocale === 'en' ? 'Signal:' : cardChrome.sourcePrefix;
  const intelligenceBadges = [
    {
      key: 'best-for',
      label: `${cardChrome.bestForPrefix} ${cardBestFor}`,
      title: cardChrome.bestForBadgeTitle
    },
    ...(SHOW_SCHOLARSHIP_CARD_EFFORT_BADGE
      ? [
          {
            key: 'effort' as const,
            label: `${cardChrome.effortPrefix} ${localizedEffortLevel}`,
            title: cardDifficulty.reason
          }
        ]
      : []),
    ...(SHOW_SCHOLARSHIP_CARD_SOURCE_SIGNAL_BADGE
      ? [
          {
            key: 'source' as const,
            label: `${sourceSignalPrefix} ${localizedSourceShort}`,
            title: cardSourceStatus.description
          }
        ]
      : [])
  ];

  const intelligenceBadgesRow = (
    <div
      className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5"
      aria-label={cardChrome.intelligenceAria}
    >
      {intelligenceBadges.map((badge) => (
        <span
          key={badge.key}
          title={badge.title}
          className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold leading-5 text-slate-700"
        >
          {badge.label}
        </span>
      ))}
    </div>
  );

  const summaryLine = replaceSummaryDollarAwardWithSourceCurrency(
    buildScholarshipCardSnippet(scholarship, awardCell, hasAwardContent) ||
      requirementsSummary,
    scholarship,
    awardCell,
    hasAwardContent
  );

  const catalogChips = useMemo<ScholarshipCardChip[]>(() => {
    const raw = scholarshipCardChips(scholarship).visible;
    if (uiLocale === 'en') return raw;
    return raw.map((chip) => ({
      ...chip,
      label: getLocalizedCatalogChipLabel(chip.key, chip.label, uiLocale)
    }));
  }, [scholarship, uiLocale]);
  const targetedCategoryLocked = resolveScholarshipTargetedCategoryLocked({
    subscriptionLockedCatalog: subscriptionLocked,
    hasSubscription,
    scholarship
  });
  const detailClickBudgetMode = resolveScholarshipDetailClickBudgetMode({
    isAuthenticated,
    hasSubscription,
    authResolved
  });
  const detailNavigateBlocked =
    detailClickBudgetMode != null &&
    shouldBlockScholarshipDetailNavigation(detailClickBudgetMode);
  const LOCKED_CARD_CATEGORY_IDS = new Set(['easy_apply', 'quick_apply']);
  const easyApplyIds = getScholarshipCatalog(scholarship).easyApplyIds;
  const showHotDeadlinesLockBadge =
    subscriptionLocked && listingTab === 'hot-deadlines';
  const showEasyApplyLockBadge =
    subscriptionLocked &&
    !showHotDeadlinesLockBadge &&
    easyApplyIds.some((id) => LOCKED_CARD_CATEGORY_IDS.has(id));
  const lockRowEligible =
    showHotDeadlinesLockBadge ||
    showEasyApplyLockBadge ||
    targetedCategoryLocked;
  const showTopRightLockBadge = detailNavigateBlocked && lockRowEligible;
  const authNoSubPreviewBlur =
    isAuthenticated &&
    !hasSubscription &&
    !targetedCategoryLocked &&
    !subscriptionLocked;
  const openAuthNoSubPaywall =
    onSubscriptionDetailNavigate ?? onGuestDetailNavigate;
  const topRightBadgeLabel =
    badgeLabelOverride?.trim() || (isUnread ? cardChrome.badgeNew : null);
  const topRightBadgeAriaLabel = badgeLabelOverride?.trim()
    ? badgeLabelOverride.trim()
    : cardChrome.badgeNewAria;
  const payoutLine = payoutMethodChipLabel(scholarship.payoutMethod);

  const hasApplicants =
    SHOW_SCHOLARSHIP_APPLICANT_COUNT_UI &&
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
  /** In-title blur token (production): any unpaid catalog viewer — until subscription. */
  const titlePremiumObscured =
    Boolean(titleBlurPhrase) && targetedCategoryLocked;
  const cardPremiumHitLayerLocked =
    targetedCategoryLocked && detailNavigateBlocked;
  const providerNameLocked = resolveScholarshipProviderNameLocked({
    hasSubscription,
    providerRaw: scholarship.provider
  });
  const providerBlurPhrases = providerNameLocked
    ? buildScholarshipProviderBlurPhrases(scholarship)
    : [];
  const lockedSummaryPhrases = [
    ...providerBlurPhrases,
    ...(targetedCategoryLocked && titleBlurPhrase ? [titleBlurPhrase] : [])
  ];
  const obscureSummaryLine =
    (providerNameLocked || targetedCategoryLocked) &&
    lockedSummaryPhrases.length > 0;

  const deadlineTooltipText = formatDeadlineTooltipText(scholarship);

  const showBadgeRow =
    scholarship.recurring || Boolean(scholarship.credibilityLabel?.trim());

  const applicantsTitle = scholarship.applicantsCountIsEstimated
    ? 'Approximate applicant volume when available.'
    : 'Applicant count when available.';

  const actions = cardChrome;
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
        {actions.restoreToMatches}
      </button>
    ) : (
      <>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={
            saved ? actions.removeFromSavedAria : actions.saveScholarshipAria
          }
          className={saved ? cardActionSavedClass : cardActionSaveClass}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(scholarship.id);
          }}
        >
          {saved ? actions.saved : actions.save}
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
          {actions.notRelevant}
        </button>
      </>
    );

  const cardArticleClass = deadlinePassed
    ? 'group relative flex w-full min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/95 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md focus-within:border-zinc-300 focus-within:shadow-md'
    : 'group relative flex w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] shadow-[0_10px_32px_-28px_rgba(15,23,42,0.7)] ring-1 ring-slate-100/70 transition-all duration-200 hover:border-emerald-300/75 hover:shadow-[0_22px_44px_-32px_rgba(15,23,42,0.75)] focus-within:border-emerald-300/75 focus-within:shadow-[0_22px_44px_-32px_rgba(15,23,42,0.75)]';

  const handleDetailLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const budgetMode = resolveScholarshipDetailClickBudgetMode({
      isAuthenticated,
      hasSubscription,
      authResolved
    });
    if (!budgetMode) return;
    if (
      budgetMode === 'signed-in-no-subscription' &&
      needsEmailConfirmation &&
      !hasSubscription
    ) {
      e.preventDefault();
      e.stopPropagation();
      onUnverifiedEmailDetailNavigate?.();
      dismissTopLoaderAfterBlockedDetailNavigation();
      return;
    }
    if (shouldBlockScholarshipDetailNavigation(budgetMode)) {
      e.preventDefault();
      e.stopPropagation();
      if (budgetMode === 'guest') {
        onGuestDetailNavigate?.();
      } else {
        (onSubscriptionDetailNavigate ?? onGuestDetailNavigate)?.();
      }
      dismissTopLoaderAfterBlockedDetailNavigation();
      return;
    }
  };

  const handleLockedScholarshipButtonClick = () => {
    if (!isAuthenticated) {
      onGuestDetailNavigate?.() ?? onLockedScholarshipNavigate?.();
      return;
    }
    if (!hasSubscription) {
      if (needsEmailConfirmation) {
        onUnverifiedEmailDetailNavigate?.();
        dismissTopLoaderAfterBlockedDetailNavigation();
        return;
      }
      const budgetMode = resolveScholarshipDetailClickBudgetMode({
        isAuthenticated,
        hasSubscription,
        authResolved
      });
      if (budgetMode && shouldBlockScholarshipDetailNavigation(budgetMode)) {
        if (budgetMode === 'guest') {
          onGuestDetailNavigate?.();
        } else {
          (onSubscriptionDetailNavigate ?? onGuestDetailNavigate)?.();
        }
        dismissTopLoaderAfterBlockedDetailNavigation();
        return;
      }
      router.push(detailHref);
      return;
    }
    onLockedScholarshipNavigate?.();
  };

  const titleContent =
    titlePremiumObscured && titleBlurPhrase
      ? renderTextWithObscuredPhrases(scholarship.title, [titleBlurPhrase], {
          blurEntireWhenNoSubstringMatch: false,
          lockedObscuredInteractive: false
        })
      : providerNameLocked && providerBlurPhrases.length > 0
        ? renderTextWithObscuredPhrases(
            scholarship.title,
            providerBlurPhrases,
            {
              blurEntireWhenNoSubstringMatch: false,
              lockedObscuredInteractive: false
            }
          )
        : scholarship.title;

  return (
    <article className={cardArticleClass} data-scholarship-card>
      {cardPremiumHitLayerLocked ? (
        <button
          type="button"
          onClick={handleLockedScholarshipButtonClick}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 z-0 rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A1A]/50"
          aria-label={`Locked scholarship: ${scholarship.title}`}
        >
          <span className="sr-only">{scholarship.title}</span>
        </button>
      ) : (
        <Link
          href={detailHref}
          prefetch={blockDetailPrefetchForEmailGate ? false : undefined}
          onClick={handleDetailLinkClick}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A1A]/50"
          aria-label={`View scholarship: ${scholarship.title}`}
        >
          <span className="sr-only">{scholarship.title}</span>
        </Link>
      )}
      <div
        className={`relative z-[1] w-1.5 shrink-0 self-stretch rounded-l-[0.75rem] pointer-events-none ${
          deadlinePassed
            ? 'bg-zinc-400'
            : 'bg-gradient-to-b from-emerald-950 via-slate-900 to-orange-500'
        }`}
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
                providerNameLocked ? (
                  <span
                    className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-gray-400"
                    aria-label="Sponsor name hidden until you subscribe."
                  >
                    <Info
                      className="h-3.5 w-3.5 shrink-0 text-gray-300"
                      aria-hidden
                    />
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
                <span className="pointer-events-none shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/70">
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
                    if (targetedCategoryLocked) {
                      if (!isAuthenticated) {
                        onGuestDetailNavigate?.() ??
                          onLockedScholarshipNavigate?.();
                      } else {
                        (
                          onSubscriptionDetailNavigate ?? onGuestDetailNavigate
                        )?.();
                      }
                      return;
                    }
                    onSubscriptionLockedCategoryClick?.(
                      showHotDeadlinesLockBadge ? 'hot_deadlines' : 'easy_apply'
                    );
                  }}
                  className="relative z-30 inline-flex h-5 w-[34px] shrink-0 items-center justify-center rounded-md bg-[#FF7A1A] text-white shadow-sm transition hover:bg-[#E6670C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-1 pointer-events-auto"
                  title={
                    targetedCategoryLocked
                      ? 'Premium subscription required'
                      : 'Start your free access to unlock this category'
                  }
                  aria-label={
                    targetedCategoryLocked
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
              providerNameLocked
                ? 'Scholarship title — sponsor name may be obscured until you subscribe.'
                : titlePremiumObscured && titleBlurPhrase
                  ? 'Scholarship title preview. Upgrade to reveal the full program name.'
                  : scholarship.title
            }
          >
            {cardPremiumHitLayerLocked ? (
              <button
                type="button"
                onClick={handleLockedScholarshipButtonClick}
                className="relative z-10 bg-transparent p-0 text-left text-inherit outline-none pointer-events-auto focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/50 focus-visible:ring-offset-2"
              >
                {titleContent}
              </button>
            ) : (
              <Link
                href={detailHref}
                prefetch={blockDetailPrefetchForEmailGate ? false : undefined}
                onClick={handleDetailLinkClick}
                className="relative z-10 text-inherit no-underline outline-none pointer-events-auto focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/50 focus-visible:ring-offset-2"
              >
                {titleContent}
              </Link>
            )}
          </h2>
          <div className="relative w-full min-w-0">
            <p
              className="mt-1.5 min-w-0 overflow-hidden text-[0.8125rem] leading-relaxed text-gray-600 sm:text-sm [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
              title={
                obscureSummaryLine
                  ? 'Summary preview. Some details are hidden until you subscribe.'
                  : summaryLine
              }
              aria-label={
                obscureSummaryLine
                  ? 'Scholarship summary. Some text is obscured until you subscribe.'
                  : undefined
              }
            >
              {obscureSummaryLine
                ? renderTextWithObscuredPhrases(
                    summaryLine,
                    lockedSummaryPhrases,
                    {
                      blurEntireWhenNoSubstringMatch: false
                    }
                  )
                : summaryLine}
            </p>
            {!hubCatalogListing || stackedListing ? (
              intelligenceBadgesRow
            ) : (
              <div className="xl:hidden">{intelligenceBadgesRow}</div>
            )}
            {authNoSubPreviewBlur && openAuthNoSubPaywall ? (
              <AuthNoSubBlurUnlock
                onUnlock={openAuthNoSubPaywall}
                label="Unlock full summary and details with a free account or plan"
              />
            ) : null}
          </div>
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

        {hubCatalogListing && !stackedListing ? (
          <div className={hubIntelligenceBadgesCell}>
            <div
              className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5"
              aria-label={cardChrome.intelligenceAria}
            >
              {intelligenceBadges.map((badge) => (
                <span
                  key={badge.key}
                  title={badge.title}
                  className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold leading-5 text-slate-700"
                >
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {stackedListing ? (
          <div className="relative">
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
                <p className={METRIC_LABEL}>{cardChrome.awardAmountLabel}</p>
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
            {showGeoBadges ? (
              <div
                className={`${geoBadgesColumnClass} mt-2.5 pointer-events-auto`}
              >
                {renderGeoBadgeLinks()}
              </div>
            ) : null}
            {authNoSubPreviewBlur && openAuthNoSubPaywall ? (
              <AuthNoSubBlurUnlock
                onUnlock={openAuthNoSubPaywall}
                label={cardChrome.unlockAwardAria}
              />
            ) : null}
          </div>
        ) : (
          <>
            <div className="relative col-span-full space-y-3 border-t border-gray-200 pt-3 xl:hidden">
              <div className={catalogMobileMetricsRowClass}>
                <div className={catalogMobileAwardCellClass}>
                  <p
                    title={awardLine.lineTitle}
                    className={`min-w-0 w-full truncate text-sm font-semibold leading-snug sm:text-[0.9375rem] ${
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
                  <p className={`${METRIC_LABEL} w-full truncate`}>
                    {cardChrome.awardAmountLabel}
                  </p>
                  {payoutLine ? (
                    <p className="mt-1 w-full truncate text-center text-[11px] font-medium text-gray-500">
                      {payoutLine}
                    </p>
                  ) : null}
                </div>
                <div
                  className={catalogMobileDeadlineCellClass}
                  title={hasDeadline ? deadlineTooltipText : undefined}
                >
                  {hasDeadline ? (
                    <div className="w-full text-center">
                      <p
                        className={`min-w-0 truncate text-sm font-semibold tabular-nums leading-snug sm:text-[0.9375rem] ${
                          deadlinePassed ? 'text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {deadlineParts.primary}
                      </p>
                      {deadlineParts.secondary ? (
                        <p
                          className={`mt-0.5 truncate text-[10px] font-medium leading-snug sm:text-[11px] ${
                            deadlinePassed ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {deadlineParts.secondary}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="w-full text-center">
                      <p className="text-sm font-semibold text-gray-400">—</p>
                    </div>
                  )}
                </div>
                {showCardActions ? (
                  <div className={cardActionsWrapCatalogMobileRow}>
                    {cardActionControls}
                  </div>
                ) : null}
              </div>
              {SHOW_SCHOLARSHIP_CARD_REQUIREMENTS_METRIC ? (
                <div className="min-w-0 text-left">
                  {requirementsMetricInner}
                </div>
              ) : null}
              {showGeoBadges ? (
                <div className={`${geoBadgesColumnClass} pointer-events-auto`}>
                  {renderGeoBadgeLinks()}
                </div>
              ) : null}
              {authNoSubPreviewBlur && openAuthNoSubPaywall ? (
                <AuthNoSubBlurUnlock
                  onUnlock={openAuthNoSubPaywall}
                  label={cardChrome.unlockAwardAria}
                />
              ) : null}
            </div>
            <div
              className={`hidden min-w-0 xl:col-start-2 xl:row-start-1 ${xlDeadlineMetricRowSpan} xl:block xl:self-start xl:border-0 xl:pt-0`}
            >
              <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:gap-3 xl:flex-col xl:items-center xl:gap-2">
                <div
                  className={`${deadlineInner} min-w-0 w-full flex-1`}
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
                {SHOW_SCHOLARSHIP_CARD_REQUIREMENTS_METRIC ? (
                  <div className="min-w-0 max-w-[min(11rem,46%)] shrink-0 text-right xl:max-w-none xl:w-full xl:shrink xl:text-left">
                    {requirementsMetricInner}
                  </div>
                ) : null}
              </div>
            </div>
            <div
              className={`hidden min-w-0 xl:col-start-3 xl:row-start-1 ${xlAwardMetricRowSpan} xl:block xl:w-full xl:max-w-[200px] xl:justify-self-start xl:self-start xl:border-0 xl:pt-0`}
            >
              <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:gap-3 xl:flex-col xl:items-center xl:gap-2">
                <div className={`min-w-0 w-full flex-1 ${awardMetricAlign}`}>
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
                  <p className={`${METRIC_LABEL} w-full truncate`}>
                    {cardChrome.awardAmountLabel}
                  </p>
                  {payoutLine ? (
                    <p
                      className={`mt-1 w-full truncate text-[11px] font-medium text-gray-500 ${awardMetricAlignTight}`}
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

        {catalogChips.length > 0 || (!stackedListing && showGeoBadges) ? (
          <div
            className="col-span-full min-w-0 border-t border-gray-200 pt-2.5 pointer-events-auto xl:row-start-3"
            aria-label="Scholarship tags"
          >
            <div className={tagGridClass}>
              <div className="min-w-0 pointer-events-auto">
                <ScholarshipCatalogChipRow
                  chips={catalogChips}
                  getChipHref={(c) =>
                    prefixHubHref(scholarshipCatalogChipHubHref(c))
                  }
                />
              </div>
              {!stackedListing && showGeoBadges ? (
                <div className={desktopGeoBadgesWrapClass}>
                  {renderGeoBadgeLinks(true, !desktopHasSingleGeoBadge)}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
