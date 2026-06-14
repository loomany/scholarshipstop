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
   * On `lg+`, the sidebar top aligns with `listToolbar` (filters / list tools).
   */
  lead?: ReactNode;
  /**
   * Search, sort, and filter toolbar — always first in the main column.
   * On mobile, `sidebar` renders directly below this block, then `children` (cards).
   */
  listToolbar?: ReactNode | null;
};

/**
 * Shared scholarships shell: main column + optional My scholarships sidebar.
 * Mobile: filters (`listToolbar`) → sidebar → scholarship cards (`children`).
 * Desktop (lg+): main left (~72%+), sidebar right (~28% max), sticky sidebar.
 */
export default function ScholarshipsTwoColumnLayout({
  sidebar = null,
  children,
  maxWidth = 'listing',
  lead = null,
  listToolbar = null
}: ScholarshipsTwoColumnLayoutProps) {
  const mw = MAX_WIDTH[maxWidth];
  const hasSidebar = sidebar != null;
  const hasListToolbar = listToolbar != null;

  return (
    <div className={`mx-auto flex w-full ${mw} flex-col gap-5 sm:gap-6`}>
      {lead != null ? <div className="w-full min-w-0">{lead}</div> : null}
      <div
        className={`flex w-full min-w-0 flex-col gap-5 sm:gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,280px)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-x-8 2xl:grid-cols-[minmax(0,1fr)_320px]`}
      >
        {hasListToolbar ? (
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">{listToolbar}</div>
        ) : null}
        {hasSidebar ? (
          <aside
            className={`min-w-0 lg:col-start-2 lg:row-start-1 lg:w-full lg:max-w-none ${
              hasListToolbar ? 'lg:row-span-2' : 'lg:row-span-1'
            }`}
            aria-label="My scholarships navigation"
          >
            {/* top-20 = 5rem — matches Navbar h-16 default; md+ uses h-20, sticky still clears bar */}
            <div className="lg:sticky lg:top-20 lg:z-10 lg:w-full">
              {sidebar}
            </div>
          </aside>
        ) : null}
        <div
          className={`min-w-0 flex-1 basis-0 ${
            hasListToolbar ? 'lg:col-start-1 lg:row-start-2' : 'lg:col-start-1 lg:row-start-1'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
