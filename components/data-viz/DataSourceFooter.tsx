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
};

const BASE_SOURCES =
  'Data sources: College Scorecard, Census ACS, HUD FMR, MIT Living Wage, BLS OEWS, and public reference datasets where available.';

const VARIANT_COPY: Record<NonNullable<DataSourceFooterProps['variant']>, string> = {
  default: BASE_SOURCES,
  college:
    'Data sources: College Scorecard, OpenAlex, and ROR where matched. Figures may lag the current academic year; verify on the institution site.',
  state:
    'Data sources: Census ACS, HUD FMR, MIT Living Wage, BLS OEWS, and public reference datasets where available. Rent figures may reflect metro or state averages.',
  nonprofit:
    'Data sources: ProPublica Nonprofit Explorer and USAspending where strict public-organization matches are available.',
  research:
    'Data sources: College Scorecard, OpenAlex, ROR, and NIH RePORTER aggregate public data where matched.',
  social:
    'Data sources: CDC SVI, ADI, and County Health public data aggregated to state-level planning context.',
  city:
    'Data sources: location crosswalk, HUD FMR, Zillow ZORI, and BLS OEWS metro data where strict city or metro matches are available.',
  mixed: BASE_SOURCES
};

export function DataSourceFooter({
  variant = 'default',
  showPublicSafetyNote = false,
  className = ''
}: DataSourceFooterProps) {
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <p className="text-xs leading-relaxed text-gray-500">{VARIANT_COPY[variant]}</p>
      {showPublicSafetyNote ? (
        <p className="text-xs leading-relaxed text-gray-500">
          Public safety context uses aggregate public data and is included only as
          planning context.
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-gray-500">
        Reference only - not ScholarshipTop rules or guarantees.
      </p>
    </div>
  );
}
