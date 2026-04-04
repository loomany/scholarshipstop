'use client';

import type { ReactNode } from 'react';

export type ScholarshipsTwoColumnMaxWidth = 'listing' | 'detail';

const MAX_WIDTH: Record<ScholarshipsTwoColumnMaxWidth, string> = {
  listing: 'max-w-5xl',
  detail: 'max-w-[1280px]'
};

type ScholarshipsTwoColumnLayoutProps = {
  sidebar: ReactNode;
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
 * Shared scholarships shell: main column + My scholarships sidebar.
 * Mobile: sidebar first (stacked), then main — same as before.
 * Desktop (lg+): main left (~72%+), sidebar right (~28% max), sticky sidebar.
 */
export default function ScholarshipsTwoColumnLayout({
  sidebar,
  children,
  maxWidth = 'listing',
  lead = null
}: ScholarshipsTwoColumnLayoutProps) {
  const mw = MAX_WIDTH[maxWidth];

  return (
    <div className={`mx-auto flex w-full ${mw} flex-col gap-5 sm:gap-6`}>
      {lead != null ? <div className="w-full min-w-0">{lead}</div> : null}
      <div
        className={`flex w-full min-w-0 flex-col gap-8 lg:flex-row lg:items-start lg:gap-6 xl:gap-8`}
      >
        <div className="order-2 min-w-0 flex-1 basis-0 lg:order-1">
          {children}
        </div>
        <aside
          className="order-1 w-full shrink-0 lg:order-2 lg:sticky lg:top-24 lg:w-[min(100%,280px)] lg:max-w-[30%] xl:w-[300px] 2xl:w-[320px]"
          aria-label="My scholarships navigation"
        >
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
