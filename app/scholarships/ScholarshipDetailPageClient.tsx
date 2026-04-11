'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Infinity as InfinityIcon,
  Instagram,
  HelpCircle,
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
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import ScholarshipSubscriptionOfferModal from '@/components/scholarships/ScholarshipSubscriptionOfferModal';
import { breadcrumbCategoryLabel } from '@/app/scholarships/scholarshipCategories';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { SCHOLARSHIPS_HUB_ALL_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import {
  fieldOfStudyDisplayList,
  formatDeadlineTooltipText,
  formatScholarshipAwardDisplay,
  getScholarshipDeadlineDisplayParts,
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
  scholarshipSavedButtonClass,
  scholarshipSaveButtonClass
} from '@/lib/constants/scholarshipActionUi';
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
  formatScholarshipAwardLine,
  resolveScholarshipCategorySlug,
  scholarshipDeadlineHasPassed
} from '@/lib/scholarships/similarScholarships';
import { getScholarshipCatalog } from '@/lib/scholarships/scholarshipCatalog';
import {
  computeScholarshipProfileMatchPercent,
  type ScholarshipProfileMatchFields
} from '@/lib/scholarships/scholarshipMatch';
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

const TOOLTIP_APPLICANTS =
  'This number shows applicants who submitted their applications through ScholarshipOwl.';

const TOOLTIP_REQUIREMENTS =
  'Counts how many eligibility requirements we list for this scholarship.';

const TOOLTIP_NOT_VERIFIED =
  'We have not independently verified this scholarship yet.';

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

/** Full date/time + timezone name for deadline help tooltip (matches competitor-style detail). */
function formatDeadlinePreciseTooltip(s: Scholarship): string {
  if (s.deadlineAt) {
    const d = new Date(s.deadlineAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'long'
      });
    }
  }
  return formatDeadlineTooltipText(s);
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

function SimilarScholarshipDetailListItem({
  scholarship: s,
  highlightPrimary,
  profileMatchPercent,
  isPrimarySimilarOpen,
  eligibleForMatchPill,
  isAuthenticated,
  hasSubscription,
  onSubscriptionOffer
}: {
  scholarship: Scholarship;
  highlightPrimary: boolean;
  profileMatchPercent: number | null;
  isPrimarySimilarOpen: boolean;
  /** Open-deadline similar rows only (not “past deadline” reference cards). */
  eligibleForMatchPill: boolean;
  isAuthenticated: boolean;
  hasSubscription: boolean;
  onSubscriptionOffer: () => void;
}) {
  const deadlinePassed = scholarshipDeadlineHasPassed(s);
  const simDd = getScholarshipDeadlineDisplayParts(s);
  const similarEasyApplyIds = getScholarshipCatalog(s).easyApplyIds;
  const similarSubscriptionLocked =
    isAuthenticated &&
    !hasSubscription &&
    (similarEasyApplyIds.includes('easy_apply') ||
      similarEasyApplyIds.includes('quick_apply'));

  const showBestRecommendation =
    eligibleForMatchPill &&
    isPrimarySimilarOpen &&
    profileMatchPercent === 100;
  const showMatchPercentPill =
    eligibleForMatchPill &&
    !showBestRecommendation &&
    profileMatchPercent != null &&
    profileMatchPercent >= 70 &&
    profileMatchPercent <= 90;

  const awardLine = formatScholarshipAwardLine(s);

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
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 text-left">
          <span
            className={`block text-left text-base font-semibold leading-snug ${deadlinePassed ? 'text-zinc-500' : 'text-zinc-900'}`}
          >
            {s.title}
          </span>
          {s.provider ? (
            <span
              className={`mt-1.5 block text-left text-sm ${deadlinePassed ? 'text-zinc-400' : 'text-zinc-600'}`}
            >
              {s.provider}
            </span>
          ) : null}
          {recommendationPill ? (
            <div className="mt-2.5 flex min-h-[1.75rem] items-start">{recommendationPill}</div>
          ) : null}
        </div>
        <div className="flex w-[min(11rem,42%)] shrink-0 flex-col items-end gap-1.5 text-right">
          {similarSubscriptionLocked ? (
            <span
              className="pointer-events-none inline-flex h-[22px] w-[34px] shrink-0 items-center justify-center rounded-md bg-[#FF7A1A] text-white shadow-sm"
              aria-hidden
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
          ) : null}
          <span
            className={`block w-full text-base font-semibold tabular-nums leading-tight sm:text-[1.0625rem] ${
              deadlinePassed ? 'text-zinc-500' : 'text-zinc-900'
            }`}
          >
            {awardLine}
          </span>
          <div
            className={
              deadlinePassed
                ? 'w-full text-xs font-normal italic text-zinc-400'
                : 'w-full text-xs font-medium text-zinc-700'
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
        </div>
      </div>
    </div>
  );

  return (
    <li className="min-w-0">
      {similarSubscriptionLocked ? (
        <button
          type="button"
          className={similarScholarshipCardClassName(highlightPrimary, deadlinePassed)}
          onClick={onSubscriptionOffer}
          title="Start your free access to open this scholarship"
          aria-label="Locked scholarship. Start free access to open."
        >
          {cardInner}
        </button>
      ) : (
        <Link
          href={scholarshipPublicPath(s)}
          className={similarScholarshipCardClassName(highlightPrimary, deadlinePassed)}
        >
          {cardInner}
        </Link>
      )}
    </li>
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
  lines
}: {
  html?: string | null;
  lines: string[];
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
          <span className="whitespace-pre-line">{item}</span>
        </li>
      ))}
    </ul>
  );
}

type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

function StatCard({
  primary,
  secondary,
  extra,
  tooltip,
  tooltipSide = 'bottom',
  tooltipAlign = 'end',
  deadlineFooter
}: {
  primary: string;
  secondary: string;
  extra?: React.ReactNode;
  tooltip?: React.ReactNode;
  tooltipSide?: TooltipSide;
  tooltipAlign?: 'start' | 'center' | 'end';
  /** Green calendar icon + label row (deadline card). */
  deadlineFooter?: boolean;
}) {
  return (
    <div className="relative flex h-full min-h-[6.5rem] flex-col justify-center rounded-xl border border-zinc-200/90 bg-white px-5 py-4 shadow-sm ring-1 ring-zinc-100/50">
      {tooltip != null ? (
        <DarkTooltip
          content={tooltip}
          side={tooltipSide}
          align={tooltipAlign}
          className="absolute right-3 top-3 z-10"
        >
          <button
            type="button"
            aria-label="More information"
            className="rounded-full p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </DarkTooltip>
      ) : null}
      <p className="pr-8 text-xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-2xl">
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
    </div>
  );
}

type DetailLoadState = 'loading' | 'ok' | 'not_found' | 'error';

export default function ScholarshipDetailPageClient({
  isAuthenticated = true,
  hasSubscription = false,
  authResolved = true,
  initialScholarship = null
}: {
  isAuthenticated?: boolean;
  hasSubscription?: boolean;
  authResolved?: boolean;
  initialScholarship?: Scholarship | null;
} = {}) {
  const layoutInitialScholarship = useScholarshipDetailInitialData();
  const serverScholarship = initialScholarship ?? layoutInitialScholarship;
  const params = useParams();
  const routeParam = useMemo((): string | undefined => {
    const raw = params?.slugPath;
    if (Array.isArray(raw)) {
      const parts = raw
        .map((s) => decodeURIComponent(String(s)).trim())
        .filter(Boolean);
      if (parts.length === 1) return parts[0];
      return undefined;
    }
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return undefined;
  }, [params]);

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
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [subscriptionOfferOpen, setSubscriptionOfferOpen] = useState(false);
  const [profileMatchPercent, setProfileMatchPercent] = useState<number | null>(
    null
  );
  const openRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(true);
  }, []);
  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);
  const openSubscriptionOffer = useCallback(() => {
    setSubscriptionOfferOpen(true);
  }, []);
  const closeSubscriptionOffer = useCallback(() => {
    setSubscriptionOfferOpen(false);
  }, []);
  const syncIdsFromStorage = useCallback(() => {
    setSavedIds(getSavedScholarshipIds());
    setIgnoredIds(getIgnoredScholarshipIds());
    setStartedIds(getStartedScholarshipIds());
    setSubmittedIds(getSubmittedScholarshipIds());
  }, []);
  const easyApplyIds = scholarship ? getScholarshipCatalog(scholarship).easyApplyIds : [];
  const isEasyApplySubscriptionLocked =
    isAuthenticated &&
    !hasSubscription &&
    (easyApplyIds.includes('easy_apply') || easyApplyIds.includes('quick_apply'));
  const hasDetailAccess = isAuthenticated && !isEasyApplySubscriptionLocked;

  useEffect(() => {
    syncIdsFromStorage();
  }, [syncIdsFromStorage]);

  useEffect(() => {
    if (!isAuthenticated || !authResolved) {
      setProfileMatchPercent(null);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    void (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setProfileMatchPercent(null);
        return;
      }
      const { data: row } = await supabase
        .from('profiles')
        .select(
          'field_of_study, field_of_study_label, school_level, citizenship_status, state_region, gpa'
        )
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!row) {
        setProfileMatchPercent(null);
        return;
      }
      setProfileMatchPercent(
        computeScholarshipProfileMatchPercent(
          row as ScholarshipProfileMatchFields
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authResolved]);

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

    const initialMatchesRoute =
      serverScholarship != null &&
      scholarshipPublicPath(serverScholarship)
        .split('/')
        .filter(Boolean)
        .slice(-1)[0] === routeParam;
    if (initialMatchesRoute) {
      setScholarship(serverScholarship);
      setDetailLoadState('ok');
      const needsHydratedPremiumFields =
        Boolean(serverScholarship?.premiumFieldsRedacted) && hasDetailAccess;
      if (!needsHydratedPremiumFields) {
        return;
      }
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
    sp.set('limit', '8');
    if (slug) sp.set('similar_category_slug', slug);

    postScholarshipsList({ searchParams: sp.toString() })
      .then((r) => {
        if (!cancelled) setSimilarScholarships(r.scholarships);
      })
      .catch(() => {
        if (!cancelled) setSimilarScholarships([]);
      });

    return () => {
      cancelled = true;
    };
  }, [scholarship]);

  const registrationWallModal = (
    <ScholarshipRegistrationWallModal
      open={registrationWallOpen}
      onClose={closeRegistrationWall}
    />
  );
  const subscriptionOfferModal = (
    <ScholarshipSubscriptionOfferModal
      open={subscriptionOfferOpen}
      onClose={closeSubscriptionOffer}
    />
  );

  const categorySlugForLinks = useMemo(
    () => (scholarship ? resolveScholarshipCategorySlug(scholarship) : null),
    [scholarship]
  );

  if (detailLoadState === 'loading') {
    return (
      <DarkTooltipProvider>
        <section
          className={`${scholarshipDetailPageBgClass} px-4 py-8 sm:px-5 md:py-12 lg:px-8`}
        >
          <div className={scholarshipDetailShellClass}>
            <div className="flex min-h-[50vh] w-full items-center justify-center">
              <p className="text-zinc-600">Loading scholarships...</p>
            </div>
          </div>
        </section>
        {registrationWallModal}
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
        {registrationWallModal}
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
              href={SCHOLARSHIPS_HUB_ALL_MATCHES_HREF}
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
        {registrationWallModal}
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
  const awardDisplay = formatScholarshipAwardDisplay(awardCatalogText);
  const hasAwardStat = Boolean(awardCatalogText);

  const hasApplicantsStat =
    typeof scholarship.applicantCount === 'number' &&
    !Number.isNaN(scholarship.applicantCount);

  const winnerPaymentRaw = scholarship.winnerPayment?.trim() ?? '';
  const paymentDetailsRaw = scholarship.paymentDetails?.trim() ?? '';
  const paymentHtmlRaw = scholarship.paymentHtml?.trim() ?? '';
  const paymentNarrative = pickSinglePaymentNarrative(
    paymentDetailsRaw,
    winnerPaymentRaw
  );

  const providerName = scholarship.provider?.trim();
  const providerSlugTrimmed = scholarship.providerSlug?.trim() ?? '';
  const providerProfileHref = providerSlugTrimmed
    ? `/providers/${encodeURIComponent(providerSlugTrimmed)}`
    : null;
  const providerMissionRaw = scholarship.providerMission?.trim() ?? '';
  const hasMission = Boolean(providerMissionRaw);
  const showMissionCompact =
    hasMission && providerMissionRaw.length > 0 && providerMissionRaw.length <= 420;
  const providerUrlRaw = scholarship.providerUrl?.trim();
  const logoUrl = scholarship.providerLogo?.trim();
  const social = scholarship.socialLinks;
  const hasSocial = Boolean(
    social?.facebook || social?.instagram || social?.linkedin
  );

  const showProviderSection =
    Boolean(providerName) ||
    Boolean(providerUrlRaw) ||
    Boolean(logoUrl) ||
    hasSocial ||
    hasMission;

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
  const detailApplyPrimaryClass =
    'inline-flex h-11 min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:px-6 sm:text-base';

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
  const showSupport = Boolean(supportEmail) || Boolean(supportPhone);

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
  const faqItemsOnPage = showUsefulFaqPage
    ? filterFaqForOnPageDisplay(scholarship, {
        heroSummary: ui.heroSummary,
        awardLine: awardCatalogText,
        deadlinePrimary
      })
    : [];

  const similarOpenList = similarScholarships.filter(
    (s) => !scholarshipDeadlineHasPassed(s)
  );
  const similarClosedList = similarScholarships.filter((s) =>
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

  const beforeChecks = scholarship.aiImportantChecks ?? [];
  const beforeMissing = scholarship.aiMissingInfo ?? [];
  const beforeFlags = scholarship.aiRedFlags ?? [];
  const hasBeforeYouApplyContent =
    panelPick.showBeforeYouApply &&
    (beforeChecks.length > 0 ||
      beforeMissing.length > 0 ||
      beforeFlags.length > 0);

  const hasQuickDecisionGridContent =
    panelPick.showQuickDecision &&
    (ui.quickDecision.bestFor.length > 0 ||
      ui.quickDecision.highlights.length > 0 ||
      ui.quickDecision.whyApply.length > 0 ||
      quickChecksForGrid.length > 0);

  const hasLockedDetailStack =
    hasQuickDecisionGridContent ||
    whoLines.length > 0 ||
    showEligibilityHtmlFallback ||
    hasQuickFacts ||
    showSupport ||
    hasBeforeYouApplyContent ||
    showNextStepsBlock ||
    showApplicationTips ||
    hasRequirementsSection ||
    docs.length > 0 ||
    showSeoApplication ||
    hasAwardPaymentBlock ||
    hasImportantNotes ||
    showProviderSection ||
    showOverviewSection;
  const isApplySubscriptionLocked = isAuthenticated && !hasSubscription;
  const showLockedDetailOverlay =
    authResolved && !hasDetailAccess && hasLockedDetailStack;
  const openLockedAccessWall = isEasyApplySubscriptionLocked
    ? openSubscriptionOffer
    : openRegistrationWall;
  const openApplyAccessWall = isApplySubscriptionLocked
    ? openSubscriptionOffer
    : openRegistrationWall;

  return (
    <DarkTooltipProvider>
      <section
        className={`${scholarshipDetailPageBgClass} px-4 py-8 sm:px-5 md:py-12 lg:px-8`}
      >
        <div className={scholarshipDetailShellClass}>
        <Link
          href={SCHOLARSHIPS_HUB_ALL_MATCHES_HREF}
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
                href={SCHOLARSHIPS_HUB_ALL_MATCHES_HREF}
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
              {scholarship.title}
            </li>
          </ol>
        </nav>

        <div className="mt-5 min-w-0">
          <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-zinc-900 sm:text-4xl md:text-[2.25rem] md:leading-tight">
            {scholarship.title}
          </h1>
          <HeroDecisionBadges
            matchBadge={ui.matchBadge}
            urgencyBadge={ui.urgencyBadge}
            difficultyBadge={ui.difficultyBadge}
          />
          {heroIntro ? (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600 md:text-lg">
              {heroIntro}
            </p>
          ) : null}
        </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {hasDeadlineStat ? (
            <StatCard
              primary={deadlinePrimary}
              secondary={deadlineSecondaryLine ?? 'Scholarship deadline'}
              deadlineFooter
              extra={recurringExtra}
              tooltip={formatDeadlinePreciseTooltip(scholarship)}
              tooltipSide="bottom"
            />
          ) : null}
          {hasAwardStat ? (
            <StatCard primary={awardDisplay} secondary="Award amount" />
          ) : null}
          {hasApplicantsStat ? (
            <StatCard
              primary={scholarship.applicantCount!.toLocaleString()}
              secondary="Scholarship applicants"
              tooltip={TOOLTIP_APPLICANTS}
              tooltipSide="right"
              tooltipAlign="center"
            />
          ) : null}
          <StatCard
            primary={String(reqCount)}
            secondary="Requirements"
            tooltip={TOOLTIP_REQUIREMENTS}
            tooltipSide="bottom"
          />
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
          />
        ) : null}
        {ui.lowConfidenceAi ? (
          <div className="mt-4 min-w-0">
            <AiLowConfidenceNote />
          </div>
        ) : null}
        {whoLines.length > 0 ? (
          <div className="mt-10">
            <SectionLabel>Who can apply</SectionLabel>
            <div className={scholarshipDetailCardPrimaryClass}>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                {whoLines.map((item, i) => (
                  <li key={`who-${i}-${item.slice(0, 40)}`}>{item}</li>
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
                  <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                    {institutionsLine}
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
                ) : null}
                {supportPhone ? (
                  <a
                    href={`tel:${supportPhone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
                  >
                    <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {supportPhone}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {panelPick.showBeforeYouApply ? (
          <ScholarshipBeforeYouApplyBlock
            checks={scholarship.aiImportantChecks ?? []}
            missing={scholarship.aiMissingInfo ?? []}
            redFlags={scholarship.aiRedFlags ?? []}
          />
        ) : null}

        {showNextStepsBlock ? (
          <ScholarshipNextStepsBlock items={nextStepActions} />
        ) : null}

        {showApplicationTips ? (
          <ScholarshipApplicationTipsBlock items={filteredTips} />
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
                        <li key={`req-${i}-${item.slice(0, 40)}`}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  {reqDisplayLines.length === 0 && requirementsHtmlRaw ? (
                    <RequirementsRichOrList
                      html={scholarship.requirementsHtml}
                      lines={eligibilityItems}
                    />
                  ) : null}
                  {reqCleanLines.length === 0 &&
                  !requirementsHtmlRaw &&
                  eligibilityItems.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                      {eligibilityItems.map((item, i) => (
                        <li key={`elig-${i}-${item.slice(0, 40)}`}>{item}</li>
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
                        <li key={`req-${i}-${item.slice(0, 40)}`}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  {reqDisplayLines.length === 0 && requirementsHtmlRaw ? (
                    <RequirementsRichOrList
                      html={scholarship.requirementsHtml}
                      lines={eligibilityItems}
                    />
                  ) : null}
                  {reqCleanLines.length === 0 &&
                  !requirementsHtmlRaw &&
                  eligibilityItems.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
                      {eligibilityItems.map((item, i) => (
                        <li key={`elig-${i}-${item.slice(0, 40)}`}>{item}</li>
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
                  {awardDisplay}
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

        {showProviderSection ? (
          <div className="mt-10">
            <SectionLabel variant="support">About the provider</SectionLabel>
            <div className={scholarshipDetailCardSupportClass}>
              <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
                {providerProfileHref ? (
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
                        <p className="text-lg font-semibold text-zinc-900 underline-offset-2 transition group-hover:text-emerald-800 group-hover:underline">
                          {providerName}
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-zinc-600 underline-offset-2 transition group-hover:text-emerald-800 group-hover:underline">
                          View provider profile
                        </p>
                      )}
                    </div>
                  </Link>
                ) : (
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
                      ) : null}
                    </div>
                  </div>
                )}
                {providerUrlRaw ? (
                  <a
                    href={providerUrlRaw}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1 text-sm font-medium text-sky-700 underline-offset-2 hover:underline sm:ml-14"
                  >
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    Provider website
                  </a>
                ) : null}
              </div>
              {showMissionCompact ? (
                <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                  {providerMissionRaw}
                </p>
              ) : null}
              {social && hasSocial ? (
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
                  <DarkTooltip
                    content={
                      scholarship.verified ? (
                        <div className="space-y-2 font-bold leading-snug">
                          <p>Verified: Extremely safe.</p>
                          <p>
                            Scholarship award guaranteed by ScholarshipOwl.
                          </p>
                        </div>
                      ) : (
                        TOOLTIP_NOT_VERIFIED
                      )
                    }
                    side="bottom"
                    align="start"
                  >
                    <button
                      type="button"
                      className="mt-1 flex max-w-full items-center gap-2 rounded-lg p-1 text-left -m-1 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                    >
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
                    </button>
                  </DarkTooltip>
                </div>
              ) : null}
              {overviewBody ? (
                <div className={showCredibilityInOverview ? 'pt-6' : ''}>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 md:text-base">
                    {overviewShown}
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

        {applyHref || officialName || lastVerifiedLabel ? (
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
                {applyHref ? (
                  <li className="min-w-0 flex-1 basis-0">
                    {isAuthenticated && !isApplySubscriptionLocked ? (
                      <a
                        href={applyHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={detailApplyPrimaryClass}
                      >
                        Apply on official site
                      </a>
                    ) : (
                      <button
                        type="button"
                        className={detailApplyPrimaryClass}
                        onClick={openApplyAccessWall}
                        title={
                          isApplySubscriptionLocked
                            ? 'Start your free access to apply on the official site'
                            : 'Create a free account to apply on the official site'
                        }
                      >
                        <Lock
                          className="h-4 w-4 shrink-0 text-white stroke-white"
                          strokeWidth={2}
                          aria-hidden
                        />
                        Apply on official site
                      </button>
                    )}
                  </li>
                ) : null}
                <li className="min-w-0 flex-1 basis-0">
                  {hasDetailAccess ? (
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
                      onClick={() => {
                        const id = scholarship.id;
                        setSavedIds(
                          savedIds.includes(id)
                            ? removeScholarship(id)
                            : saveScholarship(id)
                        );
                      }}
                    >
                      {savedIds.includes(scholarship.id) ? 'Saved ✓' : 'Save'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${detailOfficialSavePillClass} flex h-11 min-h-[2.75rem] items-center justify-center gap-2`}
                      onClick={openLockedAccessWall}
                      title={
                        isEasyApplySubscriptionLocked
                          ? 'Start your free access to save scholarships'
                          : 'Create a free account to save scholarships'
                      }
                      aria-label={
                        isEasyApplySubscriptionLocked
                          ? 'Start your free access to save scholarships'
                          : 'Create a free account to save scholarships'
                      }
                    >
                      <Lock
                        className="h-4 w-4 shrink-0 text-white stroke-white"
                        strokeWidth={2}
                        aria-hidden
                      />
                      Save
                    </button>
                  )}
                </li>
                <li className="min-w-0 flex-1 basis-0">
                  {ignoredIds.includes(scholarship.id) ? (
                    hasDetailAccess ? (
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
                        className={`${detailOfficialRestorePillClass} flex h-11 min-h-[2.75rem] items-center justify-center gap-2`}
                        onClick={openLockedAccessWall}
                        title={
                          isEasyApplySubscriptionLocked
                            ? 'Start your free access to restore this scholarship to matches'
                            : 'Create a free account to restore this scholarship to matches'
                        }
                        aria-label={
                          isEasyApplySubscriptionLocked
                            ? 'Start your free access to restore this scholarship to matches'
                            : 'Create a free account to restore this scholarship to matches'
                        }
                      >
                        <Lock
                          className="h-4 w-4 shrink-0 text-white stroke-white"
                          strokeWidth={2}
                          aria-hidden
                        />
                        Restore to matches
                      </button>
                    )
                  ) : hasDetailAccess ? (
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
                  ) : (
                    <button
                      type="button"
                      className={`${detailOfficialNotRelevantPillClass} flex h-11 min-h-[2.75rem] items-center justify-center gap-2`}
                      onClick={openLockedAccessWall}
                      title={
                        isEasyApplySubscriptionLocked
                          ? 'Start your free access to hide scholarships from matches'
                          : 'Create a free account to hide scholarships from matches'
                      }
                      aria-label={
                        isEasyApplySubscriptionLocked
                          ? 'Start your free access to hide scholarships from matches'
                          : 'Create a free account to hide scholarships from matches'
                      }
                    >
                      <Lock
                        className="h-4 w-4 shrink-0 text-white stroke-white"
                        strokeWidth={2}
                        aria-hidden
                      />
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

        {showUsefulFaqPage && faqItemsOnPage.length >= 2 ? (
          <div className="mt-3 border-t border-zinc-200 pt-4">
            <ScholarshipFaqAccordion items={faqItemsOnPage} />
          </div>
        ) : null}

        {similarScholarships.length > 0 ? (
          <div
            className={`${
              showUsefulFaqPage && faqItemsOnPage.length >= 2
                ? 'mt-4'
                : 'mt-3'
            } border-t border-zinc-200 pt-4`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
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
              </div>
              <Link
                href={SCHOLARSHIPS_HUB_ALL_MATCHES_HREF}
                scroll
                className={`shrink-0 self-start sm:self-auto ${detailBackToMatchesLinkClass}`}
              >
                ← Back to Matches
              </Link>
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
                    {similarOpenList.map((s) => (
                      <SimilarScholarshipDetailListItem
                        key={s.id}
                        scholarship={s}
                        highlightPrimary={s.id === similarFirstOpenId}
                        profileMatchPercent={profileMatchPercent}
                        isPrimarySimilarOpen={s.id === similarFirstOpenId}
                        eligibleForMatchPill
                        isAuthenticated={isAuthenticated}
                        hasSubscription={hasSubscription}
                        onSubscriptionOffer={openSubscriptionOffer}
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
                        profileMatchPercent={profileMatchPercent}
                        isPrimarySimilarOpen={false}
                        eligibleForMatchPill={false}
                        isAuthenticated={isAuthenticated}
                        hasSubscription={hasSubscription}
                        onSubscriptionOffer={openSubscriptionOffer}
                      />
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <ul className={`${similarScholarshipsGridClass} mt-5`} role="list">
                {similarScholarships.map((s) => {
                  const isOpen = !scholarshipDeadlineHasPassed(s);
                  const isPrimaryOpen = isOpen && s.id === similarFirstOpenId;
                  return (
                    <SimilarScholarshipDetailListItem
                      key={s.id}
                      scholarship={s}
                      highlightPrimary={Boolean(isPrimaryOpen)}
                      profileMatchPercent={profileMatchPercent}
                      isPrimarySimilarOpen={Boolean(isPrimaryOpen)}
                      eligibleForMatchPill={isOpen}
                      isAuthenticated={isAuthenticated}
                      hasSubscription={hasSubscription}
                      onSubscriptionOffer={openSubscriptionOffer}
                    />
                  );
                })}
              </ul>
            )}

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <Link
                href={SCHOLARSHIPS_HUB_ALL_MATCHES_HREF}
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
    {registrationWallModal}
    {subscriptionOfferModal}
    </DarkTooltipProvider>
  );
}
