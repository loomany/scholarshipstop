'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Ban,
  Bookmark,
  Flame,
  Globe,
  Heart,
  Layers,
  Timer,
  Trophy,
  type LucideIcon
} from 'lucide-react';

import { buildScholarshipTabHref } from '@/app/scholarships/scholarshipListUrl';
import type {
  ScholarshipListTabId,
  ScholarshipSidebarCounts
} from '@/app/scholarships/scholarshipTabs';

import {
  parseHubScholarshipTabParam,
  parseHubScholarshipTabParamForGuest
} from '@/app/scholarships/scholarshipTabs';
import { DarkTooltip } from '@/components/ui/DarkTooltip';
import {
  scholarshipSidebarActiveRowClass
} from '@/lib/constants/scholarshipActionUi';
import { ScholarshipsSidebarAiMentorCard } from '@/components/scholarships/ScholarshipsSidebarAiMentorCard';

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
  id: 'best-recommendation' | 'recommended';
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
  'recommended',
  'easy-apply',
  'hot-deadlines'
]);

const STATIC_TOP_ROWS: StaticNavDef[] = [
  {
    id: 'best-recommendation',
    label: 'Best recommendation',
    icon: Flame
  },
  {
    id: 'recommended',
    label: 'Saved Filters',
    icon: Bookmark
  }
];

const ACTION_NAV_DEFS: NavDef[] = [
  {
    id: 'easy-apply',
    label: 'Easy apply',
    icon: Trophy,
    tooltip: 'Scholarships with lighter application effort.'
  },
  {
    id: 'hot-deadlines',
    label: 'Hot Deadlines',
    icon: Timer,
    tooltip: 'Deadlines in the next week — under 1 day or 1–7 days out.'
  },
  {
    id: 'matches',
    label: 'Matches',
    icon: Layers,
    tooltip: 'Scholarships that match your criteria.'
  },
  {
    id: 'saved',
    label: 'Saved',
    icon: Heart,
    tooltip: 'Scholarships you have saved.'
  },
  {
    id: 'ignored',
    label: 'Ignored',
    icon: Ban,
    tooltip: 'Scholarships you chose to hide.'
  }
];

function isScholarshipListPath(pathname: string): boolean {
  return pathname === '/scholarships' || pathname.startsWith('/scholarships/');
}

function resolveActiveTabId(
  pathname: string | null,
  searchParams: URLSearchParams | null,
  guestMode?: boolean
): ScholarshipListTabId | null {
  if (!pathname) return null;
  if (pathname.startsWith('/scholarships/category/')) return 'matches';
  const isDetail =
    /^\/scholarships\/[^/]+$/.test(pathname) && pathname !== '/scholarships';
  if (isDetail) return 'matches';

  if (!isScholarshipListPath(pathname)) return null;

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
  buildTabHref
}: ScholarshipsSidebarProps) {
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

  return (
    <div className="flex w-full flex-col lg:max-w-[320px] lg:shrink-0">
    <nav
      className="w-full max-w-none rounded-2xl bg-white p-3 shadow-sm"
      aria-label="Scholarship categories"
    >
      <div className="rounded-lg bg-black px-4 py-3.5 text-center">
        <span className="text-sm font-bold tracking-tight text-white">
          My scholarships
        </span>
      </div>

      <ul className="mt-2 space-y-0.5">
        {STATIC_TOP_ROWS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          /** Same idea as Matches + International Friendly: don’t paint two rows “selected”. */
          const intlFilterOn = internationalStudentsFilter?.active === true;
          const navLooksActive = isActive && !intlFilterOn;
          const href = buildTabHref?.(item.id) ?? buildScholarshipTabHref(item.id);
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
                    {item.label}
                    {countSuffix ? (
                      <span
                        className={
                          navLooksActive
                            ? 'font-normal text-white'
                            : 'font-normal text-gray-400'
                        }
                      >
                        {' '}
                        {countSuffix}
                      </span>
                    ) : null}
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
                    {item.label}
                    {countSuffix ? (
                      <span
                        className={
                          navLooksActive
                            ? 'font-normal text-white'
                            : 'font-normal text-gray-400'
                        }
                      >
                        {' '}
                        {countSuffix}
                      </span>
                    ) : null}
                  </span>
                </Link>
              )}
            </li>
          );
        })}

        {ACTION_NAV_DEFS.flatMap((item) => {
          const isActive = activeTab === item.id;
          /** On Matches tab + International Friendly filter: don’t paint both rows “selected”. */
          const intlFilterOn = internationalStudentsFilter?.active === true;
          const navLooksActive =
            isActive && !(item.id === 'matches' && intlFilterOn);
          const Icon = item.icon;
          const href = buildTabHref?.(item.id) ?? buildScholarshipTabHref(item.id);
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
                {item.label}
                {countSuffix ? (
                  <span
                    className={
                      navLooksActive
                        ? 'font-normal text-white'
                        : 'font-normal text-gray-400'
                    }
                  >
                    {' '}
                    {countSuffix}
                  </span>
                ) : null}
              </span>
              {item.id === 'matches' &&
              matchesNewIndicator &&
              matchesNewIndicator.count > 0 ? (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-md bg-[#FF7A1A] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                  title={`${matchesNewIndicator.count} not opened yet`}
                  aria-label={`${matchesNewIndicator.count} new scholarships`}
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
                    ? 'Create a free account to unlock'
                    : showSubscriptionLock
                      ? 'Start your free access to unlock'
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
            const intlTip =
              'Scholarships tagged International Friendly in our catalog (mentions international or foreign-national eligibility in our data).';
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
                  International Friendly
                  {intlCountSuffix ? (
                    <span
                      className={
                        intlActive
                          ? 'font-normal text-white'
                          : 'font-normal text-gray-400'
                      }
                    >
                      {' '}
                      {intlCountSuffix}
                    </span>
                  ) : null}
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
                      ? 'Start your free access to unlock'
                      : 'Create a free account to unlock'
                }
                onClick={() =>
                  showSubscriptionLockIntl
                    ? intl.onSubscriptionRestrictedClick()
                    : intl.onGuestRestrictedClick()
                }
                className={`${intlRowClass} w-full cursor-pointer text-left group`}
                aria-label={
                  showSubscriptionLockIntl
                    ? 'Start free access to use International Friendly'
                    : 'Create a free account to use International Friendly'
                }
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
                aria-label="International Friendly on — click to clear"
              >
                {intlInner}
              </button>
            ) : (
              <Link
                href={intl.href ?? '/scholarships?tab=matches&scope=catalog&aud=international_friendly'}
                prefetch={false}
                className={`${intlRowClass} w-full cursor-pointer text-left group`}
                title={useDarkTooltips ? undefined : intlTip}
                aria-label="Show International Friendly scholarships"
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
    <ScholarshipsSidebarAiMentorCard />
    </div>
  );
}
