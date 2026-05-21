'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Ban,
  Flame,
  Globe,
  Heart,
  Layers,
  Timer,
  Trophy,
  type LucideIcon
} from 'lucide-react';

import {
  SCHOLARSHIPS_HUB_INTERNATIONAL_FRIENDLY_HREF,
  buildScholarshipTabHref
} from '@/app/scholarships/scholarshipListUrl';
import {
  localizedScholarshipHubTabHref,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';
import type {
  ScholarshipListTabId,
  ScholarshipSidebarCounts
} from '@/app/scholarships/scholarshipTabs';

import {
  parseHubScholarshipTabParam,
  parseHubScholarshipTabParamForGuest
} from '@/app/scholarships/scholarshipTabs';
import { hubResolvedFromPathname } from '@/app/scholarships/scholarshipHubPath';
import { DarkTooltip } from '@/components/ui/DarkTooltip';
import {
  scholarshipSidebarActiveRowClass
} from '@/lib/constants/scholarshipActionUi';
import { ScholarshipsSidebarAiMentorCard } from '@/components/scholarships/ScholarshipsSidebarAiMentorCard';
import {
  getScholarshipsHubUiCopy,
  type ScholarshipsHubUiCopy
} from '@/lib/i18n/scholarshipsHubUiCopy';
import { stripLocalePrefix } from '@/lib/i18n/paths';

export type { ScholarshipSidebarCounts };

/**
 * Hub / category: “International Friendly” under Hot Deadlines —
 * same row chrome as other sidebar links (icon, label, optional count, lock).
 */
export type ScholarshipsSidebarInternationalFilterProps = {
  /** Row highlight when the international filter is applied. */
  active: boolean;
  /** Canonical listing URL for international-friendly scope. */
  href?: string;
  /** Ungated: apply filter and refresh grants immediately. */
  onActivate: () => void;
  showGuestLock: boolean;
  showSubscriptionLock: boolean;
  onGuestRestrictedClick: () => void;
  onSubscriptionRestrictedClick: () => void;
};

type NavDef = {
  id: ScholarshipListTabId;
  label: string;
  icon: LucideIcon;
  tooltip: string;
};

type StaticNavDef = {
  id: 'best-recommendation';
  label: string;
  icon: LucideIcon;
};

/**
 * Hub guests: tabs that render as locked buttons instead of links.
 * Empty — guests may open every sidebar tab (subscription locks still apply when signed in without a plan).
 */
const GUEST_GATED_TAB_IDS = new Set<ScholarshipListTabId>();

/** Paid-only tabs for signed-in users without active subscription. */
const SUBSCRIPTION_GATED_TAB_IDS = new Set<ScholarshipListTabId>([
  'easy-apply',
  'hot-deadlines'
]);

function buildStaticTopRows(ui: ScholarshipsHubUiCopy): StaticNavDef[] {
  return [
    {
      id: 'best-recommendation',
      label: ui.sidebar.bestRecommendation,
      icon: Flame
    }
  ];
}

function buildActionNavDefs(ui: ScholarshipsHubUiCopy): NavDef[] {
  return [
    {
      id: 'easy-apply',
      label: ui.sidebar.easyApply,
      icon: Trophy,
      tooltip: ui.sidebar.easyApplyTooltip
    },
    {
      id: 'hot-deadlines',
      label: ui.sidebar.hotDeadlines,
      icon: Timer,
      tooltip: ui.sidebar.hotDeadlinesTooltip
    },
    {
      id: 'matches',
      label: ui.sidebar.matches,
      icon: Layers,
      tooltip: ui.sidebar.matchesTooltip
    },
    {
      id: 'saved',
      label: ui.sidebar.saved,
      icon: Heart,
      tooltip: ui.sidebar.savedTooltip
    },
    {
      id: 'ignored',
      label: ui.sidebar.ignored,
      icon: Ban,
      tooltip: ui.sidebar.ignoredTooltip
    }
  ];
}

function isScholarshipListPath(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  return path === '/scholarships' || path.startsWith('/scholarships/');
}

function resolveActiveTabId(
  pathname: string | null,
  searchParams: URLSearchParams | null,
  guestMode?: boolean
): ScholarshipListTabId | null {
  if (!pathname) return null;
  const path = stripLocalePrefix(pathname);
  if (path.startsWith('/scholarships/category/')) return 'matches';
  const isDetail =
    /^\/scholarships\/[^/]+$/.test(path) && path !== '/scholarships';
  if (isDetail) return 'matches';

  if (!isScholarshipListPath(pathname)) return null;

  const hubResolved = hubResolvedFromPathname(path);
  if (hubResolved) {
    const raw = searchParams?.get('tab') ?? null;
    if (raw === 'from-email') return null;
    const fromPath = hubResolved.tab;
    return guestMode
      ? parseHubScholarshipTabParamForGuest(fromPath)
      : fromPath;
  }

  const raw = searchParams?.get('tab') ?? null;
  if (raw === 'from-email') return null;
  return guestMode
    ? parseHubScholarshipTabParamForGuest(raw)
    : parseHubScholarshipTabParam(raw);
}

type ScholarshipsSidebarProps = {
  counts: ScholarshipSidebarCounts;
  /** Hide numeric badges until counts are synced for the current page state. */
  showCounts?: boolean;
  /** Оранжевый блок NEW + число непрочитанных во вкладке Matches (локально). */
  matchesNewIndicator?: { count: number } | null;
  useDarkTooltips?: boolean;
  /** Unauthenticated hub: default tab is All; active state follows guest URL rules. */
  guestMode?: boolean;
  /** When set, gated sidebar rows call this instead of navigating (guest only). */
  onGuestRestrictedNav?: () => void;
  /** Signed-in user has no active subscription; show lock for paid tabs. */
  subscriptionLocked?: boolean;
  /** When set, subscription-gated rows call this instead of navigating. */
  onSubscriptionRestrictedNav?: () => void;
  /** Optional row under Hot Deadlines — international audience filter + lock for free signed-in users. */
  internationalStudentsFilter?: ScholarshipsSidebarInternationalFilterProps | null;
  buildTabHref?: (id: ScholarshipListTabId) => string;
  locale?: LocalizedUiLocale;
  uiCopy?: ScholarshipsHubUiCopy;
};

export default function ScholarshipsSidebar({
  counts,
  showCounts = true,
  matchesNewIndicator,
  useDarkTooltips = false,
  guestMode = false,
  onGuestRestrictedNav,
  subscriptionLocked = false,
  onSubscriptionRestrictedNav,
  internationalStudentsFilter = null,
  buildTabHref,
  locale = 'en',
  uiCopy
}: ScholarshipsSidebarProps) {
  const tabHrefFor = (id: ScholarshipListTabId) =>
    buildTabHref?.(id) ??
    (locale !== 'en'
      ? localizedScholarshipHubTabHref(locale, id)
      : buildScholarshipTabHref(id));
  const ui = uiCopy ?? getScholarshipsHubUiCopy(locale);
  const staticTopRows = buildStaticTopRows(ui);
  const actionNavDefs = buildActionNavDefs(ui);
  const [pathname, setPathname] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromLocation = () => {
      setTimeout(() => {
        setPathname(window.location.pathname);
        setSearchParams(new URLSearchParams(window.location.search));
      }, 0);
    };
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      syncFromLocation();
    };
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      syncFromLocation();
    };
    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, []);
  const activeTab = resolveActiveTabId(pathname, searchParams, guestMode);

  const suffix = (id: ScholarshipListTabId): string | undefined => {
    if (!showCounts) return undefined;
    let n: number;
    switch (id) {
      case 'best-recommendation':
        n = counts.bestRecommendation;
        break;
      case 'recommended':
        n = counts.recommended;
        break;
      case 'matches':
        n = counts.matches;
        break;
      case 'easy-apply':
        n = counts.easyApply;
        break;
      case 'hot-deadlines':
        n = counts.hotDeadlines;
        break;
      case 'saved':
        n = counts.saved;
        break;
      case 'ignored':
        n = counts.ignored;
        break;
      default:
        return undefined;
    }
    return `(${n})`;
  };
  const renderCountSlot = (
    countSuffix: string | undefined,
    active: boolean
  ) => {
    const textClass = active ? 'text-white' : 'text-gray-400';
    const loadingShellClass = active
      ? 'bg-white/15 ring-white/25'
      : 'bg-[#FF7A1A]/10 ring-[#FF7A1A]/20 shadow-[0_0_16px_-8px_rgba(255,122,26,0.85)]';
    const loadingDotClass = active ? 'bg-white' : 'bg-[#FF7A1A]';
    if (countSuffix) {
      return (
        <span
          className={`inline-block shrink-0 text-right tabular-nums font-normal ${textClass}`}
          aria-label={countSuffix}
        >
          {countSuffix}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex h-4 min-w-[2.5ch] shrink-0 items-center justify-center rounded-full align-middle ring-1 ${loadingShellClass}`}
        role="status"
        aria-label={ui.loadingCountAria}
      >
        <span className="sr-only">{ui.loadingCountAria}</span>
        <span className="flex items-center gap-0.5" aria-hidden>
          {[0, 1, 2].map((idx) => (
            <span
              key={idx}
              className={`h-1 w-1 rounded-full ${loadingDotClass} animate-bounce`}
              style={{ animationDelay: `${idx * 110}ms` }}
            />
          ))}
        </span>
      </span>
    );
  };

  return (
    <div className="flex w-full flex-col lg:max-w-[320px] lg:shrink-0">
    <nav
      className="w-full max-w-none rounded-2xl bg-white p-3 shadow-sm"
      aria-label={ui.sidebar.scholarshipCategoriesNavAria}
    >
      <div className="rounded-lg bg-black px-4 py-3.5 text-center">
        <span className="text-sm font-bold tracking-tight text-white">
          {ui.sidebar.myScholarships}
        </span>
      </div>

      <ul className="mt-2 space-y-0.5">
        {staticTopRows.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          /** Same idea as Matches + International Friendly: don’t paint two rows “selected”. */
          const intlFilterOn = internationalStudentsFilter?.active === true;
          const navLooksActive = isActive && !intlFilterOn;
          const href = tabHrefFor(item.id);
          const countSuffix = suffix(item.id);
          const showGuestLock =
            guestMode && GUEST_GATED_TAB_IDS.has(item.id);
          const showSubscriptionLock = false;
          const gated = showGuestLock || showSubscriptionLock;
          const baseClass = `group flex w-full items-center gap-3 rounded-lg border-l-2 py-2.5 pr-2 pl-3 transition-colors ${
            navLooksActive
              ? scholarshipSidebarActiveRowClass
              : 'border-transparent hover:bg-gray-50/80'
          }`;
          return (
            <li key={item.id}>
              {gated ? (
                <button
                  type="button"
                  onClick={() =>
                    showSubscriptionLock
                      ? onSubscriptionRestrictedNav?.()
                      : onGuestRestrictedNav?.()
                  }
                  className={baseClass}
                  title={
                    showSubscriptionLock
                      ? 'Start your free access to unlock this section'
                      : 'Create a free account to unlock this section'
                  }
                  aria-label={
                    showSubscriptionLock
                      ? `Start free access to unlock ${item.label}`
                      : `Create a free account to unlock ${item.label}`
                  }
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 stroke-[1.75] ${
                      navLooksActive
                        ? 'text-white stroke-white'
                        : 'text-[#FF7A1A] stroke-[#FF7A1A]'
                    }`}
                    aria-hidden
                  />
                  <span
                    className={`min-w-0 flex-1 text-left text-sm ${
                      navLooksActive
                        ? 'font-semibold text-white'
                        : 'font-medium text-gray-500 transition-colors group-hover:text-gray-700'
                    }`}
                  >
                    <span className="inline-flex items-baseline gap-1">
                      <span className="min-w-0 truncate">{item.label}</span>
                      {renderCountSlot(countSuffix, navLooksActive)}
                    </span>
                  </span>
                </button>
              ) : (
                <Link
                  href={href}
                  prefetch={false}
                  className={baseClass}
                  aria-current={navLooksActive ? 'page' : undefined}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 stroke-[1.75] ${
                      navLooksActive
                        ? 'text-white stroke-white'
                        : 'text-[#FF7A1A] stroke-[#FF7A1A]'
                    }`}
                    aria-hidden
                  />
                  <span
                    className={`min-w-0 flex-1 text-left text-sm ${
                      navLooksActive
                        ? 'font-semibold text-white'
                        : 'font-medium text-gray-500 transition-colors group-hover:text-gray-700'
                    }`}
                  >
                    <span className="inline-flex items-baseline gap-1">
                      <span className="min-w-0 truncate">{item.label}</span>
                      {renderCountSlot(countSuffix, navLooksActive)}
                    </span>
                  </span>
                </Link>
              )}
            </li>
          );
        })}

        {actionNavDefs.flatMap((item) => {
          const isActive = activeTab === item.id;
          /** On Matches tab + International Friendly filter: don’t paint both rows “selected”. */
          const intlFilterOn = internationalStudentsFilter?.active === true;
          const navLooksActive =
            isActive && !(item.id === 'matches' && intlFilterOn);
          const Icon = item.icon;
          const href = tabHrefFor(item.id);
          const countSuffix = suffix(item.id);
          const showGuestLock =
            guestMode && GUEST_GATED_TAB_IDS.has(item.id);
          const showSubscriptionLock =
            subscriptionLocked && item.id === 'easy-apply';

          const content = (
            <>
              <Icon
                className={`h-[18px] w-[18px] shrink-0 stroke-[1.75] ${
                  navLooksActive
                    ? 'text-white stroke-white'
                    : 'text-[#FF7A1A] stroke-[#FF7A1A]'
                }`}
                aria-hidden
              />
              <span
                className={`min-w-0 flex-1 text-left text-sm ${
                  navLooksActive
                    ? 'font-semibold text-white'
                    : 'font-medium text-gray-500 transition-colors group-hover:text-gray-700'
                }`}
              >
                <span className="inline-flex items-baseline gap-1">
                  <span className="min-w-0 truncate">{item.label}</span>
                  {renderCountSlot(countSuffix, navLooksActive)}
                </span>
              </span>
              {item.id === 'matches' &&
              matchesNewIndicator &&
              matchesNewIndicator.count > 0 ? (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-md bg-[#FF7A1A] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                  title={ui.sidebar.matchesNewIndicatorTitle(matchesNewIndicator.count)}
                  aria-label={ui.sidebar.matchesNewIndicatorAria(matchesNewIndicator.count)}
                >
                  <span>NEW</span>
                  <span className="tabular-nums">{matchesNewIndicator.count}</span>
                </span>
              ) : null}
            </>
          );

          const rowClass = `flex w-full items-center gap-3 rounded-lg border-l-2 py-2.5 pr-2 pl-3 transition-colors ${
            navLooksActive
              ? scholarshipSidebarActiveRowClass
              : 'border-transparent hover:bg-gray-50/80'
          }`;

          const tip = item.tooltip;

          const guestGated =
            guestMode &&
            GUEST_GATED_TAB_IDS.has(item.id) &&
            typeof onGuestRestrictedNav === 'function';
          const subscriptionGated =
            showSubscriptionLock &&
            typeof onSubscriptionRestrictedNav === 'function';
          const gated = guestGated || subscriptionGated;

          const link = gated ? (
            <button
              type="button"
              title={
                useDarkTooltips
                  ? undefined
                  : showGuestLock
                    ? ui.sidebar.guestUnlockShort
                    : showSubscriptionLock
                      ? ui.sidebar.subscriptionUnlockShort
                    : tip
              }
              onClick={() =>
                subscriptionGated
                  ? onSubscriptionRestrictedNav?.()
                  : onGuestRestrictedNav?.()
              }
              className={`${rowClass} w-full cursor-pointer text-left ${!navLooksActive ? 'group' : ''}`}
            >
              {content}
            </button>
          ) : (
            <Link
              href={href}
              prefetch={false}
              title={useDarkTooltips ? undefined : tip}
              className={`${rowClass} ${!navLooksActive ? 'group' : ''}`}
              aria-current={navLooksActive ? 'page' : undefined}
            >
              {content}
            </Link>
          );

          const navLi = (
            <li key={item.id}>
              {useDarkTooltips && tip ? (
                <DarkTooltip
                  content={tip}
                  side="right"
                  align="center"
                  className="block w-full"
                >
                  {link}
                </DarkTooltip>
              ) : (
                link
              )}
            </li>
          );

          if (
            item.id === 'hot-deadlines' &&
            internationalStudentsFilter != null
          ) {
            const intl = internationalStudentsFilter;
            const intlActive = intl.active;
            const intlCountSuffix = showCounts
              ? `(${counts.internationalFriendly})`
              : undefined;
            const showGuestLockIntl = intl.showGuestLock;
            const showSubscriptionLockIntl = intl.showSubscriptionLock;
            const intlRowClass = `flex w-full items-center gap-3 rounded-lg border-l-2 py-2.5 pr-2 pl-3 transition-colors ${
              intlActive
                ? scholarshipSidebarActiveRowClass
                : 'border-transparent hover:bg-gray-50/80'
            }`;
            const intlGated = showGuestLockIntl || showSubscriptionLockIntl;
            const intlTip = ui.sidebar.internationalFriendlyTooltip;
            const intlInner = (
              <>
                <Globe
                  className={`h-[18px] w-[18px] shrink-0 stroke-[1.75] ${
                    intlActive
                      ? 'text-white stroke-white'
                      : 'text-[#FF7A1A] stroke-[#FF7A1A]'
                  }`}
                  aria-hidden
                />
                <span
                  className={`min-w-0 flex-1 text-left text-sm ${
                    intlActive
                      ? 'font-semibold text-white'
                      : 'font-medium text-gray-500 transition-colors group-hover:text-gray-700'
                  }`}
                >
                  <span className="inline-flex items-baseline gap-1">
                    <span className="min-w-0 truncate">
                      {ui.sidebar.internationalFriendly}
                    </span>
                    {renderCountSlot(intlCountSuffix, intlActive)}
                  </span>
                </span>
              </>
            );
            const intlControl = intlGated ? (
              <button
                type="button"
                title={
                  useDarkTooltips
                    ? undefined
                    : showSubscriptionLockIntl
                      ? ui.sidebar.subscriptionUnlockShort
                      : ui.sidebar.guestUnlockShort
                }
                onClick={() =>
                  showSubscriptionLockIntl
                    ? intl.onSubscriptionRestrictedClick()
                    : intl.onGuestRestrictedClick()
                }
                className={`${intlRowClass} w-full cursor-pointer text-left group`}
                aria-label={ui.sidebar.internationalFriendlyActivate}
              >
                {intlInner}
              </button>
            ) : intlActive ? (
              <button
                type="button"
                onClick={() => intl.onActivate()}
                className={`${intlRowClass} w-full cursor-pointer text-left group`}
                title={useDarkTooltips ? undefined : intlTip}
                aria-pressed
                aria-label={ui.sidebar.internationalFriendlyOnAria}
              >
                {intlInner}
              </button>
            ) : (
              <Link
                href={intl.href ?? SCHOLARSHIPS_HUB_INTERNATIONAL_FRIENDLY_HREF}
                prefetch={false}
                className={`${intlRowClass} w-full cursor-pointer text-left group`}
                title={useDarkTooltips ? undefined : intlTip}
                aria-label={ui.sidebar.internationalFriendlyShowAria}
              >
                {intlInner}
              </Link>
            );
            const internationalRow = (
              <li key="sidebar-international-students">
                {useDarkTooltips ? (
                  <DarkTooltip
                    content={intlTip}
                    side="right"
                    align="center"
                    className="block w-full"
                  >
                    {intlControl}
                  </DarkTooltip>
                ) : (
                  intlControl
                )}
              </li>
            );
            return [navLi, internationalRow];
          }

          return [navLi];
        })}
      </ul>
    </nav>
      <ScholarshipsSidebarAiMentorCard ctaLabel={ui.tryEssayMentor} />
    </div>
  );
}
