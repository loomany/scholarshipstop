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
    <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-center shadow-sm sm:px-6 sm:py-5">
      <div className="flex justify-center px-1">
        <div className="inline-flex max-w-full items-center gap-2">
          <ScholarshipMatchCtaIcon />
          <h3 className="whitespace-normal text-left text-base font-bold leading-tight tracking-tight text-indigo-950 sm:whitespace-nowrap sm:text-lg md:text-[1.5rem]">
            {ui.heading}
          </h3>
        </div>
      </div>
      <HomePrimaryCtaClient
        locale={locale}
        className="mt-3 inline-flex items-center justify-center rounded-full bg-black px-7 py-2 text-xl font-bold leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45"
      >
        {ui.button}
      </HomePrimaryCtaClient>
    </div>
  );
}
