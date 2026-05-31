import {
  getStateAffordability,
  isPlausibleHouseholdIncome,
  type StateAffordability
} from '@/lib/external-data';

type CompareExternalStateAffordabilitySectionProps = {
  stateAName: string;
  stateACode: string;
  stateBName: string;
  stateBCode: string;
  noDataLabel?: string;
};

function fmtUsd(value: number | null | undefined, noData: string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return noData;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function fmtNum(value: number | null | undefined, noData: string, digits = 0): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return noData;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

function fmtRatePer100k(
  ctx: StateAffordability['public_safety_context'],
  noData: string
): string {
  if (typeof ctx?.value !== 'number' || Number.isNaN(ctx.value)) return noData;
  return `${fmtNum(ctx.value, noData, 2)} per 100k (reported violent crime, state aggregate)`;
}

function StateAffordabilityColumn({
  name,
  row,
  noData
}: {
  name: string;
  row: StateAffordability | null;
  noData: string;
}) {
  const income =
    row && isPlausibleHouseholdIncome(row.median_household_income)
      ? row.median_household_income
      : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
      <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
      <dl className="mt-3 space-y-2 text-sm text-gray-800">
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">Median household income</dt>
          <dd className="tabular-nums font-medium">{fmtUsd(income, noData)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">HUD FMR (1BR / 2BR)</dt>
          <dd className="tabular-nums font-medium">
            {fmtUsd(row?.hud_fmr_1br, noData)} / {fmtUsd(row?.hud_fmr_2br, noData)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">Living wage (single adult)</dt>
          <dd className="tabular-nums font-medium">
            {row?.living_wage_single_adult != null
              ? `${fmtNum(row.living_wage_single_adult, noData, 2)}/hr`
              : noData}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">BLS median wage</dt>
          <dd className="tabular-nums font-medium">
            {fmtUsd(row?.bls_median_wage, noData)}
          </dd>
        </div>
        {row?.public_safety_context ? (
          <div className="border-t border-gray-200 pt-2">
            <dt className="text-gray-600">Public safety context</dt>
            <dd className="mt-1 text-gray-700">
              {fmtRatePer100k(row.public_safety_context, noData)}
            </dd>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Public safety context is based on aggregate state-level public data.
            </p>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function CompareExternalStateAffordabilitySection({
  stateAName,
  stateACode,
  stateBName,
  stateBCode,
  noDataLabel = '—'
}: CompareExternalStateAffordabilitySectionProps) {
  const rowA = getStateAffordability(stateACode);
  const rowB = getStateAffordability(stateBCode);

  if (!rowA && !rowB) return null;

  return (
    <section
      className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
      aria-labelledby="compare-state-affordability-heading"
    >
      <h2
        id="compare-state-affordability-heading"
        className="scroll-mt-28 text-center text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
      >
        Cost of living &amp; wages (public data)
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
        Read-only affordability facts from Census ACS, HUD FMR, MIT Living Wage, and BLS —
        not scholarship totals from ScholarshipTop.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <StateAffordabilityColumn name={stateAName} row={rowA} noData={noDataLabel} />
        <StateAffordabilityColumn name={stateBName} row={rowB} noData={noDataLabel} />
      </div>
    </section>
  );
}
