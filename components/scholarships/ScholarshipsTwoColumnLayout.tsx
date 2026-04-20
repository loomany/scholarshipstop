'use client';

import type { ReactNode } from 'react';

export type ScholarshipsTwoColumnMaxWidth = 'listing' | 'detail';

const MAX_WIDTH: Record<ScholarshipsTwoColumnMaxWidth, string> = {
  listing: 'max-w-5xl',
  detail: 'max-w-[1280px]'
};

type ScholarshipsTwoColumnLayoutProps = {
  /** Omitted or `null`: only main column (e.g. signed-out hub / category). */
  sidebar?: ReactNode | null;
  children: ReactNode;
  /** Listing catalog vs scholarship detail (max width). */
  maxWidth?: ScholarshipsTwoColumnMaxWidth;
  /**
   * Full-width block above the 2-column row (title, hero, banners).
   * On `lg+`, the sidebar top aligns with `children` (e.g. filters / list tools).
   */
  lead?: ReactNode;
};

/**
 * Shared scholarships shell: main column + optional My scholarships sidebar.
 * Mobile: when `sidebar` is set, it stacks above main — same as before.
 * Desktop (lg+): main left (~72%+), sidebar right (~28% max), sticky sidebar.
 */
export default function ScholarshipsTwoColumnLayout({
  sidebar = null,
  children,
  maxWidth = 'listing',
  lead = null
}: ScholarshipsTwoColumnLayoutProps) {
  const mw = MAX_WIDTH[maxWidth];
  const hasSidebar = sidebar != null;

  return (
    <div className={`mx-auto flex w-full ${mw} flex-col gap-5 sm:gap-6`}>
      {lead != null ? <div className="w-full min-w-0">{lead}</div> : null}
      <div
        className={`flex w-full min-w-0 flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-6 xl:gap-8`}
      >
        <div className="order-2 min-w-0 flex-1 basis-0 lg:order-1">
          {children}
        </div>
        {hasSidebar ? (
          <aside
            className="order-1 w-full shrink-0 lg:order-2 lg:w-[min(100%,280px)] lg:max-w-[30%] xl:w-[300px] 2xl:w-[320px]"
            aria-label="My scholarships navigation"
          >
            {/* top-20 = 5rem — matches Navbar h-16 default; md+ uses h-20, sticky still clears bar */}
            <div className="lg:sticky lg:top-20 lg:z-10 lg:w-full">
              {sidebar}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
