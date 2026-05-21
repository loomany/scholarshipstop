import Link from 'next/link';
import clsx from 'clsx';
import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  FileText,
  Globe2,
  Zap
} from 'lucide-react';

import {
  hrefForLocalizedUiRequired,
  localizedScholarshipHubTabHref,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';
import { getScholarshipsHubUiCopy } from '@/lib/i18n/scholarshipsHubUiCopy';

const RELATED_CARD_CLASS =
  'group flex h-full cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 sm:p-5';

type Props = {
  idPrefix?: string;
  /** Extra classes on outer `<section>` (e.g. margin). */
  className?: string;
  /**
   * `exploring`: compact 4-card footer for long-tail SEO listings (matches SaaS hub CTAs).
   * `full`: six-card grid including providers + compare (category hubs and legacy footers).
   */
  variant?: 'full' | 'exploring';
  locale?: LocalizedUiLocale;
};

function linkForLocale(locale: LocalizedUiLocale, canonicalPath: string): string {
  return hrefForLocalizedUiRequired(locale, canonicalPath);
}

/** Shared “Continue your scholarship search” / “Continue exploring” SaaS card grid. */
export default function ContinueScholarshipSearchCardGrid({
  idPrefix = 'continue-search',
  className,
  variant = 'full',
  locale = 'en'
}: Props) {
  const c = getScholarshipsHubUiCopy(locale).continueSearch;

  if (variant === 'exploring') {
    return (
      <section
        className={clsx(
          'rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6',
          className
        )}
        aria-labelledby={`${idPrefix}-related-heading`}
        aria-describedby={`${idPrefix}-related-subtitle`}
      >
        <h2
          id={`${idPrefix}-related-heading`}
          className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl"
        >
          {c.exploringHeading}
        </h2>
        <p
          id={`${idPrefix}-related-subtitle`}
          className="mt-1 max-w-2xl text-sm text-slate-600"
        >
          {c.exploringSubtitle}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href={linkForLocale(locale, '/resources')} className={RELATED_CARD_CLASS}>
            <div className="flex gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
                aria-hidden
              >
                <BookOpen className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex flex-1 flex-col">
                <h3 className="font-semibold text-slate-900">{c.resourcesTitle}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-600">{c.resourcesBody}</p>
                <span className="mt-3 inline-block text-sm font-medium text-orange-600 transition group-hover:text-orange-700">
                  {c.explore}
                </span>
              </div>
            </div>
          </Link>
          <Link href={linkForLocale(locale, '/essays')} className={RELATED_CARD_CLASS}>
            <div className="flex gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
                aria-hidden
              >
                <FileText className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex flex-1 flex-col">
                <h3 className="font-semibold text-slate-900">{c.essaysTitle}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-600">{c.essaysBody}</p>
                <span className="mt-3 inline-block text-sm font-medium text-orange-600 transition group-hover:text-orange-700">
                  {c.explore}
                </span>
              </div>
            </div>
          </Link>
          <Link
            href={localizedScholarshipHubTabHref(locale, 'easy-apply')}
            className={RELATED_CARD_CLASS}
          >
            <div className="flex gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
                aria-hidden
              >
                <Zap className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex flex-1 flex-col">
                <h3 className="font-semibold text-slate-900">{c.easyApplyTitle}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-600">{c.easyApplyBody}</p>
                <span className="mt-3 inline-block text-sm font-medium text-orange-600 transition group-hover:text-orange-700">
                  {c.explore}
                </span>
              </div>
            </div>
          </Link>
          <Link
            href={localizedScholarshipHubTabHref(locale, 'international-friendly')}
            className={RELATED_CARD_CLASS}
          >
            <div className="flex gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
                aria-hidden
              >
                <Globe2 className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex flex-1 flex-col">
                <h3 className="font-semibold text-slate-900">{c.internationalTitle}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-600">{c.internationalBody}</p>
                <span className="mt-3 inline-block text-sm font-medium text-orange-600 transition group-hover:text-orange-700">
                  {c.explore}
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={clsx(
        'rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6',
        className
      )}
      aria-labelledby={`${idPrefix}-related-heading`}
      aria-describedby={`${idPrefix}-related-subtitle`}
    >
      <h2
        id={`${idPrefix}-related-heading`}
        className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl"
      >
        {c.heading}
      </h2>
      <p
        id={`${idPrefix}-related-subtitle`}
        className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]"
      >
        {c.subtitle}
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href={linkForLocale(locale, '/resources')} className={RELATED_CARD_CLASS}>
          <div className="flex gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
              aria-hidden
            >
              <BookOpen className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg text-slate-900">
                {c.resourcesTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{c.resourcesBody}</p>
              <span className="mt-3 inline-block font-medium text-orange-500 transition group-hover:text-orange-600">
                {c.explore}
              </span>
            </div>
          </div>
        </Link>
        <Link href={linkForLocale(locale, '/essays')} className={RELATED_CARD_CLASS}>
          <div className="flex gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
              aria-hidden
            >
              <FileText className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg text-slate-900">{c.essaysTitle}</h3>
              <p className="mt-1 text-sm text-slate-600">{c.essaysBody}</p>
              <span className="mt-3 inline-block font-medium text-orange-500 transition group-hover:text-orange-600">
                {c.explore}
              </span>
            </div>
          </div>
        </Link>
          <Link href={linkForLocale(locale, '/providers')} className={RELATED_CARD_CLASS}>
          <div className="flex gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
              aria-hidden
            >
              <Building2 className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg text-slate-900">
                {c.providersTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{c.providersBody}</p>
              <span className="mt-3 inline-block font-medium text-orange-500 transition group-hover:text-orange-600">
                {c.explore}
              </span>
            </div>
          </div>
        </Link>
          <Link href={linkForLocale(locale, '/compare')} className={RELATED_CARD_CLASS}>
          <div className="flex gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
              aria-hidden
            >
              <ArrowLeftRight className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg text-slate-900">
                {c.compareTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{c.compareBody}</p>
              <span className="mt-3 inline-block font-medium text-orange-500 transition group-hover:text-orange-600">
                {c.explore}
              </span>
            </div>
          </div>
        </Link>
        <Link
          href={localizedScholarshipHubTabHref(locale, 'easy-apply')}
          className={RELATED_CARD_CLASS}
        >
          <div className="flex gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
              aria-hidden
            >
              <Zap className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg text-slate-900">
                {c.easyApplyTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{c.easyApplyBody}</p>
              <span className="mt-3 inline-block font-medium text-orange-500 transition group-hover:text-orange-600">
                {c.explore}
              </span>
            </div>
          </div>
        </Link>
        <Link
          href={localizedScholarshipHubTabHref(locale, 'international-friendly')}
          className={RELATED_CARD_CLASS}
        >
          <div className="flex gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
              aria-hidden
            >
              <Globe2 className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg text-slate-900">
                {c.internationalTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{c.internationalBody}</p>
              <span className="mt-3 inline-block font-medium text-orange-500 transition group-hover:text-orange-600">
                {c.explore}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
