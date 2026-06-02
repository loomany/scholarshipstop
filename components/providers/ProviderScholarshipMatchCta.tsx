import ScholarshipMatchCtaCard from '@/components/scholarships/ScholarshipMatchCtaCard';
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
    <ScholarshipMatchCtaCard
      as="aside"
      locale={locale}
      heading={ui.heading}
      button={ui.button}
    />
  );
}
