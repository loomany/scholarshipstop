import clsx from 'clsx';

import { getHubToolbarUiCopy } from '@/lib/i18n/hubUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

type EssaysIndexResultSummaryProps = {
  resultCount: number;
  showingFrom: number;
  showingTo: number;
  className?: string;
  locale?: LocalizedUiLocale;
};

export function EssaysIndexResultSummary({
  resultCount,
  showingFrom,
  showingTo,
  className,
  locale = 'en'
}: EssaysIndexResultSummaryProps) {
  const toolbar = getHubToolbarUiCopy(locale);
  if (resultCount <= 0) return null;
  const unit = locale === 'es' ? 'guías' : locale === 'fr' ? 'guides' : 'guides';
  return (
    <p className={clsx('text-sm text-gray-500', className)}>
      {showingFrom >= 1 && showingTo >= showingFrom
        ? toolbar.showingRange(showingFrom, showingTo, resultCount, unit)
        : locale === 'es'
          ? `${resultCount} ${unit} encontradas`
          : locale === 'fr'
            ? `${resultCount} ${unit} trouvés`
            : `Found ${resultCount} guides`}
    </p>
  );
}
