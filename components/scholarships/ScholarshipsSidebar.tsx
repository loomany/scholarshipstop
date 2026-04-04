'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Ban,
  Bookmark,
  Flame,
  Heart,
  Layers,
  Lock,
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
import { scholarshipSidebarActiveRowClass } from '@/lib/constants/scholarshipActionUi';

export type { ScholarshipSidebarCounts };

type NavDef = {
  id: ScholarshipListTabId;
  label: string;
  icon: LucideIcon;
  tooltip: string;
};

/** Hub guests: these tabs open the registration wall instead of navigating. */
const GUEST_GATED_TAB_IDS = new Set<ScholarshipListTabId>([
  'best-matches',
  'recommended',
  'easy-apply',
  'saved',
  'ignored'
]);

const NAV_DEFS: NavDef[] = [
  {
    id: 'best-matches',
    label: 'Best matches',
    icon: Flame,
    tooltip: 'Highest match score for your profile (over 90%).'
  },
  {
    id: 'recommended',
    label: 'Recommended',
    icon: Bookmark,
    tooltip: 'Top picks for your profile (score 85% and up).'
  },
  {
    id: 'easy-apply',
    label: 'Easy apply',
    icon: Trophy,
    tooltip: 'Quick applications with fewer steps.'
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
  return pathname === '/scholarships';
}

function resolveActiveTabId(
  pathname: string | null,
  searchParams: URLSearchParams | null,
  guestMode?: boolean
): ScholarshipListTabId | null {
  if (!pathname) return null;
  const isDetail =
    /^\/scholarships\/[^/]+$/.test(pathname) && pathname !== '/scholarships';
  if (isDetail) return 'matches';

  if (!isScholarshipListPath(pathname)) return null;

  const raw = searchParams?.get('tab') ?? null;
  return guestMode
    ? parseHubScholarshipTabParamForGuest(raw)
    : parseHubScholarshipTabParam(raw);
}

type ScholarshipsSidebarProps = {
  counts: ScholarshipSidebarCounts;
  /** Оранжевый блок NEW + число непрочитанных во вкладке Matches (локально). */
  matchesNewIndicator?: { count: number } | null;
  useDarkTooltips?: boolean;
  /** Unauthenticated hub: default tab is All; active state follows guest URL rules. */
  guestMode?: boolean;
  /** When set, gated sidebar rows call this instead of navigating (guest only). */
  onGuestRestrictedNav?: () => void;
};

export default function ScholarshipsSidebar({
  counts,
  matchesNewIndicator,
  useDarkTooltips = false,
  guestMode = false,
  onGuestRestrictedNav
}: ScholarshipsSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveActiveTabId(pathname, searchParams, guestMode);

  const suffix = (id: ScholarshipListTabId): string | undefined => {
    let n: number;
    switch (id) {
      case 'best-matches':
        n = counts.bestMatches;
        break;
      case 'recommended':
        n = counts.recommended;
        break;
      case 'easy-apply':
        n = counts.easyApply;
        break;
      case 'matches':
        n = counts.matches;
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
    <nav
      className="w-full max-w-none rounded-2xl bg-white p-3 shadow-sm lg:max-w-[320px] lg:shrink-0"
      aria-label="Scholarship categories"
    >
      <div className="rounded-lg bg-black px-4 py-3.5 text-center">
        <span className="text-sm font-bold tracking-tight text-white">
          My scholarships
        </span>
      </div>

      <ul className="mt-2 space-y-0.5">
        {NAV_DEFS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const href = buildScholarshipTabHref(item.id);
          const countSuffix = suffix(item.id);
          const showGuestLock =
            guestMode && GUEST_GATED_TAB_IDS.has(item.id);

          const content = (
            <>
              <Icon
                className={`h-[18px] w-[18px] shrink-0 stroke-[1.75] ${
                  isActive
                    ? 'text-white stroke-white'
                    : 'text-[#FF7A1A] stroke-[#FF7A1A]'
                }`}
                aria-hidden
              />
              <span
                className={`min-w-0 flex-1 text-left text-sm ${
                  isActive
                    ? 'font-semibold text-white'
                    : 'font-medium text-gray-500 transition-colors group-hover:text-gray-700'
                }`}
              >
                {item.label}
                {countSuffix ? (
                  <span
                    className={
                      isActive
                        ? 'font-normal text-white'
                        : 'font-normal text-gray-400'
                    }
                  >
                    {' '}
                    {countSuffix}
                  </span>
                ) : null}
              </span>
              {showGuestLock ? (
                <Lock
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isActive
                      ? 'text-white stroke-white'
                      : 'text-[#FF7A1A] stroke-[#FF7A1A]'
                  }`}
                  strokeWidth={2}
                  aria-hidden
                  title="Create a free account to unlock"
                />
              ) : null}
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
            isActive
              ? scholarshipSidebarActiveRowClass
              : 'border-transparent hover:bg-gray-50/80'
          }`;

          const tip = item.tooltip;

          const gated =
            guestMode &&
            GUEST_GATED_TAB_IDS.has(item.id) &&
            typeof onGuestRestrictedNav === 'function';

          const link = gated ? (
            <button
              type="button"
              title={useDarkTooltips ? undefined : tip}
              onClick={() => onGuestRestrictedNav?.()}
              className={`${rowClass} w-full cursor-pointer text-left ${!isActive ? 'group' : ''}`}
            >
              {content}
            </button>
          ) : (
            <Link
              href={href}
              title={useDarkTooltips ? undefined : tip}
              className={`${rowClass} ${!isActive ? 'group' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {content}
            </Link>
          );

          return (
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
        })}
      </ul>
    </nav>
  );
}
