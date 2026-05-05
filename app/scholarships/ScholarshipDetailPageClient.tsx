'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Infinity as InfinityIcon,
  Instagram,
  Linkedin,
  Lock,
  Mail,
  Paperclip,
  Phone,
  Shield
} from 'lucide-react';

import {
  DarkTooltip,
  DarkTooltipProvider
} from '@/components/ui/DarkTooltip';
import { toast } from '@/components/ui/Toasts/use-toast';
import { ScholarshipsBrandLoading } from '@/components/scholarships/ScholarshipsBrandLoading';
import ScholarshipCatalogEntryLink from '@/components/scholarships/ScholarshipCatalogEntryLink';
import { ScholarshipExpiredBadge } from '@/components/scholarships/ScholarshipExpiredBadge';
import PremiumPaywallModal from '@/components/scholarships/PremiumPaywallModal';
import ScholarshipEmailConfirmRequiredModal from '@/components/scholarships/ScholarshipEmailConfirmRequiredModal';
import ScholarshipRegistrationWallModal, {
  type ScholarshipRegistrationWallContentMode
} from '@/components/scholarships/ScholarshipRegistrationWallModal';
import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import { breadcrumbCategoryLabel } from '@/app/scholarships/scholarshipCategories';
import { buildScholarshipTagHubHref } from '@/app/scholarships/scholarshipTagHubLinks';
import {
  scholarshipApplicantCountrySeoHref,
  scholarshipHostCountrySeoHref
} from '@/app/scholarships/scholarshipCountrySeo';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type { ContentPostListFields } from '@/lib/content-hub/contentPostListTypes';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import type { EssayListFields } from '@/lib/essays/essaysServer';
import type { ComparePeerRow } from '@/lib/seo/comparePeersServer';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import { SCHOLARSHIPS_HUB_ALL_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import {
  fieldOfStudyDisplayList,
  formatScholarshipAwardDisplay,
  getScholarshipDeadlineDisplayParts,
  resolveScholarshipCardAwardDisplay,
  scholarshipPublicPath,
  scholarshipStatusDisplay,
  studyLevelsDisplayList
} from '@/app/scholarships/scholarshipsData';
import {
  addIgnoredScholarship,
  getIgnoredScholarshipIds,
  removeIgnoredScholarship
} from '@/app/scholarships/ignoredScholarships';
import {
  recordScholarshipDetailFreeNavigation,
  resolveScholarshipDetailClickBudgetMode,
  shouldBlockScholarshipDetailNavigation
} from '@/lib/scholarships/guestScholarshipDetailClickBudget';
import {
  deleteUserSavedScholarship,
  fetchUserSavedScholarshipIds,
  postUserSavedScholarship
} from '@/app/scholarships/savedScholarshipsAccountApi';
import {
  getSavedScholarshipIds,
  removeScholarship,
  saveScholarship
} from '@/app/scholarships/savedScholarships';
import {
  getStartedScholarshipIds
} from '@/app/scholarships/startedScholarships';
import {
  getSubmittedScholarshipIds
} from '@/app/scholarships/submittedScholarships';
import {
  SCHOLARSHIP_ACTION_FILL,
  SCHOLARSHIP_ACTION_FOCUS_VISIBLE,
  SCHOLARSHIP_PROVIDER_OBSCURE_CLASS,
  scholarshipGuestLockIconClass,
  scholarshipSavedButtonClass,
  scholarshipSaveButtonClass
} from '@/lib/constants/scholarshipActionUi';
import { SHOW_SCHOLARSHIP_APPLICANT_COUNT_UI } from '@/lib/constants/scholarshipApplicantCountUi';
import { useScholarshipDetailInitialData } from '@/app/scholarships/ScholarshipDetailInitialDataContext';
import { postScholarshipsList } from '@/app/scholarships/scholarshipListFetch';
import { markScholarshipViewed } from '@/app/scholarships/viewedScholarships';
import {
  SafeScholarshipHtml,
  ScholarshipRichSection
} from '@/components/scholarships/SafeScholarshipHtml';
import {
  buildScholarshipIntroParagraph,
  formatQuickFactsLocation,
  institutionsQuickFactValue,
  pickSinglePaymentNarrative,
  prepareKeyRequirementBullets
} from '@/lib/scholarships/scholarshipDetailCopy';
import {
  buildScholarshipProviderBlurPhrases,
  renderTextWithObscuredPhrases
} from '@/lib/scholarships/renderObscuredProviderText';
import { pickScholarshipLockedTitleBlurPhrase } from '@/lib/scholarships/subscriptionLockedCategory';
import {
  isLikelyProviderName,
  resolveScholarshipProviderNameLocked,
  resolveScholarshipTargetedCategoryLocked
} from '@/lib/scholarships/scholarshipObscuring';
import {
  resolveScholarshipCategorySlug,
  scholarshipDeadlineHasPassed,
  SIMILAR_MAX
} from '@/lib/scholarships/similarScholarships';
import {
  countryLabelFromCode,
  dedupeHostCountryCodesForDisplay
} from '@/lib/scholarships/countryEligibility/countries';
import { getScholarshipDeadlineState } from '@/lib/scholarships/scholarshipDeadlineState';
import { getScholarshipCatalog } from '@/lib/scholarships/scholarshipCatalog';
import { applyProfileMatchPercentToScholarships } from '@/lib/scholarships/profileMatchBadge';
import { useCurrentUserScholarshipMatchProfile } from '@/app/scholarships/useCurrentUserScholarshipMatchProfile';
import { createClient } from '@/utils/supabase/client';
import {
  filterApplicationTipsForUi,
  filterFaqForOnPageDisplay,
  filterImportantNoteChunks,
  getNextStepActions,
  hasNonEmptyArray,
  hasTrustworthyAiConfidence,
  normalizeScholarshipForUi,
  pickQuickDecisionAndBeforePanels,
  shouldMergeApplicationDetails,
  shouldRenderApplicationTipsUi,
  shouldRenderAwardPaymentSection,
  shouldRenderSeoApplication,
  shouldRenderUsefulFaq
} from '@/lib/scholarships/scholarshipUiModel';
import type { ImportantNoteChunk } from '@/lib/scholarships/scholarshipUiModel';
import { getNormalizedBeforeYouApplySections } from '@/lib/scholarships/scholarshipCheckSectionsNormalize';
import { sanitizeRequirementLines } from '@/lib/scholarships/scholarshipText';
import {
  isSimplerGrantsGovScholarship,
  isSimplerGrantsGovOverviewJunk,
  simplerGrantsGovIntroParagraph,
  simplerGrantsGovOfficialLabel,
  simplerGrantsGovOverviewText,
  simplerGrantsGovRequirementsLines
} from '@/lib/scholarships/simplerGrantsGovDetail';
import { ScholarshipDetailGuestLockSection } from '@/components/scholarships/scholarship-detail/ScholarshipDetailGuestLockSection';
import {
  AiLowConfidenceNote,
  HeroDecisionBadges,
  ScholarshipApplicationTipsBlock,
  ScholarshipBeforeYouApplyBlock,
  ScholarshipFaqAccordion,
  ScholarshipNextStepsBlock,
  ScholarshipQuickDecisionGrid,
  ScholarshipSeoApplicationBlock
} from '@/components/scholarships/scholarship-detail/ScholarshipDetailSections';
import {
  scholarshipDetailCardCompactClass,
  scholarshipDetailCardPrimaryClass,
  scholarshipDetailCardSupportClass,
  scholarshipDetailCardTrustClass,
  scholarshipDetailHeroSurfaceClass,
  scholarshipDetailPageBgClass,
  scholarshipDetailShellClass
} from '@/lib/scholarships/scholarshipDetailLayoutClasses';

const detailOfficialSavePillClass =
  scholarshipSaveButtonClass.replace('rounded-xl', 'rounded-full');
const detailOfficialSavedPillClass =
  scholarshipSavedButtonClass.replace('rounded-xl', 'rounded-full');
/** Same emerald as Save — product parity for “Not relevant”. */
const detailOfficialNotRelevantPillClass = detailOfficialSavePillClass;
const detailOfficialRestorePillClass = `w-full rounded-full px-4 py-2 text-center text-sm font-medium text-white transition ${SCHOLARSHIP_ACTION_FILL} ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;

const detailBackToMatchesLinkClass =
  'inline-flex items-center text-sm font-medium text-zinc-600 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2';

function requirementsCleanLines(s: Scholarship): string[] {
  return sanitizeRequirementLines(s.requirementsTextClean ?? undefined);
}

function formatLastVerified(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function extractProviderNameFromMission(
  mission: string | null | undefined
): string | null {
  const normalized = mission?.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const match = normalized.match(
    /^([A-Z][A-Za-z0-9&'.’,-]*(?:\s+[A-Z][A-Za-z0-9&'.’,-]*){0,4})\s+(?:has|is|offers|supports)\b/
  );
  if (!match) return null;

  return match[1].trim();
}

function compactProviderDescription(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= 320) return normalized;

  const firstSentence = normalized.match(/^.{80,260}?[.!?](?=\s|$)/)?.[0];
  if (firstSentence) return firstSentence.trim();

  return `${normalized.slice(0, 317).trimEnd()}...`;
}

function formatScholarshipSourceLabel(
  officialSourceName: string | null | undefined,
  source: string | null | undefined
): string | null {
  const official = officialSourceName?.trim();
  if (official) return official;

  const raw = source?.trim();
  if (!raw) return null;

  return raw
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const BLOCKED_SOURCE_FALLBACK_LABELS = new Set([
  'scholarshipscom',
  'scholarshipamerica'
]);

function normalizeSourceFallbackLabel(value: string | null | undefined): string {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') ?? '';
}

function shouldShowScholarshipSourceFallback(
  officialSourceName: string | null | undefined,
  source: string | null | undefined
): boolean {
  const official = officialSourceName?.trim();
  if (official) {
    return !BLOCKED_SOURCE_FALLBACK_LABELS.has(
      normalizeSourceFallbackLabel(official)
    );
  }

  const raw = source?.trim();
  if (!raw) return false;
  return !BLOCKED_SOURCE_FALLBACK_LABELS.has(normalizeSourceFallbackLabel(raw));
}

function payoutMethodDetailLabel(
  method: string | null | undefined
): string | null {
  const m = method?.toLowerCase();
  if (!m) return null;
  const map: Record<string, string> = {
    college: 'Paid to the college or financial aid office',
    student: 'Paid directly to the student',
    non_monetary: 'Non-monetary award (courses, equipment, or similar)',
    not_stated: 'Not stated on the listing'
  };
  return map[m] ?? method;
}

function isGenericDocumentLinkTitle(
  title: string | null | undefined,
  url: string
): boolean {
  const normalized = title?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  if (!normalized) return true;
  if (normalized === url.trim().toLowerCase()) return true;
  return (
    normalized === 'document' ||
    normalized === 'official document' ||
    normalized === 'download' ||
    normalized === 'download pdf' ||
    normalized === 'pdf' ||
    /^document\s+\d+$/.test(normalized) ||
    /^download(?:\s+document)?$/.test(normalized)
  );
}

function officialDocumentLinkLabel(
  title: string | null | undefined,
  url: string
): string {
  if (!isGenericDocumentLinkTitle(title, url)) return title!.trim();
  return /\.pdf(?:$|[?#])/i.test(url) ? 'Download PDF' : 'Official Document';
}

function requirementChips(s: Scholarship): string[] {
  const out: string[] = [];
  if (s.essayRequired) out.push('Essay');
  if (s.transcriptRequired) out.push('Transcript');
  if (s.recommendationRequired) out.push('Recommendation letter');
  if (s.documentRequired) out.push('Documents');
  if (s.photoRequired) out.push('Photo');
  if (s.videoRequired) out.push('Video');
  if (s.linkRequired) out.push('Portfolio / link');
  if (s.surveyRequired) out.push('Survey');
  if (s.questionRequired) out.push('Short answers');
  if (s.goalRequired) out.push('Goals statement');
  if (s.specialEligibilityRequired) out.push('Special eligibility');
  if (s.financialNeedConsidered) out.push('Financial need');
  return out;
}

type ScholarshipGeoBadge = {
  key: string;
  text: string;
  title: string;
  href: string | null;
};

function scholarshipIsoCodes(codes: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (codes ?? [])
        .map((code) => code.trim().toUpperCase())
        .filter((code) => /^[A-Z]{2}$/.test(code))
    )
  ).sort();
}

function scholarshipApplicantCountryBadge(s: Scholarship): ScholarshipGeoBadge | null {
  const codes = scholarshipIsoCodes(s.applicantCountryCodes);
  const hostCodes = scholarshipIsoCodes(s.hostCountryCodes);
  if (
    s.internationalFriendlyListing === true &&
    hostCodes.length === 1 &&
    codes.length === 1 &&
    hostCodes[0] === codes[0]
  ) {
    return null;
  }

  if (codes.length === 1) {
    const code = codes[0]!;
    const label = countryLabelFromCode(code);
    return {
      key: `applicant-country-${code}`,
      text: `Eligible: ${label}`,
      title: `Eligibility tied to applicants linked to ${label}`,
      href:
        scholarshipApplicantCountrySeoHref(code) ??
        buildScholarshipTagHubHref({ appCountryCode: code })
    };
  }

  if (codes.length > 1) {
    return {
      key: 'applicant-country-multi',
      text: `Eligible: ${codes.length} countries`,
      title: `Eligibility tied to applicants from ${codes.length} countries`,
      href: null
    };
  }

  return null;
}

function scholarshipHostCountryBadge(s: Scholarship): ScholarshipGeoBadge | null {
  const hostCodes = dedupeHostCountryCodesForDisplay(scholarshipIsoCodes(s.hostCountryCodes));
  const hasStateSignal = (s.stateCodes ?? []).some((code) =>
    /^[A-Z]{2}$/i.test(code.trim())
  );

  if (hostCodes.includes('US') || hasStateSignal) {
    const label = countryLabelFromCode('US');
    return {
      key: 'host-country-us',
      text: `Study in: ${label}`,
      title: `Study opportunity in ${label}`,
      href:
        scholarshipHostCountrySeoHref('US') ??
        buildScholarshipTagHubHref({ hostCountryCode: 'US' })
    };
  }

  if (hostCodes.length === 1) {
    const code = hostCodes[0]!;
    const label = countryLabelFromCode(code);
    return {
      key: `host-country-${code}`,
      text: `Study in: ${label}`,
      title: `Study opportunity in ${label}`,
      href:
        scholarshipHostCountrySeoHref(code) ??
        buildScholarshipTagHubHref({ hostCountryCode: code })
    };
  }

  if (hostCodes.length > 1) {
    return {
      key: 'host-country-multi',
      text: `Study in: ${hostCodes.length} countries`,
      title: `Study opportunities spanning ${hostCodes.length} countries`,
      href: null
    };
  }

  return null;
}

/**
 * Similar cards: optional teal ring on the primary open pick (first actionable recommendation).
 */
function similarScholarshipCardClassName(
  highlightPrimary: boolean,
  deadlinePassed: boolean
): string {
  const interactive =
    'block h-full min-w-0 rounded-xl border p-3 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 md:p-3.5';

  if (deadlinePassed) {
    return `${interactive} border-zinc-200 bg-zinc-100/90 hover:border-zinc-300 hover:shadow-sm`;
  }

  const base = `${interactive} border-zinc-200/90 bg-white hover:border-teal-300/80 hover:shadow-md`;
  return highlightPrimary
    ? `${base} border-teal-200/90 ring-1 ring-teal-100/80`
    : base;
}

const similarScholarshipsGridClass =
  'grid list-none grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3';

/** Blur-only overlay for stat cards — no lock affordance (locks stay on catalog flows). */
function AuthNoSubDetailStatsBlur() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[6] rounded-3xl bg-white/45 backdrop-blur-[5px]"
      aria-hidden
    />
  );
}

function SimilarScholarshipDetailListItem({
  scholarship: s,
  highlightPrimary,
  profileMatchPercent,
  isPrimarySimilarOpen,
  eligibleForMatchPill,
  isAuthenticated,
  hasSubscription,
  authResolved = true,
  needsEmailConfirmation,
  onGuestDetailNavigate,
  onSubscriptionDetailNavigate,
  onLockedScholarshipNavigate,
  onUnverifiedEmailDetailNavigate
}: {
  scholarship: Scholarship;
  highlightPrimary: boolean;
  profileMatchPercent: number | null;
  isPrimarySimilarOpen: boolean;
  /** Open-deadline similar rows only (not “past deadline” reference cards). */
  eligibleForMatchPill: boolean;
  isAuthenticated: boolean;
  hasSubscription: boolean;
  authResolved?: boolean;
  needsEmailConfirmation: boolean;
  onGuestDetailNavigate?: () => void;
  onSubscriptionDetailNavigate?: () => void;
  onLockedScholarshipNavigate?: () => void;
  onUnverifiedEmailDetailNavigate?: () => void;
}) {
  const deadlinePassed = scholarshipDeadlineHasPassed(s);
  const simDd = getScholarshipDeadlineDisplayParts(s);
  /** Pessimistic until session resolves — matches hub cards and prevents title FOUC. */
  const catalogSubscriptionLockedGate =
    !authResolved || !hasSubscription;
  const targetedCategoryLockedSimilar = resolveScholarshipTargetedCategoryLocked({
    subscriptionLockedCatalog: catalogSubscriptionLockedGate,
    hasSubscription,
    scholarship: s
  });
  const titleBlurPhrase = targetedCategoryLockedSimilar
    ? pickScholarshipLockedTitleBlurPhrase(s.title, s.provider)
    : null;
  const titlePremiumObscuredSimilar =
    Boolean(titleBlurPhrase) && targetedCategoryLockedSimilar;
  const providerNameLockedSimilar = resolveScholarshipProviderNameLocked({
    hasSubscription,
    providerRaw: s.provider
  });
  const providerBlurPhrasesSimilar = providerNameLockedSimilar
    ? buildScholarshipProviderBlurPhrases(s)
    : [];
  const detailClickBudgetMode = resolveScholarshipDetailClickBudgetMode({
    isAuthenticated,
    hasSubscription,
    authResolved
  });
  const detailNavigateBlocked =
    detailClickBudgetMode != null &&
    shouldBlockScholarshipDetailNavigation(detailClickBudgetMode);

  const showBestRecommendation =
    eligibleForMatchPill &&
    isPrimarySimilarOpen &&
    profileMatchPercent === 100;
  const showMatchPercentPill =
    eligibleForMatchPill &&
    !showBestRecommendation &&
    profileMatchPercent != null;

  const awardDisplay = resolveScholarshipCardAwardDisplay(s);

  const applicantCountryBadge = useMemo(() => {
    const codes = Array.from(
      new Set(
        (s.applicantCountryCodes ?? [])
          .map((code) => code.trim().toUpperCase())
          .filter((code) => /^[A-Z]{2}$/.test(code))
      )
    ).sort();
    const dedupApplicantAgainstHostCountries = Array.from(
      new Set(
        (s.hostCountryCodes ?? [])
          .map((code) => code.trim().toUpperCase())
          .filter((code) => /^[A-Z]{2}$/.test(code))
      )
    ).sort();
    if (
      s.internationalFriendlyListing === true &&
      dedupApplicantAgainstHostCountries.length === 1 &&
      codes.length === 1 &&
      dedupApplicantAgainstHostCountries[0] === codes[0]
    ) {
      return null;
    }
    const primary = codes.length === 1 ? codes[0] : null;
    if (!primary) return null;
    const label = countryLabelFromCode(primary);
    return {
      code: primary,
      text: `Eligible: ${label}`,
      title: `Eligibility tied to applicants linked to ${label}`
    };
  }, [
    s.applicantCountryCodes,
    s.hostCountryCodes,
    s.internationalFriendlyListing
  ]);

  const grantLocationBadge = useMemo(() => {
    const hostCodes = dedupeHostCountryCodesForDisplay(
      (s.hostCountryCodes ?? [])
        .map((code) => code.trim().toUpperCase())
        .filter((code) => /^[A-Z]{2}$/.test(code))
    );
    const hasStateSignal = (s.stateCodes ?? []).some((code) =>
      /^[A-Z]{2}$/i.test(code.trim())
    );
    if (hostCodes.includes('US') || hasStateSignal) {
      const usLabel = countryLabelFromCode('US');
      return {
        key: 'grant-location-us' as const,
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
        key: 'grant-location-multi' as const,
        text: `Study in: ${hostCodes.length} countries`,
        title: `Study opportunities spanning ${hostCodes.length} countries`
      };
    }
    return null;
  }, [s.hostCountryCodes, s.stateCodes]);

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

  const applicantCountryHubHref = useMemo(() => {
    if (!applicantCountryBadge) return null;
    return (
      scholarshipApplicantCountrySeoHref(applicantCountryBadge.code) ??
      buildScholarshipTagHubHref({
        appCountryCode: applicantCountryBadge.code
      })
    );
  }, [applicantCountryBadge]);

  const similarGrantGeoPillClass = deadlinePassed
    ? 'inline-flex max-w-full items-center rounded-full border border-orange-100/90 bg-orange-50/75 px-2.5 py-1 text-[10px] font-semibold tracking-tight text-orange-900/85 ring-1 ring-orange-50 sm:text-[11px]'
    : 'inline-flex max-w-full items-center rounded-full border border-orange-200/85 bg-orange-50/95 px-2.5 py-1 text-[10px] font-semibold tracking-tight text-orange-950 ring-1 ring-orange-100 sm:text-[11px]';

  const similarGeoHubLinkClass = `${similarGrantGeoPillClass} relative z-10 cursor-pointer no-underline transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1`;

  const recommendationPill =
    showBestRecommendation ? (
      <span
        className={`inline-flex max-w-full whitespace-normal rounded-full px-2.5 py-1 text-[10px] font-bold uppercase leading-tight tracking-wide shadow-sm ${
          deadlinePassed
            ? 'bg-zinc-300 text-zinc-700'
            : 'bg-teal-600 text-white'
        }`}
      >
        Best recommendation
      </span>
    ) : showMatchPercentPill ? (
      <span
        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums tracking-wide shadow-sm ${
          deadlinePassed
            ? 'bg-zinc-200 text-zinc-700'
            : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90'
        }`}
      >
        {profileMatchPercent}% Match
      </span>
    ) : null;

  const cardInner = (
    <div className="relative text-left">
      {deadlinePassed ? (
        <div className="mb-2 flex justify-start">
          <ScholarshipExpiredBadge />
        </div>
      ) : null}
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 text-left">
          <span
            className={`block text-left text-base font-semibold leading-snug ${deadlinePassed ? 'text-zinc-500' : 'text-zinc-900'}`}
          >
            {titlePremiumObscuredSimilar && titleBlurPhrase
              ? renderTextWithObscuredPhrases(s.title, [titleBlurPhrase], {
                  blurEntireWhenNoSubstringMatch: false,
                  lockedObscuredInteractive: false
                })
              : providerBlurPhrasesSimilar.length > 0
                ? renderTextWithObscuredPhrases(s.title, providerBlurPhrasesSimilar, {
                    blurEntireWhenNoSubstringMatch: false,
                    lockedObscuredInteractive: false
                  })
                : s.title}
          </span>
          {s.provider ? (
            providerNameLockedSimilar ? (
              <span
                className="mt-1.5 block text-left text-sm"
                aria-label="Sponsor name hidden until you subscribe."
              >
                <span
                  className={`${deadlinePassed ? 'text-zinc-400' : 'text-zinc-600'} ${SCHOLARSHIP_PROVIDER_OBSCURE_CLASS}`}
                  aria-hidden
                >
                  {s.provider}
                </span>
              </span>
            ) : (
              <span
                className={`mt-1.5 block text-left text-sm ${deadlinePassed ? 'text-zinc-400' : 'text-zinc-600'}`}
              >
                {s.provider}
              </span>
            )
          ) : null}
        </div>
        <div className="flex w-[min(11rem,42%)] shrink-0 flex-col items-end gap-1.5">
          <span
            title={awardDisplay.lineTitle}
            className={`block w-full max-w-full truncate text-right text-base font-semibold leading-tight sm:text-[1.0625rem] ${
              awardDisplay.isNumeric ? 'tabular-nums' : ''
            } ${
              !awardDisplay.isPlaceholder
                ? deadlinePassed
                  ? 'text-zinc-500'
                  : 'text-zinc-900'
                : deadlinePassed
                  ? 'text-zinc-400'
                  : 'text-zinc-500'
            }`}
          >
            {awardDisplay.line}
          </span>
          <div className="w-full text-right">
            <div
              className={
                deadlinePassed
                  ? 'text-xs font-normal italic text-zinc-400'
                  : 'text-xs font-medium text-zinc-700'
              }
            >
              <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {deadlinePassed ? 'Deadline passed' : 'Deadline'}
              </span>
              <span
                className={`mt-0.5 block text-sm font-semibold ${deadlinePassed ? 'text-zinc-400' : 'text-zinc-800'}`}
              >
                {simDd.primary}
              </span>
              {simDd.secondary && !deadlinePassed ? (
                <span className="mt-0.5 block text-[11px] font-medium text-zinc-500">
                  {simDd.secondary}
                </span>
              ) : null}
            </div>
            {recommendationPill ? (
              <div className="mt-1.5 flex justify-end">{recommendationPill}</div>
            ) : null}
          </div>
        </div>
      </div>
      {grantLocationBadge || applicantCountryBadge ? (
        <div
          className="mt-2.5 flex w-full min-w-0 justify-end pb-0.5"
          aria-label="Host location and eligibility"
        >
          <div className="flex min-w-0 flex-nowrap justify-end gap-1.5 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
            {grantLocationBadge ? (
              grantLocationHubHref ? (
                <Link
                  href={grantLocationHubHref}
                  className={similarGeoHubLinkClass}
                  title={`${grantLocationBadge.title} — browse matching scholarships`}
                  aria-label={`Browse scholarships filtered by ${grantLocationBadge.text}`}
                >
                  <span className="truncate">{grantLocationBadge.text}</span>
                </Link>
              ) : (
                <span
                  className={similarGrantGeoPillClass}
                  title={grantLocationBadge.title}
                >
                  <span className="truncate">{grantLocationBadge.text}</span>
                </span>
              )
            ) : null}
            {applicantCountryBadge ? (
              applicantCountryHubHref ? (
                <Link
                  href={applicantCountryHubHref}
                  className={similarGeoHubLinkClass}
                  title={`${applicantCountryBadge.title} — browse matching scholarships`}
                  aria-label={`Browse scholarships filtered by ${applicantCountryBadge.text}`}
                >
                  <span className="truncate">{applicantCountryBadge.text}</span>
                </Link>
              ) : (
                <span
                  className={similarGrantGeoPillClass}
                  title={applicantCountryBadge.title}
                >
                  <span className="truncate">{applicantCountryBadge.text}</span>
                </span>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <li className="min-w-0">
      <Link
        href={scholarshipPublicPath(s)}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          if (
            authResolved &&
            isAuthenticated &&
            !hasSubscription &&
            needsEmailConfirmation
          ) {
            e.preventDefault();
            e.stopPropagation();
            onUnverifiedEmailDetailNavigate?.();
            return;
          }
          const budgetMode = resolveScholarshipDetailClickBudgetMode({
            isAuthenticated,
            hasSubscription,
            authResolved
          });
          if (!budgetMode) return;
          if (shouldBlockScholarshipDetailNavigation(budgetMode)) {
            e.preventDefault();
            e.stopPropagation();
            if (budgetMode === 'guest') {
              onGuestDetailNavigate?.();
            } else {
              (onSubscriptionDetailNavigate ?? onGuestDetailNavigate)?.();
            }
            return;
          }
          recordScholarshipDetailFreeNavigation(budgetMode);
        }}
        className={similarScholarshipCardClassName(highlightPrimary, deadlinePassed)}
      >
        {cardInner}
      </Link>
    </li>
  );
}

function SimilarScholarshipIqPromoCard() {
  return (
    <li className="min-w-0">
      <Link
        href="/iq/assessment?intent=scholarship_match"
        aria-label="Start IQ assessment"
        className="group relative block h-full min-w-0 overflow-hidden rounded-xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-3 text-left shadow-sm ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 md:p-3.5"
      >
        <div
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
          aria-hidden
        />
        <div
          className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#FF7A1A]/16 blur-2xl"
          aria-hidden
        />
        <div className="relative flex h-full min-h-[6.25rem] flex-col justify-between pl-1">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB875] bg-white/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#B45309] shadow-sm">
                <BrainCircuit className="h-3 w-3 text-[#F97316]" aria-hidden />
                Featured Tool
              </span>
              <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                IQ
              </span>
            </div>
            <p className="text-base font-semibold leading-snug tracking-tight text-slate-950">
              Find scholarships that fit how you think
            </p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
              See whether your strengths fit essays, research-heavy awards, or
              fast applications.
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-orange-100 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Assessment
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 transition group-hover:text-[#B45309]">
              Start IQ test
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function ScholarshipDetailIqDecisionCard() {
  return (
    <Link
      href="/iq/assessment?intent=scholarship_match"
      aria-label="Start IQ assessment"
      className="group relative mt-8 block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.58)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-34px_rgba(234,88,12,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:p-6"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
        aria-hidden
      />
      <div
        className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#FF7A1A]/16 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FFB875] bg-white/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3.5 w-3.5 text-[#F97316]" aria-hidden />
              Applicant intelligence
            </span>
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              IQ assessment
            </span>
          </div>
          <p className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Is this scholarship worth your time?
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">
            Take a cognitive assessment to see whether your strengths fit
            essay-heavy, research-heavy, fast-apply, or logic-based scholarship
            opportunities.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Essay fit', 'Fast apply', 'Priority clarity'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/80 bg-white/75 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Cognitive preview
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-medium text-slate-500">IQ</p>
              <p className="mt-1 text-base font-bold leading-none text-slate-950">
                --
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-medium text-slate-500">Type</p>
              <p className="mt-1 truncate text-sm font-bold leading-none text-slate-950">
                ???
              </p>
            </div>
          </div>
          <span className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_-14px_rgba(15,23,42,0.9)] transition group-hover:bg-slate-900">
            Start IQ test
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

type SectionLabelVariant = 'primary' | 'support';

function SectionLabel({
  children,
  variant = 'primary'
}: {
  children: React.ReactNode;
  variant?: SectionLabelVariant;
}) {
  if (variant === 'support') {
    return (
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {children}
      </h2>
    );
  }
  return (
    <h2 className="mb-3 text-base font-semibold tracking-tight text-zinc-900">
      {children}
    </h2>
  );
}

function RequirementsRichOrList({
  html,
  lines,
  renderLine
}: {
  html?: string | null;
  lines: string[];
  renderLine?: (text: string) => ReactNode;
}) {
  const h = html?.trim();
  if (h) {
    return <SafeScholarshipHtml html={h} />;
  }
  if (lines.length === 0) return null;
  return (
    <ul className="mx-auto max-w-2xl list-disc space-y-2 pl-5 text-left text-sm leading-relaxed text-zinc-700 md:text-base">
      {lines.map((item, i) => (
        <li key={`${i}-${item.slice(0, 48)}`}>
          <span className="whitespace-pre-line">
            {renderLine ? renderLine(item) : item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function compactScholarshipAwardStatDisplay(raw: string, fallback: string): string {
  const formatted = formatScholarshipAwardDisplay(raw);
  if (!formatted) return fallback;

  let text = formatted;
  const colonIndex = text.lastIndexOf(':');
  if (colonIndex > 0) {
    const prefix = text.slice(0, colonIndex);
    const suffix = text.slice(colonIndex + 1).trim();
    if (
      /\b(scholarship|award|program|grant)\b/i.test(prefix) &&
      /(?:[$€£¥]|\btuition\b|\bfee\b|\bannum\b|\byear\b|\bvaries\b)/i.test(suffix)
    ) {
      text = suffix;
    }
  }

  text = text
    .replace(/\s+paid directly\b.*?(?=\.|$)/i, '')
    .replace(/\bper annum\b/gi, '/yr')
    .replace(/\bper year\b/gi, '/yr')
    .replace(/\btuition fees?\b/gi, 'tuition')
    .replace(/\s+/g, ' ')
    .replace(/\.\s*$/, '')
    .trim();

  const firstSentence = text.match(/^.{24,}?[.!?](?=\s|$)/)?.[0]?.trim();
  if (text.length > 72 && firstSentence) {
    text = firstSentence.replace(/\.\s*$/, '');
  }

  return text.length > 72 && fallback.length < text.length ? fallback : text;
}

function StatCard({
  primary,
  secondary,
  primaryTitle,
  extra,
  deadlineFooter,
  notice
}: {
  primary: string;
  secondary: string;
  primaryTitle?: string;
  extra?: React.ReactNode;
  /** Green calendar icon + label row (deadline card). */
  deadlineFooter?: boolean;
  notice?: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-[7rem] min-w-0 flex-col justify-start rounded-xl border border-zinc-200/90 bg-white px-5 py-4 shadow-sm ring-1 ring-zinc-100/50">
      <p
        className="min-w-0 overflow-hidden text-lg font-bold leading-tight tracking-tight text-zinc-900 sm:text-xl [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
        title={primaryTitle ?? primary}
      >
        {primary}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium leading-snug text-zinc-500">
        {deadlineFooter ? (
          <CalendarClock
            className="h-3.5 w-3.5 shrink-0 text-zinc-400"
            strokeWidth={2}
            aria-hidden
          />
        ) : null}
        {extra}
        <span>{secondary}</span>
      </p>
      {notice ? <div className="mt-3">{notice}</div> : null}
    </div>
  );
}

type DetailLoadState = 'loading' | 'ok' | 'not_found' | 'error';

export default function ScholarshipDetailPageClient({
  isAuthenticated = true,
  hasSubscription = false,
  authResolved = true,
  needsEmailConfirmation = false,
  initialScholarship = null,
  initialRelatedArticles = [],
  initialRelatedEssays = [],
  initialRelatedHubLinks = [],
  initialComparePeers = [],
  routeParam,
  returnToHref = SCHOLARSHIPS_HUB_ALL_MATCHES_HREF
}: {
  isAuthenticated?: boolean;
  hasSubscription?: boolean;
  authResolved?: boolean;
  needsEmailConfirmation?: boolean;
  initialScholarship?: Scholarship | null;
  /** Published articles that reference this scholarship in `related_scholarships` (max 3). */
  initialRelatedArticles?: ContentPostListFields[];
  /** Essay hub guides linked to this scholarship (max 4). */
  initialRelatedEssays?: EssayListFields[];
  /** Programmatic hub listings (state / topic). */
  initialRelatedHubLinks?: { href: string; label: string }[];
  /** Peer universities for versus-page links (catalog-backed). */
  initialComparePeers?: ComparePeerRow[];
  /** Canonical route segment used for client refreshes of the scholarship detail. */
  routeParam?: string;
  /** Safe back destination inherited from the listing card. */
  returnToHref?: string;
} = {}) {
  const layoutInitialScholarship = useScholarshipDetailInitialData();
  const serverScholarship = initialScholarship ?? layoutInitialScholarship;
  const backToMatchesHref = returnToHref;

  useLayoutEffect(() => {
    if (!routeParam) return;
    window.scrollTo(0, 0);
  }, [routeParam]);

  const [similarScholarships, setSimilarScholarships] = useState<Scholarship[]>(
    []
  );
  const [scholarship, setScholarship] = useState<Scholarship | null>(serverScholarship);
  const [detailLoadState, setDetailLoadState] =
    useState<DetailLoadState>(() => (serverScholarship ? 'ok' : 'loading'));
  const [descExpanded, setDescExpanded] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [startedIds, setStartedIds] = useState<string[]>([]);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const router = useRouter();
  const [premiumPaywallOpen, setPremiumPaywallOpen] = useState(false);
  const openPremiumPaywall = useCallback(() => {
    setPremiumPaywallOpen(true);
  }, []);
  const closePremiumPaywall = useCallback(() => {
    setPremiumPaywallOpen(false);
  }, []);
  const handlePremiumPaywallUpgrade = useCallback(() => {
    setPremiumPaywallOpen(false);
    router.push('/subscription');
  }, [router]);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [emailConfirmModalOpen, setEmailConfirmModalOpen] = useState(false);
  const [registrationWallVariant, setRegistrationWallVariant] = useState<
    'scholarships' | 'locked-category'
  >('scholarships');
  const [registrationWallContent, setRegistrationWallContent] =
    useState<ScholarshipRegistrationWallContentMode>('hub');

  const openRegistrationWall = useCallback(
    (mode?: ScholarshipRegistrationWallContentMode) => {
      setRegistrationWallVariant('scholarships');
      setRegistrationWallContent(mode ?? 'hub');
      setRegistrationWallOpen(true);
    },
    []
  );

  const openLockedCategoryWall = useCallback(() => {
    setRegistrationWallVariant('locked-category');
    setRegistrationWallOpen(true);
  }, []);

  const openLockedScholarshipWallForSimilar = useCallback(() => {
    if (!isAuthenticated) {
      openRegistrationWall('grant-guest');
      return;
    }
    openLockedCategoryWall();
  }, [isAuthenticated, openRegistrationWall, openLockedCategoryWall]);

  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);

  const openEmailConfirmModal = useCallback(() => {
    setEmailConfirmModalOpen(true);
  }, []);
  const closeEmailConfirmModal = useCallback(() => {
    setEmailConfirmModalOpen(false);
  }, []);
  const syncIdsFromStorage = useCallback(async () => {
    setIgnoredIds(getIgnoredScholarshipIds());
    setStartedIds(getStartedScholarshipIds());
    setSubmittedIds(getSubmittedScholarshipIds());

    const fromStorage = getSavedScholarshipIds();
    if (!isAuthenticated || !authResolved) {
      setSavedIds(fromStorage);
      return;
    }
    try {
      const serverIds = await fetchUserSavedScholarshipIds();
      if (serverIds !== null) {
        setSavedIds([...new Set([...serverIds, ...fromStorage])]);
      } else {
        setSavedIds(fromStorage);
      }
    } catch {
      setSavedIds(fromStorage);
    }
  }, [isAuthenticated, authResolved]);
  /** Same as guest: only paid subscribers fetch unredacted premium fields. */
  const hasDetailAccess = Boolean(hasSubscription);
  const { profile: currentMatchProfile } =
    useCurrentUserScholarshipMatchProfile(isAuthenticated && authResolved);

  useEffect(() => {
    void syncIdsFromStorage();
  }, [syncIdsFromStorage]);

  useEffect(() => {
    if (!scholarship?.id) return;
    markScholarshipViewed(scholarship.id);
  }, [scholarship?.id]);

  useEffect(() => {
    if (!routeParam) {
      setDetailLoadState('not_found');
      setScholarship(null);
      return;
    }

    const pathLastSeg = (
      p: Pick<Scholarship, 'id' | 'slug'>
    ): string | null => {
      const raw = scholarshipPublicPath(p).split('/').filter(Boolean).pop();
      if (!raw) return null;
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    };

    const initialMatchesRoute =
      serverScholarship != null &&
      pathLastSeg(serverScholarship)?.toLowerCase() === routeParam.toLowerCase();

    if (initialMatchesRoute) {
      setScholarship(serverScholarship);
      setDetailLoadState('ok');
      const needsHydratedPremiumFields =
        Boolean(serverScholarship?.premiumFieldsRedacted) && hasDetailAccess;
      if (!needsHydratedPremiumFields) {
        return;
      }

      let cancelled = false;
      const paramEncoded = encodeURIComponent(routeParam);
      void (async () => {
        try {
          const detailRes = await fetch(`/api/scholarships/${paramEncoded}`);
          const detailJson: unknown = await detailRes.json();
          if (cancelled) return;
          if (detailRes.ok) {
            const row = detailJson as Scholarship;
            if (row && typeof row.id === 'string') {
              setScholarship(row);
            }
          }
        } catch {
          /* keep SSR row if fetch fails */
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    setDetailLoadState('loading');
    setScholarship(null);
    setSimilarScholarships([]);

    const paramEncoded = encodeURIComponent(routeParam);

    (async () => {
      try {
        const detailRes = await fetch(`/api/scholarships/${paramEncoded}`);

        const detailJson: unknown = await detailRes.json();

        if (cancelled) return;

        if (detailRes.ok) {
          const row = detailJson as Scholarship;
          if (row && typeof row.id === 'string') {
            setScholarship(row);
            setDetailLoadState('ok');
          } else {
            setDetailLoadState('error');
          }
        } else if (detailRes.status === 404) {
          setDetailLoadState('not_found');
        } else {
          setDetailLoadState('error');
        }
      } catch {
        if (!cancelled) setDetailLoadState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeParam, serverScholarship, hasDetailAccess]);

  useEffect(() => {
    if (!scholarship?.id) {
      setSimilarScholarships([]);
      return;
    }
    let cancelled = false;
    const slug = resolveScholarshipCategorySlug(scholarship);
    const sp = new URLSearchParams();
    sp.set('similar_to', scholarship.id);
    sp.set('limit', String(SIMILAR_MAX));
    if (slug) sp.set('similar_category_slug', slug);
    const stateCode = scholarship.stateCodes?.find((c) => /^[A-Za-z]{2}$/.test(c.trim()));
    if (stateCode) sp.set('similar_state_slug', stateCode.trim().toUpperCase());

    postScholarshipsList({ searchParams: sp.toString() })
      .then((r) => {
        if (!cancelled) {
          setSimilarScholarships(r.scholarships.slice(0, SIMILAR_MAX));
        }
      })
      .catch(() => {
        if (!cancelled) setSimilarScholarships([]);
      });

    return () => {
      cancelled = true;
    };
  }, [scholarship]);

  useEffect(() => {
    if (detailLoadState !== 'ok' || !scholarship?.id || !authResolved) return;
    const mode = resolveScholarshipDetailClickBudgetMode({
      isAuthenticated,
      hasSubscription,
      authResolved
    });
    if (mode !== 'guest') return;
    if (!shouldBlockScholarshipDetailNavigation(mode)) return;
    openRegistrationWall('grant-guest');
  }, [
    detailLoadState,
    scholarship?.id,
    isAuthenticated,
    hasSubscription,
    authResolved,
    openRegistrationWall
  ]);

  const premiumPaywallModal = (
    <PremiumPaywallModal
      isOpen={premiumPaywallOpen}
      onClose={closePremiumPaywall}
      onUpgradeClick={handlePremiumPaywallUpgrade}
    />
  );
  const registrationWallModal = (
    <ScholarshipRegistrationWallModal
      open={registrationWallOpen}
      onClose={closeRegistrationWall}
      variant={registrationWallVariant}
      contentMode={registrationWallContent}
      signedInWithoutSubscription={Boolean(
        isAuthenticated && authResolved && !hasSubscription
      )}
    />
  );
  const emailConfirmRequiredModal = (
    <ScholarshipEmailConfirmRequiredModal
      open={emailConfirmModalOpen}
      onClose={closeEmailConfirmModal}
    />
  );

  const categorySlugForLinks = useMemo(
    () => (scholarship ? resolveScholarshipCategorySlug(scholarship) : null),
    [scholarship]
  );
  const similarScholarshipsWithMatch = useMemo(
    () =>
      applyProfileMatchPercentToScholarships(
        similarScholarships,
        currentMatchProfile
      ),
    [similarScholarships, currentMatchProfile]
  );
  const normalizedBeforeYouApply = useMemo(() => {
    if (!scholarship) {
      return {
        importantChecks: [] as string[],
        detailsToConfirm: [] as string[],
        redFlags: [] as string[]
      };
    }
    return getNormalizedBeforeYouApplySections(scholarship);
  }, [scholarship]);

  if (detailLoadState === 'loading') {
    return (
      <DarkTooltipProvider>
        <section
          className={`${scholarshipDetailPageBgClass} px-4 py-8 sm:px-5 md:py-12 lg:px-8`}
        >
          <div className={scholarshipDetailShellClass}>
            <ScholarshipsBrandLoading
              density="comfortable"
              label="Loading scholarship…"
              showTopAccentBar
            />
          </div>
        </section>
        {premiumPaywallModal}
        {registrationWallModal}
        {emailConfirmRequiredModal}
      </DarkTooltipProvider>
    );
  }

  if (detailLoadState === 'error') {
    return (
      <DarkTooltipProvider>
        <section
          className={`${scholarshipDetailPageBgClass} px-4 py-8 sm:px-5 md:py-12 lg:px-8`}
        >
          <div className={scholarshipDetailShellClass}>
            <div className="flex min-h-[50vh] w-full items-center justify-center">
              <p className="text-red-600">Failed to load scholarships</p>
            </div>
          </div>
        </section>
        {premiumPaywallModal}
        {registrationWallModal}
        {emailConfirmRequiredModal}
      </DarkTooltipProvider>
    );
  }

  if (detailLoadState === 'not_found' || !scholarship) {
    return (
      <DarkTooltipProvider>
        <section
          className={`${scholarshipDetailPageBgClass} px-4 py-8 sm:px-5 md:py-12 lg:px-8`}
        >
          <div className={scholarshipDetailShellClass}>
            <Link
              href={backToMatchesHref}
              scroll
              className="mb-6 inline-flex items-center text-sm font-medium text-zinc-600 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
            >
              ← Back to Matches
            </Link>
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-zinc-600 shadow-sm ring-1 ring-zinc-100/50">
              Scholarship not found
            </div>
          </div>
        </section>
        {premiumPaywallModal}
        {registrationWallModal}
        {emailConfirmRequiredModal}
      </DarkTooltipProvider>
    );
  }

  const summaryShort = scholarship.summaryShort?.trim() ?? '';
  const summaryLong = scholarship.summaryLong?.trim() ?? '';
  const lastVerifiedLabel = formatLastVerified(scholarship.lastVerifiedAt);
  const isSimplerGov = isSimplerGrantsGovScholarship(scholarship);
  const simplerOverviewBase = simplerGrantsGovOverviewText(scholarship);
  const ui = normalizeScholarshipForUi(scholarship, {
    isSimplerGov,
    simplerOverviewText: simplerOverviewBase
  });
  const introParagraph = isSimplerGov
    ? simplerGrantsGovIntroParagraph(scholarship)
    : buildScholarshipIntroParagraph(scholarship);
  const heroIntro =
    !isSimplerGov && ui.heroSummary?.trim()
      ? ui.heroSummary.trim()
      : introParagraph;

  const eligibilityItems = (scholarship.eligibility ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const whoLines = ui.eligibilityLines;
  const reqCleanLines = isSimplerGov
    ? simplerGrantsGovRequirementsLines(scholarship)
    : requirementsCleanLines(scholarship);
  const reqChips = requirementChips(scholarship);

  const reqCountFromDb =
    typeof scholarship.requirementsCount === 'number' &&
    !Number.isNaN(scholarship.requirementsCount)
      ? scholarship.requirementsCount
      : null;
  const reqCount =
    reqCountFromDb != null && reqCountFromDb > 0
      ? reqCountFromDb
      : reqCleanLines.length > 0
        ? reqCleanLines.length
        : whoLines.length > 0
          ? whoLines.length
          : eligibilityItems.length;

  const awardCatalogText =
    scholarship.amount?.trim() || scholarship.awardAmount?.trim() || '';
  const awardFullDisplay = formatScholarshipAwardDisplay(awardCatalogText);
  const awardStatLine = resolveScholarshipCardAwardDisplay(scholarship);
  const awardDisplay = compactScholarshipAwardStatDisplay(
    awardCatalogText,
    awardStatLine.line
  );
  const hasAwardStat = Boolean(awardCatalogText);

  const hasApplicantsStat =
    SHOW_SCHOLARSHIP_APPLICANT_COUNT_UI &&
    typeof scholarship.applicantCount === 'number' &&
    !Number.isNaN(scholarship.applicantCount);

  const winnerPaymentRaw = scholarship.winnerPayment?.trim() ?? '';
  const paymentDetailsRaw = scholarship.paymentDetails?.trim() ?? '';
  const paymentHtmlRaw = scholarship.paymentHtml?.trim() ?? '';
  const paymentNarrative = pickSinglePaymentNarrative(
    paymentDetailsRaw,
    winnerPaymentRaw
  );

  const providerNameFromRecordRaw = scholarship.provider?.trim();
  const providerNameFromRecord = isLikelyProviderName(providerNameFromRecordRaw)
    ? providerNameFromRecordRaw
    : undefined;
  const providerDescriptionFromRecord =
    providerNameFromRecordRaw && !providerNameFromRecord
      ? providerNameFromRecordRaw
      : null;
  const providerMissionRaw =
    scholarship.providerMission?.trim() || providerDescriptionFromRecord || '';
  const providerMissionDisplay = providerMissionRaw
    ? compactProviderDescription(providerMissionRaw)
    : '';
  const providerNameFromMission = providerNameFromRecord
    ? null
    : extractProviderNameFromMission(providerMissionRaw);
  const providerName = providerNameFromRecord || providerNameFromMission || undefined;
  const providerSlugTrimmed = scholarship.providerSlug?.trim() ?? '';
  const providerProfileHref = providerSlugTrimmed
    ? `/providers/${encodeURIComponent(providerSlugTrimmed)}`
    : null;
  const detailGeoBadges = [
    scholarshipApplicantCountryBadge(scholarship),
    scholarshipHostCountryBadge(scholarship)
  ].filter((badge): badge is ScholarshipGeoBadge => badge !== null);
  /** Pessimistic until session resolves — matches hub cards and prevents title FOUC. */
  const catalogSubscriptionLockedGate =
    !authResolved || !hasSubscription;
  const targetedCategoryLocked = resolveScholarshipTargetedCategoryLocked({
    subscriptionLockedCatalog: catalogSubscriptionLockedGate,
    hasSubscription,
    scholarship
  });
  const authNoSubDetailPreviewBlur =
    isAuthenticated && authResolved && !hasSubscription && !targetedCategoryLocked;
  const titleBlurPhrase = targetedCategoryLocked
    ? pickScholarshipLockedTitleBlurPhrase(scholarship.title, providerName)
    : null;
  const hasMission = Boolean(providerMissionRaw);
  const showMissionCompact =
    hasMission && providerMissionRaw.length > 0 && providerMissionRaw.length <= 420;
  const showProviderMission =
    hasMission &&
    (Boolean(providerName) || Boolean(providerDescriptionFromRecord)) &&
    (!providerNameFromRecord || (hasSubscription && showMissionCompact));
  const providerUrlRaw = scholarship.providerUrl?.trim();
  const logoUrl = scholarship.providerLogo?.trim();
  const showStandaloneProviderWebsiteRow =
    Boolean(providerUrlRaw) &&
    !providerName &&
    !providerProfileHref &&
    !logoUrl;
  const social = scholarship.socialLinks;
  const hasSocial = Boolean(
    social?.facebook || social?.instagram || social?.linkedin
  );

  const hasVisibleProviderContent =
    Boolean(providerName) ||
    Boolean(providerProfileHref) ||
    showProviderMission;
  const sourceFallbackLabel = formatScholarshipSourceLabel(
    scholarship.officialSourceName,
    scholarship.source
  );
  const showSourceFallbackBlock =
    !hasVisibleProviderContent &&
    Boolean(sourceFallbackLabel) &&
    shouldShowScholarshipSourceFallback(
      scholarship.officialSourceName,
      scholarship.source
    );

  /** Provider identity and external links are visible only with an active subscription. */
  const providerNameLocked = resolveScholarshipProviderNameLocked({
    hasSubscription,
    providerRaw: scholarship.provider
  });
  const providerBlurPhrases = providerNameLocked
    ? buildScholarshipProviderBlurPhrases(scholarship)
    : [];
  const lockedTextPhrases = [
    ...providerBlurPhrases,
    ...(targetedCategoryLocked && titleBlurPhrase ? [titleBlurPhrase] : [])
  ];
  const openLockedTextWall = openPremiumPaywall;
  const obscureDetailLine = (text: string) =>
    providerNameLocked || targetedCategoryLocked
      ? renderTextWithObscuredPhrases(text, lockedTextPhrases, {
          blurEntireWhenNoSubstringMatch: false,
          onLockedSegmentClick: openLockedTextWall
        })
      : text;

  const detailDeadlineState = getScholarshipDeadlineState(scholarship);
  const detailDeadlineNeedsNotice =
    detailDeadlineState === 'expired' || detailDeadlineState === 'broken';
  const deadlineDisplay = getScholarshipDeadlineDisplayParts(scholarship);
  const deadlinePrimary = deadlineDisplay.primary;
  const deadlineSecondaryLine =
    deadlineDisplay.secondary ??
    (deadlineDisplay.primary !== '—' ? 'Scholarship deadline' : null);
  const hasDeadlineStat =
    Boolean(scholarship.deadline?.trim()) ||
    Boolean(scholarship.deadlineAt?.trim());
  const recurringExtra = scholarship.recurring ? (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
      <InfinityIcon className="h-3 w-3" aria-hidden />
      recurring
    </span>
  ) : null;

  const applyHref = scholarship.applyLink?.trim();
  const officialApplicationHref = applyHref || scholarship.listingUrl?.trim();
  const detailApplyPrimaryClass =
    'inline-flex h-11 min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:px-6 sm:text-base';
  const providerWebsiteCta = providerUrlRaw && !providerProfileHref ? (
    hasSubscription ? (
      <a
        href={providerUrlRaw}
        target="_blank"
        rel="noopener noreferrer"
        className={detailApplyPrimaryClass}
      >
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        Provider website
      </a>
    ) : (
      <button
        type="button"
        className={detailApplyPrimaryClass}
        onClick={openPremiumPaywall}
        title="Premium subscription required to visit the provider website"
      >
        <Lock
          className="h-4 w-4 shrink-0 text-white stroke-white"
          strokeWidth={2}
          aria-hidden
        />
        Provider website
      </button>
    )
  ) : null;

  const statusDisplay = scholarshipStatusDisplay(scholarship);
  const studyLevelsList = studyLevelsDisplayList(scholarship);
  const fieldOfStudyList = fieldOfStudyDisplayList(scholarship);
  const institutionsText = scholarship.institutionsText?.trim();
  const stateTerritoryText = scholarship.stateTerritoryText?.trim();
  const stateCodes = scholarship.stateCodes?.filter(Boolean) ?? [];
  const locationScope = scholarship.locationScope?.trim();
  const payoutLabel = payoutMethodDetailLabel(scholarship.payoutMethod);

  const supportEmail = scholarship.supportEmail?.trim();
  const supportPhone = scholarship.supportPhone?.trim();
  const supportEmailRedacted = Boolean(scholarship.supportEmailRedacted);
  const supportPhoneRedacted = Boolean(scholarship.supportPhoneRedacted);
  const showSupport =
    Boolean(supportEmail) ||
    Boolean(supportPhone) ||
    supportEmailRedacted ||
    supportPhoneRedacted;

  const docs = scholarship.documentsRequired?.filter(Boolean) ?? [];
  const officialDocumentLinks = (scholarship.documentUrls ?? [])
    .map((item, index) => {
      const url = item.url?.trim();
      if (!url) return null;
      return {
        key: `${url}-${index}`,
        url,
        label: officialDocumentLinkLabel(item.title, url)
      };
    })
    .filter(
      (
        item
      ): item is {
        key: string;
        url: string;
        label: string;
      } => item !== null
    );
  const locationQuickFact = formatQuickFactsLocation(
    stateTerritoryText,
    locationScope,
    stateCodes
  );
  const institutionsLine = institutionsQuickFactValue(scholarship);
  const reqDisplayLines = prepareKeyRequirementBullets(reqCleanLines, {
    documents: docs,
    supportEmail
  });

  const requirementsHtmlRaw = scholarship.requirementsHtml?.trim() ?? '';
  const descriptionHtmlRaw = scholarship.descriptionHtml?.trim() ?? '';
  const descriptionBody = scholarship.description?.trim() ?? '';

  const overviewBody = isSimplerGov ? simplerOverviewBase : ui.overviewPrimary;
  const OVERVIEW_COLLAPSE_AT = 520;
  const overviewLong = overviewBody.length > OVERVIEW_COLLAPSE_AT;
  const overviewShown =
    descExpanded || !overviewLong
      ? overviewBody
      : `${overviewBody.slice(0, OVERVIEW_COLLAPSE_AT).trim()}…`;

  const hasCredibilityBlock =
    scholarship.verified || Boolean(scholarship.credibilityLabel?.trim());
  const showCredibilityInOverview = hasCredibilityBlock && !isSimplerGov;
  const showDescriptionHtmlFallback =
    Boolean(descriptionHtmlRaw) && !summaryShort && !overviewBody;
  const simplerOverviewOk =
    isSimplerGov &&
    Boolean(overviewBody) &&
    !isSimplerGrantsGovOverviewJunk(overviewBody);
  const showOverviewSection = isSimplerGov
    ? simplerOverviewOk || showDescriptionHtmlFallback
    : Boolean(overviewBody) ||
      hasCredibilityBlock ||
      showDescriptionHtmlFallback;

  const notificationPlain =
    scholarship.notificationDetails?.trim() ||
    scholarship.notificationText?.trim();
  const selectionPlain = scholarship.selectionCriteriaText?.trim();
  const awardsPlain = scholarship.awardsText?.trim();

  const hasQuickFacts =
    Boolean(statusDisplay) ||
    studyLevelsList.length > 0 ||
    fieldOfStudyList.length > 0 ||
    Boolean(institutionsLine) ||
    Boolean(locationQuickFact) ||
    scholarship.numberOfAwards != null ||
    Boolean(payoutLabel);

  const hasAwardPaymentBlock = shouldRenderAwardPaymentSection({
    hasAwardStat,
    awardsPlain,
    numberOfAwards: scholarship.numberOfAwards ?? null,
    payoutLabel,
    paymentNarrative,
    recurring: Boolean(scholarship.recurring),
    paymentHtml: paymentHtmlRaw
  });

  const keyRequirementsLabelCount =
    reqDisplayLines.length > 0
      ? reqDisplayLines.length
      : reqCleanLines.length > 0
        ? reqCleanLines.length
        : reqChips.length > 0
          ? reqChips.length
          : reqCount;

  const importantChunksRaw: ImportantNoteChunk[] = [];
  if (notificationPlain) {
    importantChunksRaw.push({
      key: 'n',
      heading: 'Notification',
      plain: notificationPlain
    });
  } else if (scholarship.notificationHtml?.trim()) {
    importantChunksRaw.push({
      key: 'nh',
      heading: 'Notification',
      html: scholarship.notificationHtml
    });
  }
  if (selectionPlain) {
    importantChunksRaw.push({
      key: 's',
      heading: 'Selection criteria',
      plain: selectionPlain
    });
  } else if (scholarship.selectionCriteriaHtml?.trim()) {
    importantChunksRaw.push({
      key: 'sh',
      heading: 'Selection criteria',
      html: scholarship.selectionCriteriaHtml
    });
  }
  if (!isSimplerGov && awardsPlain) {
    importantChunksRaw.push({
      key: 'a',
      heading: 'Program details',
      plain: awardsPlain
    });
  } else if (!isSimplerGov && scholarship.awardsHtml?.trim()) {
    importantChunksRaw.push({
      key: 'ah',
      heading: 'Program details',
      html: scholarship.awardsHtml
    });
  }
  const importantChunks = filterImportantNoteChunks(importantChunksRaw, {
    awardLine: awardCatalogText,
    deadlineLine: deadlinePrimary
  });
  const hasImportantNotes = importantChunks.length > 0;

  const trustworthyAi = hasTrustworthyAiConfidence(scholarship);
  const filteredTips = filterApplicationTipsForUi(scholarship.aiApplicationTips, {
    trustworthyAi
  });
  const showApplicationTips = shouldRenderApplicationTipsUi(
    scholarship,
    filteredTips
  );
  const panelPick = pickQuickDecisionAndBeforePanels(scholarship);
  const quickChecksForGrid = panelPick.showBeforeYouApply
    ? []
    : ui.quickDecision.importantChecks;
  const nextStepActions = getNextStepActions(scholarship);
  const showNextStepsBlock =
    nextStepActions.length > 0 &&
    trustworthyAi &&
    (panelPick.showQuickDecision || panelPick.showBeforeYouApply);

  const showSeoApplication = shouldRenderSeoApplication(scholarship);
  const showUsefulFaqPage = shouldRenderUsefulFaq(scholarship, {
    heroSummary: ui.heroSummary,
    awardLine: awardCatalogText,
    deadlinePrimary
  });
  const strictFaqItems = showUsefulFaqPage
    ? filterFaqForOnPageDisplay(scholarship, {
        heroSummary: ui.heroSummary,
        awardLine: awardCatalogText,
        deadlinePrimary
      })
    : [];
  const fallbackFaqItems = (scholarship.seoFaq ?? [])
    .filter((it) => {
      const q = it.question?.trim() ?? '';
      const a = it.answer?.trim() ?? '';
      return q.length >= 8 && a.length >= 28;
    })
    .slice(0, 5);
  const faqItemsOnPage =
    strictFaqItems.length >= 2 ? strictFaqItems : fallbackFaqItems;
  const showFaqBlock = faqItemsOnPage.length >= 2;

  const similarOpenList = similarScholarshipsWithMatch.filter(
    (s) => !scholarshipDeadlineHasPassed(s)
  );
  const similarClosedList = similarScholarshipsWithMatch.filter((s) =>
    scholarshipDeadlineHasPassed(s)
  );
  const similarSplitIntoSections =
    similarOpenList.length > 0 && similarClosedList.length > 0;
  const similarFirstOpenId = similarOpenList[0]?.id ?? null;

  const eligibilityFromAi = hasNonEmptyArray(scholarship.aiEligibilitySummary);

  /** Never show `official_source_name` here — it often mirrors the data feed (e.g. BigFuture), not the sponsor. Real sponsor stays under “About the provider”. */
  const officialName = isSimplerGov
    ? simplerGrantsGovOfficialLabel()
    : undefined;

  const hasRequirementsSection =
    reqCleanLines.length > 0 ||
    reqChips.length > 0 ||
    Boolean(requirementsHtmlRaw) ||
    eligibilityItems.length > 0;

  const showEligibilityHtmlFallback =
    whoLines.length === 0 &&
    Boolean(
      scholarship.eligibilityHtml?.trim() || scholarship.eligibilityText?.trim()
    );

  const mergeAppDetails = shouldMergeApplicationDetails({
    hasRequirementsSection,
    requirementBulletCount: Math.max(
      reqDisplayLines.length,
      reqCleanLines.length,
      reqChips.length > 0 ? 2 : 0
    ),
    hasRequirementsHtml: Boolean(requirementsHtmlRaw),
    documentCount: docs.length,
    hasSeoApplication: showSeoApplication,
    seoApplicationLength: scholarship.seoApplication?.trim().length ?? 0
  });

  const hasBeforeYouApplyContent =
    panelPick.showBeforeYouApply &&
    (normalizedBeforeYouApply.importantChecks.length > 0 ||
      normalizedBeforeYouApply.detailsToConfirm.length > 0 ||
      normalizedBeforeYouApply.redFlags.length > 0);

  /** Guest blur + “Sign in to unlock AI insights” overlay disabled — full detail body stays readable. */
  const showLockedDetailOverlay = false;
  const openLockedAccessWall = openPremiumPaywall;
  const openApplyAccessWall = openPremiumPaywall;

  return (
    <DarkTooltipProvider>
      <section
        className={`${scholarshipDetailPageBgClass} px-4 py-8 sm:px-5 md:py-12 lg:px-8`}
      >
        <div className={scholarshipDetailShellClass}>
        <Link
          href={backToMatchesHref}
          scroll
          className={detailBackToMatchesLinkClass}
        >
          ← Back to Matches
        </Link>

        <div className={`mt-4 ${scholarshipDetailHeroSurfaceClass}`}>
        <nav aria-label="Breadcrumb" className="border-b border-zinc-100 pb-4">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-zinc-500">
            <li>
              <Link
                href={backToMatchesHref}
                scroll
                className="font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
              >
                Scholarships
              </Link>
            </li>
            {categorySlugForLinks ? (
              <>
                <li className="text-zinc-300" aria-hidden>
                  /
                </li>
                <li>
                  <Link
                    href={`/scholarships/category/${encodeURIComponent(categorySlugForLinks)}`}
                    className="font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
                  >
                    {breadcrumbCategoryLabel(categorySlugForLinks)}
                  </Link>
                </li>
              </>
            ) : null}
            <li className="text-zinc-300" aria-hidden>
              /
            </li>
            <li
              className="min-w-0 max-w-full truncate font-medium text-zinc-900 sm:max-w-[min(100%,42rem)]"
              title={scholarship.title}
              aria-current="page"
            >
              {targetedCategoryLocked && titleBlurPhrase
                ? renderTextWithObscuredPhrases(scholarship.title, [titleBlurPhrase], {
                    blurEntireWhenNoSubstringMatch: false,
                    onLockedSegmentClick: openPremiumPaywall
                  })
                : scholarship.title}
            </li>
          </ol>
        </nav>

        <div className="mt-5 min-w-0">
          <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-zinc-900 sm:text-4xl md:text-[2.25rem] md:leading-tight">
            {targetedCategoryLocked && titleBlurPhrase
              ? renderTextWithObscuredPhrases(scholarship.title, [titleBlurPhrase], {
                  blurEntireWhenNoSubstringMatch: false,
                  onLockedSegmentClick: openPremiumPaywall
                })
              : scholarship.title}
          </h1>
          {detailDeadlineNeedsNotice ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ScholarshipExpiredBadge />
            </div>
          ) : null}
          <HeroDecisionBadges
            matchBadge={ui.matchBadge}
            urgencyBadge={ui.urgencyBadge}
            difficultyBadge={ui.difficultyBadge}
          />
          {heroIntro ? (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600 md:text-lg">
              {obscureDetailLine(heroIntro)}
            </p>
          ) : null}
          {detailGeoBadges.length > 0 ? (
            <div
              className="mt-4 flex flex-wrap items-center gap-2"
              aria-label="Scholarship country eligibility and study destination"
            >
              {detailGeoBadges.map((badge) => {
                const className =
                  'inline-flex max-w-full items-center rounded-full border border-orange-200/90 bg-orange-50/80 px-3 py-1.5 text-xs font-bold leading-tight text-orange-900 ring-1 ring-orange-100/80 transition sm:text-sm';

                return badge.href ? (
                  <Link
                    key={badge.key}
                    href={badge.href}
                    className={`${className} no-underline hover:border-orange-300 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2`}
                    title={`${badge.title} - browse matching scholarships`}
                    aria-label={`Browse scholarships filtered by ${badge.text}`}
                  >
                    <span className="truncate">{badge.text}</span>
                  </Link>
                ) : (
                  <span
                    key={badge.key}
                    className={className}
                    title={badge.title}
                  >
                    <span className="truncate">{badge.text}</span>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
        </div>

        <div className="relative mt-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {hasDeadlineStat ? (
            <StatCard
              primary={deadlinePrimary}
              secondary={deadlineSecondaryLine ?? 'Scholarship deadline'}
              deadlineFooter
              extra={recurringExtra}
              notice={
                detailDeadlineNeedsNotice ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium leading-snug text-amber-900">
                    Deadline may have passed. Check the official provider page before applying.
                  </p>
                ) : null
              }
            />
          ) : null}
          {hasAwardStat ? (
            <StatCard
              primary={awardDisplay}
              primaryTitle={awardStatLine.lineTitle ?? awardFullDisplay}
              secondary="Award amount"
            />
          ) : null}
          {hasApplicantsStat ? (
            <StatCard
              primary={scholarship.applicantCount!.toLocaleString()}
              secondary="Scholarship applicants"
            />
          ) : null}
          <StatCard
            primary={String(reqCount)}
            secondary="Requirements"
          />
        </div>
        {authNoSubDetailPreviewBlur ? <AuthNoSubDetailStatsBlur /> : null}
        </div>

        <ScholarshipDetailGuestLockSection
          locked={showLockedDetailOverlay}
          onSignIn={openLockedAccessWall}
        >
        {panelPick.showQuickDecision ? (
          <ScholarshipQuickDecisionGrid
            bestFor={ui.quickDecision.bestFor}
            highlights={ui.quickDecision.highlights}
            whyApply={ui.quickDecision.whyApply}
            importantChecks={quickChecksForGrid}
            renderLine={obscureDetailLine}
          />
        ) : null}
        {ui.lowConfidenceAi ? (
          <div className="mt-4 min-w-0">
            <AiLowConfidenceNote />
          </div>
        ) : null}
        <ScholarshipDetailIqDecisionCard />
        {whoLines.length > 0 ? (
          <div className="mt-10">
            <SectionLabel>Who can apply</SectionLabel>
            <div className={scholarshipDetailCardPrimaryClass}>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                {whoLines.map((item, i) => (
                  <li key={`who-${i}-${item.slice(0, 40)}`}>
                    {obscureDetailLine(item)}
                  </li>
                ))}
              </ul>
              {eligibilityFromAi ? (
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  Always verify the full eligibility rules on the official
                  source before you apply.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {showEligibilityHtmlFallback ? (
            <ScholarshipRichSection
            label="Eligibility"
            html={scholarship.eligibilityHtml}
            fallbackText={scholarship.eligibilityText ?? undefined}
          />
        ) : null}

        {hasQuickFacts ? (
          <div className="mt-8 rounded-3xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-center shadow-sm sm:px-6 sm:py-5">
            <div className="mx-auto flex items-center justify-center gap-2.5">
              <span className="text-xl leading-none" aria-hidden>
                🎯
              </span>
              <p className="text-[1.65rem] font-bold leading-[1.08] tracking-tight text-indigo-950">
                Get matched with scholarships in 2 minutes
              </p>
            </div>
            <HomePrimaryCtaClient
              className="mt-3 inline-flex items-center justify-center rounded-full bg-black px-7 py-2 text-xl font-bold leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45"
            >
              Find My Scholarships
            </HomePrimaryCtaClient>
          </div>
        ) : null}

        {hasQuickFacts ? (
          <div className={`mt-8 ${scholarshipDetailCardCompactClass}`}>
            <h2 className="mb-4 text-base font-semibold tracking-tight text-zinc-900">
              Quick facts
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {statusDisplay ? (
                <div>
                  <p className="text-xs font-medium text-zinc-500">Status</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {statusDisplay}
                  </p>
                </div>
              ) : null}
              {studyLevelsList.length ? (
                <div className="min-w-0 sm:col-span-2 lg:col-span-2">
                  <p className="text-xs font-medium text-zinc-500">
                    Study levels
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">
                    {studyLevelsList.join(', ')}
                  </p>
                </div>
              ) : null}
              {fieldOfStudyList.length ? (
                <div className="min-w-0 sm:col-span-2 lg:col-span-2">
                  <p className="text-xs font-medium text-zinc-500">
                    Field of study
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">
                    {fieldOfStudyList.join(', ')}
                  </p>
                </div>
              ) : null}
              {institutionsLine ? (
                <div className="min-w-0 sm:col-span-2 lg:col-span-2">
                  <p className="text-xs font-medium text-zinc-500">
                    Eligible institutions
                  </p>
                  <p
                    className="mt-1 text-sm leading-relaxed text-zinc-700"
                    title={
                      providerNameLocked
                        ? 'Institution details may name the sponsor — hidden until you subscribe.'
                        : undefined
                    }
                  >
                    {obscureDetailLine(institutionsLine)}
                  </p>
                </div>
              ) : null}
              {locationQuickFact ? (
                <div className="min-w-0 sm:col-span-2">
                  <p className="text-xs font-medium text-zinc-500">
                    Location
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">
                    {locationQuickFact}
                  </p>
                </div>
              ) : null}
              {scholarship.numberOfAwards != null ? (
                <div>
                  <p className="text-xs font-medium text-zinc-500">
                    Number of awards
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {scholarship.numberOfAwards.toLocaleString()}
                  </p>
                </div>
              ) : null}
              {payoutLabel ? (
                <div className="min-w-0 sm:col-span-2">
                  <p className="text-xs font-medium text-zinc-500">
                    Payout method
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">{payoutLabel}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showSupport ? (
          <div className="mt-10">
            <SectionLabel>Scholarship Support</SectionLabel>
            <div className={scholarshipDetailCardPrimaryClass}>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-8">
                {supportEmail ? (
                  <a
                    href={`mailto:${supportEmail}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
                  >
                    <Mail className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {supportEmail}
                  </a>
                ) : supportEmailRedacted ? (
                  <button
                    type="button"
                    onClick={openPremiumPaywall}
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700"
                    aria-label="Support email hidden. Upgrade to premium to see contact details."
                  >
                    <Lock
                      className={`h-4 w-4 shrink-0 ${scholarshipGuestLockIconClass}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <Mail className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span
                      className={SCHOLARSHIP_PROVIDER_OBSCURE_CLASS}
                      aria-hidden
                    >
                      support@example.org
                    </span>
                  </button>
                ) : null}
                {supportPhone ? (
                  <a
                    href={`tel:${supportPhone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
                  >
                    <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {supportPhone}
                  </a>
                ) : supportPhoneRedacted ? (
                  <button
                    type="button"
                    onClick={openPremiumPaywall}
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700"
                    aria-label="Support phone hidden. Upgrade to premium to see contact details."
                  >
                    <Lock
                      className={`h-4 w-4 shrink-0 ${scholarshipGuestLockIconClass}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span
                      className={SCHOLARSHIP_PROVIDER_OBSCURE_CLASS}
                      aria-hidden
                    >
                      (555) 555-5555
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {panelPick.showBeforeYouApply ? (
          <ScholarshipBeforeYouApplyBlock
            checks={normalizedBeforeYouApply.importantChecks}
            detailsToConfirm={normalizedBeforeYouApply.detailsToConfirm}
            redFlags={normalizedBeforeYouApply.redFlags}
            renderLine={obscureDetailLine}
          />
        ) : null}

        {showNextStepsBlock ? (
          <ScholarshipNextStepsBlock
            items={nextStepActions}
            renderLine={obscureDetailLine}
          />
        ) : null}

        {initialRelatedHubLinks.length > 0 ? (
          <div
            className="mt-10"
            aria-labelledby="scholarship-related-hubs-heading"
          >
            <h2
              id="scholarship-related-hubs-heading"
              className="mb-3 text-base font-semibold tracking-tight text-zinc-900"
            >
              Related scholarship hubs
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-zinc-600">
              Browse curated listings that match this program’s state and field.
            </p>
            <ul className="flex flex-wrap gap-2" role="list">
              {initialRelatedHubLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {initialComparePeers.length > 0 ? (
          <div
            className="mt-10"
            aria-labelledby="scholarship-compare-peers-heading"
          >
            <h2
              id="scholarship-compare-peers-heading"
              className="mb-3 text-base font-semibold tracking-tight text-zinc-900"
            >
              Compare with other universities
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-zinc-600">
              See how aid and essay expectations differ when this provider is
              stacked against other schools in our catalog.
            </p>
            <ul className="flex flex-wrap gap-2" role="list">
              {initialComparePeers.map((peer) => (
                <li key={peer.compareSlug}>
                  <Link
                    href={`/compare/universities/${encodeURIComponent(peer.compareSlug)}`}
                    className="inline-flex rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1.5 text-sm font-medium text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
                  >
                    vs {peer.peerName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {initialRelatedArticles.length > 0 ? (
          <div
            className="mt-10"
            aria-labelledby="scholarship-related-resources-heading"
          >
            <div className="flex flex-wrap items-start gap-3">
              <BookOpen
                className="mt-0.5 h-5 w-5 shrink-0 text-teal-700/90"
                strokeWidth={1.75}
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-3">
                <h2
                  id="scholarship-related-resources-heading"
                  className="text-lg font-semibold tracking-tight text-zinc-900"
                >
                  From our resources
                </h2>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Articles and guides on this site that mention this program in
                  context.
                </p>
                <ul className="space-y-2.5" role="list">
                  {initialRelatedArticles.map((post) => {
                    const slug = post.slug?.trim();
                    if (!slug) return null;
                    const label =
                      post.title?.trim() || slug.replace(/-/g, ' ');
                    return (
                      <li key={post.id}>
                        <Link
                          href={resourcesArticlePath(slug)}
                          className="text-sm font-semibold text-teal-800 underline decoration-teal-600/35 underline-offset-2 transition hover:text-teal-950 hover:decoration-teal-700/60"
                        >
                          {label}
                        </Link>
                        {post.meta_description?.trim() ? (
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                            {post.meta_description.trim()}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {initialRelatedEssays.length > 0 ||
        Boolean(scholarship?.essayRequired) ? (
          <div
            className="mt-10"
            aria-labelledby="scholarship-related-essays-heading"
          >
            <div className="flex flex-wrap items-start gap-3">
              <BookOpen
                className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700/90"
                strokeWidth={1.75}
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-3">
                <h2
                  id="scholarship-related-essays-heading"
                  className="text-lg font-semibold tracking-tight text-zinc-900"
                >
                  Example essays & guides
                </h2>
                {initialRelatedEssays.length > 0 ? (
                  <ul className="space-y-2.5" role="list">
                    {initialRelatedEssays.map((ex) => {
                      const slug = ex.slug?.trim();
                      if (!slug) return null;
                      const label =
                        ex.title?.trim() || slug.replace(/-/g, ' ');
                      return (
                        <li key={ex.id}>
                          <Link
                            href={essayHubArticlePath(slug)}
                            className="text-sm font-semibold text-indigo-800 underline decoration-indigo-600/35 underline-offset-2 transition hover:text-indigo-950 hover:decoration-indigo-700/60"
                          >
                            {label}
                          </Link>
                          {ex.meta_description?.trim() ? (
                            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                              {ex.meta_description.trim()}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-600">
                    A dedicated how-to guide for this program may be added over
                    time. Browse all essay guides from the hub.
                  </p>
                )}
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4">
                  <p className="text-sm font-semibold text-indigo-950">
                    Need to write an essay for this grant? Use our AI Essay
                    Writer to draft a unique personal statement fast.
                  </p>
                  <Link
                    href={`/essay?scholarship=${encodeURIComponent(scholarship.title)}`}
                    className="mt-2 inline-flex text-sm font-bold text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline"
                  >
                    Open AI Essay Writer →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showApplicationTips ? (
          <ScholarshipApplicationTipsBlock
            items={filteredTips}
            renderLine={obscureDetailLine}
          />
        ) : null}

        {mergeAppDetails &&
        (hasRequirementsSection || docs.length > 0 || showSeoApplication) ? (
          <div className="mt-10">
            <SectionLabel>Application details</SectionLabel>
            <div className={`${scholarshipDetailCardPrimaryClass} space-y-8`}>
              {hasRequirementsSection ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Key requirements ({keyRequirementsLabelCount})
                  </h3>
                  <p className="mb-4 mt-2 text-xs text-zinc-500">
                    {isSimplerGov
                      ? 'Requirements and conditions as stated on the federal listing.'
                      : 'Program rules and conditions; confirm uploads on the official application.'}
                  </p>
                  {reqChips.length > 0 ? (
                    <div className="mb-5 flex flex-wrap gap-2">
                      {reqChips.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {reqDisplayLines.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                      {reqDisplayLines.map((item, i) => (
                        <li key={`req-${i}-${item.slice(0, 40)}`}>
                          {obscureDetailLine(item)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {reqDisplayLines.length === 0 && requirementsHtmlRaw ? (
                    <RequirementsRichOrList
                      html={scholarship.requirementsHtml}
                      lines={eligibilityItems}
                      renderLine={obscureDetailLine}
                    />
                  ) : null}
                  {reqCleanLines.length === 0 &&
                  !requirementsHtmlRaw &&
                  eligibilityItems.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                      {eligibilityItems.map((item, i) => (
                        <li key={`elig-${i}-${item.slice(0, 40)}`}>
                          {obscureDetailLine(item)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {docs.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Required documents
                  </h3>
                  <p className="mb-4 mt-2 text-xs text-zinc-500">
                    {isSimplerGov
                      ? 'Confirm the latest list on the official opportunity page.'
                      : 'Check the official application for the final document list.'}
                  </p>
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                    {docs.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {showSeoApplication ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Applying
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                    {scholarship.seoApplication!.trim()}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {hasRequirementsSection ? (
              <div className="mt-10">
                <SectionLabel>
                  Key requirements ({keyRequirementsLabelCount})
                </SectionLabel>
                <div className={scholarshipDetailCardPrimaryClass}>
                  <p className="mb-4 text-xs text-zinc-500">
                    {isSimplerGov
                      ? 'Requirements and conditions as stated on the federal listing.'
                      : 'Program rules and conditions. Uploads and file types are listed under Required documents.'}
                  </p>
                  {reqChips.length > 0 ? (
                    <div className="mb-5 flex flex-wrap gap-2">
                      {reqChips.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {reqDisplayLines.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                      {reqDisplayLines.map((item, i) => (
                        <li key={`req-${i}-${item.slice(0, 40)}`}>
                          {obscureDetailLine(item)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {reqDisplayLines.length === 0 && requirementsHtmlRaw ? (
                    <RequirementsRichOrList
                      html={scholarship.requirementsHtml}
                      lines={eligibilityItems}
                      renderLine={obscureDetailLine}
                    />
                  ) : null}
                  {reqCleanLines.length === 0 &&
                  !requirementsHtmlRaw &&
                  eligibilityItems.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                      {eligibilityItems.map((item, i) => (
                        <li key={`elig-${i}-${item.slice(0, 40)}`}>
                          {obscureDetailLine(item)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : null}

            {docs.length > 0 || officialDocumentLinks.length > 0 ? (
              <div className="mt-10">
                <SectionLabel>Required documents</SectionLabel>
                <div className={scholarshipDetailCardPrimaryClass}>
                  <p className="mb-4 text-xs text-zinc-500">
                    {isSimplerGov
                      ? 'Document list from the listing; confirm the latest version on the official opportunity page.'
                      : 'Materials you may need to upload or submit; check the official application for the final list.'}
                  </p>
                  {docs.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                      {docs.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  ) : null}
                  {officialDocumentLinks.length > 0 ? (
                    <ol
                      className={`${docs.length > 0 ? 'mt-4 ' : ''}list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base`}
                    >
                      {officialDocumentLinks.map((doc) => (
                        <li key={doc.key}>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-start gap-2 font-medium text-sky-700 underline-offset-2 transition hover:text-sky-800 hover:underline"
                          >
                            <Paperclip
                              className="mt-0.5 h-4 w-4 shrink-0"
                              aria-hidden
                            />
                            <span>{doc.label}</span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              </div>
            ) : null}

            {showSeoApplication ? (
              <ScholarshipSeoApplicationBlock
                text={scholarship.seoApplication!.trim()}
              />
            ) : null}
          </>
        )}

        {hasAwardPaymentBlock ? (
          <div className="mt-10">
            <SectionLabel>Award &amp; payment</SectionLabel>
            <div
              className={`${scholarshipDetailCardPrimaryClass} space-y-4 text-sm text-zinc-700`}
            >
              {hasAwardStat ? (
                <p>
                  <span className="font-semibold text-zinc-900">Amount:</span>{' '}
                  {awardFullDisplay}
                </p>
              ) : awardsPlain ? (
                <p className="whitespace-pre-line">
                  <span className="font-semibold text-zinc-900">
                    Funding / awards:
                  </span>{' '}
                  {awardsPlain}
                </p>
              ) : null}
              {scholarship.numberOfAwards != null ? (
                <p>
                  <span className="font-semibold text-zinc-900">
                    Number of awards:
                  </span>{' '}
                  {scholarship.numberOfAwards.toLocaleString()}
                </p>
              ) : null}
              {payoutLabel ? (
                <p>
                  <span className="font-semibold text-zinc-900">Payout:</span>{' '}
                  {payoutLabel}
                </p>
              ) : null}
              {paymentNarrative ? (
                <p className="whitespace-pre-line text-zinc-700">
                  {paymentNarrative}
                </p>
              ) : null}
              {scholarship.recurring ? (
                <p className="text-zinc-600">This award may be renewable.</p>
              ) : null}
              {paymentHtmlRaw && !paymentNarrative ? (
                <SafeScholarshipHtml html={paymentHtmlRaw} />
              ) : null}
            </div>
          </div>
        ) : null}

        {hasImportantNotes ? (
          <div className="mt-10">
            <SectionLabel variant="support">Important notes</SectionLabel>
            <div
              className={`${scholarshipDetailCardPrimaryClass} space-y-6 text-sm leading-relaxed text-zinc-700`}
            >
              {importantChunks.map((chunk) => (
                <div key={chunk.key}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {chunk.heading}
                  </p>
                  {chunk.plain ? (
                    <p className="whitespace-pre-line">{chunk.plain}</p>
                  ) : chunk.html ? (
                    <SafeScholarshipHtml html={chunk.html} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {hasVisibleProviderContent ? (
          <div className="mt-10">
            <SectionLabel variant="support">About the provider</SectionLabel>
            <div className={scholarshipDetailCardSupportClass}>
              <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
                {providerProfileHref ? (
                  providerNameLocked && providerName ? (
                    <button
                      type="button"
                      onClick={openLockedAccessWall}
                      className="group flex min-w-0 gap-3 rounded-xl p-1 -m-1 text-left outline-none transition hover:bg-zinc-50/90 focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 sm:gap-4"
                      aria-label="Provider name hidden. Upgrade to premium to see the sponsor."
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Scholarship provider logo"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Shield
                            className="h-5 w-5 text-zinc-500"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Lock
                          className={`h-4 w-4 shrink-0 ${scholarshipGuestLockIconClass}`}
                          strokeWidth={2}
                          aria-hidden
                        />
                        <p
                          className={`min-w-0 text-lg font-semibold text-zinc-900 ${SCHOLARSHIP_PROVIDER_OBSCURE_CLASS}`}
                          aria-hidden
                        >
                          {providerName}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <Link
                      href={providerProfileHref}
                      className="group flex min-w-0 gap-3 rounded-xl p-1 -m-1 outline-none transition hover:bg-zinc-50/90 focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 sm:gap-4"
                      aria-label={
                        providerName
                          ? `View provider profile: ${providerName}`
                          : 'View provider profile'
                      }
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm transition group-hover:border-emerald-200/80">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={
                              providerName
                                ? `${providerName} logo`
                                : 'Scholarship provider logo'
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Shield
                            className="h-5 w-5 text-zinc-500 transition group-hover:text-emerald-700"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {providerName ? (
                          <p className="text-lg font-semibold text-emerald-800 underline decoration-emerald-600/40 underline-offset-4 transition group-hover:text-emerald-900">
                            {providerName}
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-zinc-600 underline-offset-2 transition group-hover:text-emerald-800 group-hover:underline">
                            View provider profile
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                ) : providerNameLocked && providerName ? (
                  <button
                    type="button"
                    onClick={openLockedAccessWall}
                    className="flex min-w-0 gap-3 rounded-xl p-1 -m-1 text-left outline-none transition hover:bg-zinc-50/90 focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 sm:gap-4"
                    aria-label="Provider name hidden. Upgrade to premium to see the sponsor."
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Scholarship provider logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Shield
                          className="h-5 w-5 text-zinc-500"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Lock
                        className={`h-4 w-4 shrink-0 ${scholarshipGuestLockIconClass}`}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <p
                        className={`min-w-0 text-lg font-semibold text-zinc-900 ${SCHOLARSHIP_PROVIDER_OBSCURE_CLASS}`}
                        aria-hidden
                      >
                        {providerName}
                      </p>
                    </div>
                  </button>
                ) : providerName || logoUrl || showStandaloneProviderWebsiteRow ? (
                  <div className="flex min-w-0 gap-3 sm:gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={
                            providerName
                              ? `${providerName} logo`
                              : 'Scholarship provider logo'
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Shield
                          className="h-5 w-5 text-zinc-500"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {providerName ? (
                        <p className="text-lg font-semibold text-zinc-900">
                          {providerName}
                        </p>
                      ) : showStandaloneProviderWebsiteRow && providerUrlRaw ? (
                        hasSubscription ? (
                          <a
                            href={providerUrlRaw}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-fit items-center justify-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-100"
                          >
                            <ExternalLink
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                            Provider website
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={openPremiumPaywall}
                            className="inline-flex w-fit items-center justify-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-100"
                          >
                            <Lock
                              className="h-3.5 w-3.5 shrink-0"
                              strokeWidth={2}
                              aria-hidden
                            />
                            Provider website
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {providerWebsiteCta ? (
                  <div className="mt-3 w-full sm:ml-14 sm:max-w-sm">
                    {providerWebsiteCta}
                  </div>
                ) : null}
              </div>
              {showProviderMission ? (
                <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                  {providerMissionDisplay}
                </p>
              ) : null}
              {social && hasSocial && hasSubscription ? (
                <div className="mt-5 border-t border-zinc-100 pt-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                    Social
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {social.facebook ? (
                      <a
                        href={social.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-100 bg-zinc-50/80 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label="Facebook"
                      >
                        <Facebook className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </a>
                    ) : null}
                    {social.instagram ? (
                      <a
                        href={social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-100 bg-zinc-50/80 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label="Instagram"
                      >
                        <Instagram className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </a>
                    ) : null}
                    {social.linkedin ? (
                      <a
                        href={social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-100 bg-zinc-50/80 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label="LinkedIn"
                      >
                        <Linkedin className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showSourceFallbackBlock && sourceFallbackLabel ? (
          <div className="mt-10">
            <SectionLabel variant="support">Source</SectionLabel>
            <div className={scholarshipDetailCardSupportClass}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Source
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {sourceFallbackLabel}
              </p>
            </div>
          </div>
        ) : null}

        {showOverviewSection ? (
          <div className="mt-10">
            <SectionLabel variant="support">Overview</SectionLabel>
            <div className={scholarshipDetailCardSupportClass}>
              {showCredibilityInOverview ? (
                <div
                  className={`${
                    overviewBody || showDescriptionHtmlFallback
                      ? 'border-b border-zinc-100 pb-6'
                      : ''
                  }`}
                >
                  <p className="text-xs font-medium text-zinc-500">
                    Credibility score:
                  </p>
                  <div className="mt-1 flex max-w-full items-center gap-2">
                    {scholarship.verified ? (
                      <>
                        <CheckCircle2
                          className="h-5 w-5 shrink-0 text-emerald-500"
                          aria-hidden
                        />
                        <span className="text-base font-semibold text-zinc-900">
                          Verified
                        </span>
                      </>
                    ) : (
                      <span className="text-base font-semibold text-zinc-600">
                        {scholarship.credibilityLabel?.trim() ||
                          'Not verified'}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
              {overviewBody ? (
                <div className={showCredibilityInOverview ? 'pt-6' : ''}>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 md:text-base">
                    {obscureDetailLine(overviewShown)}
                  </p>
                  {overviewLong ? (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((e) => !e)}
                      className="mt-2 text-sm font-semibold text-sky-600 underline decoration-sky-600/40 underline-offset-2 hover:text-sky-700"
                    >
                      {descExpanded ? 'Show less' : 'Show more'}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {showDescriptionHtmlFallback ? (
                <div
                  className={
                    showCredibilityInOverview || overviewBody ? 'pt-6' : ''
                  }
                >
                  <SafeScholarshipHtml html={descriptionHtmlRaw} />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        </ScholarshipDetailGuestLockSection>

        {officialApplicationHref || officialName || lastVerifiedLabel ? (
          <div className="mt-8 pb-0">
            <h2 className="mb-2 text-lg font-semibold tracking-tight text-zinc-900">
              Sponsor & application
            </h2>
            <div
              className={`${scholarshipDetailCardTrustClass} text-sm text-zinc-700`}
            >
              {officialName ? (
                <p className="text-base font-semibold text-zinc-900">
                  {officialName}
                </p>
              ) : null}
              <ul className="mt-4 flex list-none flex-col gap-3 p-0 sm:flex-row sm:items-stretch sm:gap-3">
                {officialApplicationHref ? (
                  <li className="min-w-0 flex-1 basis-0">
                    {hasSubscription ? (
                      <a
                        href={officialApplicationHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={detailApplyPrimaryClass}
                      >
                        Apply now
                      </a>
                    ) : (
                      <button
                        type="button"
                        className={detailApplyPrimaryClass}
                        onClick={openApplyAccessWall}
                        title="Premium subscription required to apply on the official site"
                      >
                        <Lock
                          className="h-4 w-4 shrink-0 text-white stroke-white"
                          strokeWidth={2}
                          aria-hidden
                        />
                        Apply now
                      </button>
                    )}
                  </li>
                ) : null}
                <li className="min-w-0 flex-1 basis-0">
                  <button
                    type="button"
                    aria-pressed={savedIds.includes(scholarship.id)}
                    aria-label={
                      savedIds.includes(scholarship.id)
                        ? 'Remove from saved'
                        : 'Save scholarship'
                    }
                    className={
                      savedIds.includes(scholarship.id)
                        ? `${detailOfficialSavedPillClass} flex h-11 min-h-[2.75rem] items-center justify-center`
                        : `${detailOfficialSavePillClass} flex h-11 min-h-[2.75rem] items-center justify-center`
                    }
                    onClick={async () => {
                      const id = scholarship.id;
                      const wasSaved = savedIds.includes(id);
                      const syncServer =
                        isAuthenticated && hasSubscription;
                      if (!syncServer) {
                        setSavedIds(
                          wasSaved ? removeScholarship(id) : saveScholarship(id)
                        );
                        return;
                      }
                      const ok = wasSaved
                        ? await deleteUserSavedScholarship(id)
                        : await postUserSavedScholarship(id);
                      if (!ok) {
                        toast({
                          title: 'Could not update saved scholarships',
                          description: 'Check your connection and try again.',
                          variant: 'destructive'
                        });
                        return;
                      }
                      setSavedIds(
                        wasSaved ? removeScholarship(id) : saveScholarship(id)
                      );
                    }}
                  >
                    {savedIds.includes(scholarship.id) ? 'Saved вњ“' : 'Save'}
                  </button>
                </li>
                <li className="min-w-0 flex-1 basis-0">
                  {ignoredIds.includes(scholarship.id) ? (
                    <button
                      type="button"
                      className={`${detailOfficialRestorePillClass} flex h-11 min-h-[2.75rem] items-center justify-center`}
                      aria-label="Restore scholarship to matches"
                      onClick={() => {
                        setIgnoredIds(
                          removeIgnoredScholarship(scholarship.id)
                        );
                      }}
                    >
                      Restore to matches
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${detailOfficialNotRelevantPillClass} flex h-11 min-h-[2.75rem] items-center justify-center`}
                      aria-label="Hide scholarship from matches"
                      onClick={() => {
                        setIgnoredIds(addIgnoredScholarship(scholarship.id));
                      }}
                    >
                      Not relevant
                    </button>
                  )}
                </li>
              </ul>
              {lastVerifiedLabel ? (
                <p className="mt-4 text-xs text-zinc-500">
                  Information last verified {lastVerifiedLabel}.
                </p>
              ) : null}
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Always confirm deadlines, requirements, and application details
                on the official page before you apply.
              </p>
            </div>
          </div>
        ) : null}

        {showFaqBlock ? (
          <div className="mt-8 border-t border-zinc-200 pt-6">
            <ScholarshipFaqAccordion items={faqItemsOnPage} />
          </div>
        ) : null}

        {similarScholarships.length > 0 ? (
          <div
            id="similar-scholarships"
            className={`${
              showFaqBlock
                ? 'mt-4'
                : 'mt-3'
            } scroll-mt-24 border-t border-zinc-200 pt-4`}
          >
            <div className="flex flex-col gap-4">
              <Link
                href={backToMatchesHref}
                scroll
                className={detailBackToMatchesLinkClass}
              >
                ← Back to Matches
              </Link>
              <div className="min-w-0 space-y-2">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                  Similar scholarships
                </h2>
                <p className="text-sm leading-relaxed text-zinc-600">
                  <span className="font-semibold text-zinc-800">Open deadlines first</span>{' '}
                  — same category when possible, then active picks from the catalog. Up to three closed
                  grants from this category are shown at the end for context.
                </p>
                <p className="text-xs font-medium text-zinc-500">
                  Category:{' '}
                  <span className="text-zinc-700">
                    {categorySlugForLinks
                      ? breadcrumbCategoryLabel(categorySlugForLinks)
                      : 'All scholarships'}
                  </span>
                </p>
                {categorySlugForLinks ? (
                  <p className="text-sm">
                    <Link
                      href={`/scholarships/category/${encodeURIComponent(categorySlugForLinks)}`}
                      className="font-semibold text-sky-700 underline-offset-2 hover:text-sky-800 hover:underline"
                    >
                      More scholarships in {breadcrumbCategoryLabel(categorySlugForLinks)}
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm">
                    <ScholarshipCatalogEntryLink
                      className="font-semibold text-sky-700 underline-offset-2 hover:text-sky-800 hover:underline"
                    >
                      Browse all scholarships
                    </ScholarshipCatalogEntryLink>
                  </p>
                )}
              </div>
            </div>

            {similarSplitIntoSections ? (
              <div className="mt-6 space-y-8">
                <section aria-labelledby="similar-open-heading">
                  <div className="flex flex-wrap items-end justify-between gap-2 border-b border-emerald-200/70 pb-2.5">
                    <h3
                      id="similar-open-heading"
                      className="text-sm font-semibold tracking-tight text-emerald-900"
                    >
                      Open now
                    </h3>
                    <span className="text-xs font-medium tabular-nums text-emerald-800/80">
                      {similarOpenList.length}{' '}
                      {similarOpenList.length === 1 ? 'scholarship' : 'scholarships'}
                    </span>
                  </div>
                  <ul className={`${similarScholarshipsGridClass} mt-3`} role="list">
                    <SimilarScholarshipIqPromoCard />
                    {similarOpenList.map((s) => (
                      <SimilarScholarshipDetailListItem
                        key={s.id}
                        scholarship={s}
                        highlightPrimary={s.id === similarFirstOpenId}
                        profileMatchPercent={s.profileMatchPercent ?? null}
                        isPrimarySimilarOpen={s.id === similarFirstOpenId}
                        eligibleForMatchPill
                        isAuthenticated={isAuthenticated}
                        hasSubscription={hasSubscription}
                        authResolved={authResolved}
                        needsEmailConfirmation={needsEmailConfirmation}
                        onUnverifiedEmailDetailNavigate={openEmailConfirmModal}
                        onGuestDetailNavigate={() => openRegistrationWall('grant-guest')}
                        onSubscriptionDetailNavigate={() =>
                          openRegistrationWall('card-unlock')
                        }
                        onLockedScholarshipNavigate={openLockedScholarshipWallForSimilar}
                      />
                    ))}
                  </ul>
                </section>

                <section aria-labelledby="similar-closed-heading">
                  <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-200 pb-2.5">
                    <h3
                      id="similar-closed-heading"
                      className="text-sm font-semibold tracking-tight text-zinc-600"
                    >
                      Past deadline
                    </h3>
                    <span className="text-xs text-zinc-500">Same category · reference only</span>
                  </div>
                  <ul className={`${similarScholarshipsGridClass} mt-3`} role="list">
                    {similarClosedList.map((s) => (
                      <SimilarScholarshipDetailListItem
                        key={s.id}
                        scholarship={s}
                        highlightPrimary={false}
                        profileMatchPercent={s.profileMatchPercent ?? null}
                        isPrimarySimilarOpen={false}
                        eligibleForMatchPill={false}
                        isAuthenticated={isAuthenticated}
                        hasSubscription={hasSubscription}
                        authResolved={authResolved}
                        needsEmailConfirmation={needsEmailConfirmation}
                        onUnverifiedEmailDetailNavigate={openEmailConfirmModal}
                        onGuestDetailNavigate={() => openRegistrationWall('grant-guest')}
                        onSubscriptionDetailNavigate={() =>
                          openRegistrationWall('card-unlock')
                        }
                        onLockedScholarshipNavigate={openLockedScholarshipWallForSimilar}
                      />
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <ul className={`${similarScholarshipsGridClass} mt-5`} role="list">
                <SimilarScholarshipIqPromoCard />
                {similarScholarshipsWithMatch.map((s) => {
                  const isOpen = !scholarshipDeadlineHasPassed(s);
                  const isPrimaryOpen = isOpen && s.id === similarFirstOpenId;
                  return (
                    <SimilarScholarshipDetailListItem
                      key={s.id}
                      scholarship={s}
                      highlightPrimary={Boolean(isPrimaryOpen)}
                      profileMatchPercent={s.profileMatchPercent ?? null}
                      isPrimarySimilarOpen={Boolean(isPrimaryOpen)}
                      eligibleForMatchPill={isOpen}
                      isAuthenticated={isAuthenticated}
                      hasSubscription={hasSubscription}
                      authResolved={authResolved}
                      needsEmailConfirmation={needsEmailConfirmation}
                      onUnverifiedEmailDetailNavigate={openEmailConfirmModal}
                      onGuestDetailNavigate={() => openRegistrationWall('grant-guest')}
                      onSubscriptionDetailNavigate={() =>
                        openRegistrationWall('card-unlock')
                      }
                      onLockedScholarshipNavigate={openLockedScholarshipWallForSimilar}
                    />
                  );
                })}
              </ul>
            )}

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <Link
                href={backToMatchesHref}
                scroll
                className={detailBackToMatchesLinkClass}
              >
                ← Back to Matches
              </Link>
            </div>
          </div>
        ) : null}

        </div>
    </section>
    {premiumPaywallModal}
    {registrationWallModal}
    {emailConfirmRequiredModal}
    </DarkTooltipProvider>
  );
}
