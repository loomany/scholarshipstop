'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import Logo from '@/components/icons/Logo';

/** Avoid `usePathname` during SSR (Turbopack can surface `useContext` null in dev). */
const SiteFooterNav = dynamic(() => import('@/components/ui/Footer/SiteFooterNav'), {
  ssr: false,
  loading: () => (
    <nav
      className="flex min-h-[1.25rem] w-full min-w-0 max-w-full shrink-0 flex-row flex-wrap justify-center gap-2 opacity-60"
      aria-label="Footer"
      aria-busy="true"
    />
  )
});

/**
 * Primary site footer — ScholarshipTop branding and nav (same on all pages).
 */
export default function SiteFooter() {
  const year = new Date().getUTCFullYear();

  return (
    <footer className="border-t border-gray-200/80 bg-[#f8f9fa]">
      <div className="mx-auto max-w-6xl px-4 py-8 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-10 sm:pb-10">
        <div className="flex justify-center">
          <div className="flex max-w-full flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
            <div className="shrink-0">
              <Link
                href="/"
                className="inline-flex rounded-full bg-black px-4 py-2.5 ring-1 ring-gray-800 transition hover:ring-gray-600"
                aria-label="ScholarshipTop — Home"
              >
                <Logo variant="footer" />
              </Link>
            </div>
            <div className="flex w-full min-w-0 flex-col items-center gap-3 md:w-auto md:max-w-full md:gap-3">
              <div className="flex w-full min-w-0 justify-center md:w-auto">
                <SiteFooterNav />
              </div>
              <div className="max-w-3xl text-center text-xs leading-snug text-slate-600 sm:text-sm">
                <div className="md:hidden">
                  <p>Helping students find the right scholarships faster.</p>
                  <p className="mt-1 tabular-nums text-slate-500">
                    © {year} <span className="text-slate-600">ScholarshipTop</span>
                  </p>
                </div>
                <p className="hidden md:block">
                  Helping students find the right scholarships faster.{' '}
                  <span className="tabular-nums text-slate-500">
                    | © {year} ScholarshipTop
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
