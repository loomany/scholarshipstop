import Link from 'next/link';

import {
  hrefForLocalizedUiRequired,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';

type Props = {
  pageTitle: string;
  locale?: LocalizedUiLocale;
};

/** Visible breadcrumbs — matches UX brief; JSON-LD stays unchanged on the page. */
export default function ScholarshipCategoryListingBreadcrumbs({
  pageTitle,
  locale = 'en'
}: Props) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
        <li>
          <Link
            href={hrefForLocalizedUiRequired(locale, '/')}
            className="font-medium text-teal-800 underline decoration-teal-600/35 underline-offset-2 transition hover:text-teal-950 hover:decoration-teal-700/45"
          >
            Home
          </Link>
        </li>
        <li className="text-slate-400" aria-hidden>
          /
        </li>
        <li>
          <Link
            href={hrefForLocalizedUiRequired(locale, '/scholarships')}
            className="font-medium text-teal-800 underline decoration-teal-600/35 underline-offset-2 transition hover:text-teal-950 hover:decoration-teal-700/45"
          >
            Scholarships
          </Link>
        </li>
        <li className="text-slate-400" aria-hidden>
          /
        </li>
        <li className="font-semibold text-slate-900" aria-current="page">
          {pageTitle}
        </li>
      </ol>
    </nav>
  );
}
