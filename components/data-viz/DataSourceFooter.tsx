import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getPublicDataVizCopy } from '@/lib/i18n/publicDataVizCopy';

type DataSourceFooterProps = {
  variant?:
    | 'default'
    | 'college'
    | 'state'
    | 'mixed'
    | 'nonprofit'
    | 'research'
    | 'social'
    | 'city';
  showPublicSafetyNote?: boolean;
  className?: string;
  locale?: LocalizedUiLocale;
};

export function DataSourceFooter({
  variant = 'default',
  showPublicSafetyNote = false,
  className = '',
  locale = 'en'
}: DataSourceFooterProps) {
  const copy = getPublicDataVizCopy(locale);

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <p className="text-xs leading-relaxed text-gray-500">
        {copy.sources[variant]}
      </p>
      {showPublicSafetyNote ? (
        <p className="text-xs leading-relaxed text-gray-500">
          {copy.publicSafetyFooter}
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-gray-500">
        {copy.referenceOnly}
      </p>
      <p className="text-xs leading-relaxed text-gray-500">
        {copy.dataAvailability}
      </p>
    </div>
  );
}
