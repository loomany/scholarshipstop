import ScholarshipCardPreview from '@/components/scholarships/ScholarshipCardPreview';
import ScholarshipsSidebarPreview from '@/components/scholarships/ScholarshipsSidebarPreview';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getHomePageCopy } from '@/lib/i18n/homePageCopy';

export default function ScholarshipPreviewList({
  locale = 'en'
}: {
  locale?: LocalizedUiLocale;
}) {
  const home = getHomePageCopy(locale);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col lg:mx-0">
      <div
        className="pointer-events-none flex min-h-[300px] flex-1 cursor-default flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_32px_80px_-32px_rgba(15,23,42,0.35)] ring-1 ring-gray-200/70 select-none lg:min-h-[320px] lg:flex-row"
        aria-label="Product interface preview; Apply now opens the scholarship directory"
      >
        <ScholarshipsSidebarPreview locale={locale} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-gray-100 bg-gray-50/90 lg:border-l lg:border-t-0">
          <div className="hidden shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5 lg:flex">
            <p className="text-sm font-semibold tracking-tight text-gray-900">
              {home.previewMatchesTitle}
            </p>
            <span className="shrink-0 rounded-md bg-[#FF7A1A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              {home.previewNewBadge}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
            <ScholarshipCardPreview className="min-h-0 w-full max-w-none flex-1" locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
