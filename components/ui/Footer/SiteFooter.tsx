'use client';

import Link from 'next/link';

import Logo from '@/components/icons/Logo';
import SiteFooterNav from '@/components/ui/Footer/SiteFooterNav';

/**
 * Primary site footer — ScholarshipTop branding and nav (same on all pages).
 */
export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl py-2.5 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-3 sm:pb-3">
        <div className="flex justify-start sm:justify-center">
          <div className="flex max-w-full flex-col items-start gap-3 sm:flex-row sm:items-start sm:gap-x-3">
            <div className="hidden shrink-0 -translate-x-0.5 sm:block sm:-translate-x-1">
              <Link
                href="/"
                className="inline-flex rounded-xl bg-black px-3 py-2 ring-1 ring-gray-800 transition hover:ring-gray-600"
                aria-label="ScholarshipTop — Home"
              >
                <Logo variant="footer" />
              </Link>
            </div>
            <div className="flex w-full min-w-0 flex-col items-start gap-1.5 sm:w-auto sm:gap-2">
              <div className="flex w-full min-w-0 justify-start">
                <SiteFooterNav />
              </div>
              <p className="max-w-3xl text-left text-xs leading-snug text-gray-600 sm:text-sm">
                Helping students find the right scholarships faster.{' '}
                <span className="text-gray-500 tabular-nums">
                  | © {year} ScholarshipTop
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
