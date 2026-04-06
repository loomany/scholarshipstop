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
      <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex justify-center">
          <div className="flex max-w-full flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-x-3">
            <div className="shrink-0 -translate-x-0.5 sm:-translate-x-1">
              <Link
                href="/"
                className="inline-flex rounded-xl bg-black px-3 py-2 ring-1 ring-gray-800 transition hover:ring-gray-600"
                aria-label="ScholarshipTop — Home"
              >
                <Logo variant="footer" />
              </Link>
            </div>
            <div className="flex flex-col items-center gap-1.5 sm:items-start sm:gap-2">
              <div className="flex w-full justify-center sm:w-auto sm:justify-start">
                <SiteFooterNav />
              </div>
              <p className="max-w-3xl text-center text-xs leading-snug text-gray-600 sm:text-left sm:text-sm">
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
