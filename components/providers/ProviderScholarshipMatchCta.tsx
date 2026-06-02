import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import ScholarshipMatchCtaIcon from '@/components/compare/ScholarshipMatchCtaIcon';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getProviderDetailUiCopy } from '@/lib/i18n/providerDetailUiCopy';

type ProviderScholarshipMatchCtaProps = {
  locale?: LocalizedUiLocale;
};

export default function ProviderScholarshipMatchCta({
  locale = 'en'
}: ProviderScholarshipMatchCtaProps) {
  const ui = getProviderDetailUiCopy(locale).scholarshipMatchCta;

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 ring-1 ring-orange-100">
            <ScholarshipMatchCtaIcon />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Match workspace
            </p>
            <h3 className="mt-1 text-base font-bold leading-tight tracking-tight text-slate-950 sm:text-lg">
              {ui.heading}
            </h3>
          </div>
        </div>
        <HomePrimaryCtaClient
          locale={locale}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.85)] transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70"
        >
          {ui.button}
        </HomePrimaryCtaClient>
      </div>
    </aside>
  );
}
