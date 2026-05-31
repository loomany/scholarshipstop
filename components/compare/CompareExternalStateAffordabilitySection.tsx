import {
  getStateAffordability,
  isPlausibleHouseholdIncome,
  type StateAffordability
} from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  enrichmentNotAvailableLabel,
  fmtEnrichmentHourly,
  fmtEnrichmentRatePer100k,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';

type CompareExternalStateAffordabilitySectionProps = {
  stateAName: string;
  stateACode: string;
  stateBName: string;
  stateBCode: string;
  noDataLabel?: string;
};

type StateMetric = {
  key: string;
  label: string;
  value: string | null;
  hint?: string;
};

function stateMetrics(row: StateAffordability | null): StateMetric[] {
  if (!row) return [];

  const income =
    isPlausibleHouseholdIncome(row.median_household_income) ?
      fmtEnrichmentUsd(row.median_household_income)
    : null;

  const metrics: StateMetric[] = [
    {
      key: 'income',
      label: 'Median household income',
      value: income,
      hint: 'Census ACS'
    },
    {
      key: 'fmr2',
      label: 'Fair market rent (2BR)',
      value: fmtEnrichmentUsd(row.hud_fmr_2br),
      hint: 'HUD monthly estimate'
    },
    {
      key: 'living_wage',
      label: 'Living wage',
      value: fmtEnrichmentHourly(row.living_wage_single_adult),
      hint: 'Single adult, MIT model'
    },
    {
      key: 'bls',
      label: 'BLS median wage',
      value: fmtEnrichmentUsd(row.bls_median_wage),
      hint: 'State occupational estimate'
    }
  ];

  return metrics.filter((m) => m.value != null);
}

function publicSafetyNote(row: StateAffordability | null): string | null {
  const ctx = row?.public_safety_context;
  const rate = fmtEnrichmentRatePer100k(ctx?.value);
  if (!rate) return null;
  return `Reported violent crime rate (state aggregate): ${rate}. Public safety context is based on aggregate state-level public data — not a safety rating.`;
}

function StateAffordabilityColumn({
  name,
  row,
  notAvailable
}: {
  name: string;
  row: StateAffordability | null;
  notAvailable: string;
}) {
  const metrics = stateMetrics(row);
  const safetyNote = publicSafetyNote(row);

  if (!metrics.length && !safetyNote) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        <p className="mt-2 text-sm text-gray-600">{notAvailable} for this state.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-base font-semibold leading-snug text-gray-900">{name}</h3>

      {metrics.length ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
          {metrics.map((metric) => (
            <CompareExternalEnrichmentStatCard
              key={metric.key}
              label={metric.label}
              value={metric.value ?? notAvailable}
              hint={metric.hint}
            />
          ))}
        </div>
      ) : null}

      {safetyNote ? (
        <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-2.5 text-xs leading-relaxed text-gray-600">
          {safetyNote}
        </p>
      ) : null}
    </div>
  );
}

function hasAffordabilityContent(row: StateAffordability | null): boolean {
  return stateMetrics(row).length > 0 || publicSafetyNote(row) != null;
}

export function CompareExternalStateAffordabilitySection({
  stateAName,
  stateACode,
  stateBName,
  stateBCode,
  noDataLabel
}: CompareExternalStateAffordabilitySectionProps) {
  const notAvailable = enrichmentNotAvailableLabel(noDataLabel);
  const rowA = getStateAffordability(stateACode);
  const rowB = getStateAffordability(stateBCode);

  if (!hasAffordabilityContent(rowA) && !hasAffordabilityContent(rowB)) return null;

  return (
    <section
      className="mt-10 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-6 shadow-sm sm:p-8"
      aria-labelledby="compare-state-affordability-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Public reference data
        </p>
        <h2
          id="compare-state-affordability-heading"
          className="scroll-mt-28 mt-2 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24 sm:text-2xl"
        >
          Cost of living &amp; wages
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          State-level affordability context to complement scholarship climate above — not
          ScholarshipTop grant totals.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-5">
        <StateAffordabilityColumn name={stateAName} row={rowA} notAvailable={notAvailable} />
        <StateAffordabilityColumn name={stateBName} row={rowB} notAvailable={notAvailable} />
      </div>

      <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-relaxed text-gray-500">
        Data: Census ACS, HUD FMR, MIT Living Wage, BLS, and public aggregate sources. Rent
        figures may reflect metro or state averages when city-level data is unavailable.
      </p>
    </section>
  );
}
