'use client';

import { usePathname } from 'next/navigation';

import { hubResolvedFromPathname } from '@/app/scholarships/scholarshipHubPath';
import { scholarshipListPageTitle } from '@/app/scholarships/scholarshipTabs';
import ScholarshipsHubShellSkeleton from '@/components/scholarships/ScholarshipsHubShellSkeleton';
import {
  scholarshipDetailCardCompactClass,
  scholarshipDetailCardPrimaryClass,
  scholarshipDetailHeroSurfaceClass,
  scholarshipDetailPageBgClass,
  scholarshipDetailShellClass
} from '@/lib/scholarships/scholarshipDetailLayoutClasses';

function fallbackTitleFromPathname(pathname: string | null): string {
  const hubResolved = hubResolvedFromPathname(pathname);
  if (hubResolved?.audience === 'international_friendly') {
    return 'Scholarships for international students';
  }
  if (hubResolved) {
    return scholarshipListPageTitle(hubResolved.tab, { guest: true });
  }
  return 'Scholarship matches';
}

function isScholarshipDetailPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/scholarships') return false;
  if (pathname.startsWith('/scholarships/hub/')) return false;
  if (pathname.startsWith('/scholarships/category/')) return false;
  const rest = pathname.replace(/^\/scholarships\/?/, '');
  return rest.length > 0 && !rest.includes('/');
}

function ScholarshipDetailSkeleton() {
  return (
    <section className={`${scholarshipDetailPageBgClass} px-4 py-8 sm:px-5 md:py-12 lg:px-8`}>
      <div className={`${scholarshipDetailShellClass} space-y-5 sm:space-y-6`}>
        <div className={scholarshipDetailHeroSurfaceClass}>
          <div className="mb-5 h-4 w-36 rounded bg-zinc-200" />
          <div className="mb-4 h-9 w-full max-w-3xl rounded bg-zinc-200" />
          <div className="mb-3 h-4 w-full max-w-4xl rounded bg-zinc-100" />
          <div className="mb-6 h-4 w-full max-w-2xl rounded bg-zinc-100" />
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-28 rounded-full bg-zinc-100" />
            <div className="h-8 w-32 rounded-full bg-zinc-100" />
            <div className="h-8 w-24 rounded-full bg-zinc-100" />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
          <div className="space-y-5">
            <div className={scholarshipDetailCardPrimaryClass}>
              <div className="mb-4 h-6 w-56 rounded bg-zinc-200" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-zinc-100" />
                <div className="h-4 w-11/12 rounded bg-zinc-100" />
                <div className="h-4 w-4/5 rounded bg-zinc-100" />
              </div>
            </div>
            <div className={scholarshipDetailCardPrimaryClass}>
              <div className="mb-4 h-6 w-44 rounded bg-zinc-200" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-16 rounded-xl bg-zinc-100" />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className={scholarshipDetailCardCompactClass}>
              <div className="mb-4 h-5 w-40 rounded bg-zinc-200" />
              <div className="mb-3 h-11 w-full rounded-xl bg-orange-100" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 rounded-xl bg-zinc-100" />
                <div className="h-10 rounded-xl bg-zinc-100" />
              </div>
            </div>
            <div className={scholarshipDetailCardCompactClass}>
              <div className="mb-3 h-5 w-32 rounded bg-zinc-200" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-zinc-100" />
                <div className="h-4 w-5/6 rounded bg-zinc-100" />
                <div className="h-4 w-2/3 rounded bg-zinc-100" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default function ScholarshipsCatchAllLoading() {
  const pathname = usePathname();

  if (isScholarshipDetailPath(pathname)) {
    return <ScholarshipDetailSkeleton />;
  }

  return (
    <ScholarshipsHubShellSkeleton pageTitle={fallbackTitleFromPathname(pathname)} />
  );
}
