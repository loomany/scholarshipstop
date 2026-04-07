import {
  Ban,
  Bookmark,
  Flame,
  Heart,
  Layers,
  Timer,
  Trophy,
  type LucideIcon
} from 'lucide-react';

import { scholarshipSidebarActiveRowClass } from '@/lib/constants/scholarshipActionUi';

type PreviewNavItem = {
  id: string;
  label: string;
  count: number;
  icon: LucideIcon;
  active?: boolean;
};

const PREVIEW_NAV: PreviewNavItem[] = [
  { id: 'best-matches', label: 'Best matches', count: 23, icon: Flame, active: true },
  { id: 'recommended', label: 'Recommended', count: 62, icon: Bookmark },
  { id: 'easy-apply', label: 'Easy apply', count: 17, icon: Trophy },
  { id: 'hot-deadlines', label: 'Hot Deadlines', count: 105, icon: Timer },
  { id: 'matches', label: 'Matches', count: 3781, icon: Layers },
  { id: 'saved', label: 'Saved', count: 4, icon: Heart },
  { id: 'ignored', label: 'Ignored', count: 5, icon: Ban }
];

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Static, compact sidebar for landing product demo — mirrors /scholarships nav styling
 * without routing or tooltips.
 */
export default function ScholarshipsSidebarPreview() {
  return (
    <aside
      className="flex w-full shrink-0 flex-col border-b border-gray-100 bg-white lg:w-[168px] lg:border-b-0 lg:border-r"
      aria-label="Scholarships app preview (illustration)"
    >
      <div className="px-2.5 py-2.5 lg:px-2 lg:pb-2 lg:pt-3">
        <div className="rounded-md bg-black px-2 py-2 text-center">
          <span className="text-[11px] font-bold leading-tight tracking-tight text-white lg:text-xs">
            My scholarships
          </span>
        </div>
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col px-1.5 pb-2.5 pt-0.5 lg:px-2 lg:pb-3"
        aria-hidden
      >
        <ul className="space-y-0.5">
          {PREVIEW_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = Boolean(item.active);
            const countStr = formatCount(item.count);
            return (
              <li key={item.id}>
                <div
                  className={`flex w-full items-center gap-2 rounded-lg border-l-2 py-1.5 pl-2 pr-1.5 lg:gap-2.5 lg:py-2 lg:pl-2.5 lg:pr-2 ${
                    isActive
                      ? scholarshipSidebarActiveRowClass
                      : 'border-transparent bg-transparent'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 stroke-[1.75] lg:h-[15px] lg:w-[15px] ${
                      isActive
                        ? 'text-white stroke-white'
                        : 'text-[#FF7A1A] stroke-[#FF7A1A]'
                    }`}
                    aria-hidden
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-left text-[11px] leading-snug lg:text-xs ${
                      isActive
                        ? 'font-semibold text-white'
                        : 'font-medium text-gray-500'
                    }`}
                  >
                    {item.label}
                    <span
                      className={`font-normal tabular-nums ${
                        isActive ? 'text-white' : 'text-gray-400'
                      }`}
                    >
                      {' '}
                      ({countStr})
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
