import {
  getStateSocialContext,
  getStateAffordability,
  isPlausibleHouseholdIncome,
  stateCompareBarMetrics,
  type StateAffordability,
  type StateSocialContext
} from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  enrichmentNotAvailableLabel,
  fmtEnrichmentHourly,
  fmtEnrichmentRatePer100k,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';
import { InsightCallout } from '@/components/data-viz/InsightCallout';
import { MetricComparisonBars } from '@/components/data-viz/MetricComparisonBars';
import { StateSocialContextBlock } from '@/components/data-viz/StateSocialContextBlock';
import { InternalLinkCluster } from '@/components/internal-links/InternalLinkCluster';
import { stateSlugFromCode } from '@/lib/seo/stateCompareSlug';

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
  social,
  notAvailable
}: {
  name: string;
  row: StateAffordability | null;
  social: StateSocialContext | null;
  notAvailable: string;
}) {
  const metrics = stateMetrics(row);
  const safetyNote = publicSafetyNote(row);

  if (!metrics.length && !safetyNote && !social) {
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

      <StateSocialContextBlock context={social} compact className="mt-4" />
    </div>
  );
}

function hasAffordabilityContent(
  row: StateAffordability | null,
  social: StateSocialContext | null
): boolean {
  return stateMetrics(row).length > 0 || publicSafetyNote(row) != null || social != null;
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
  const socialA = getStateSocialContext(stateACode);
  const socialB = getStateSocialContext(stateBCode);
  const slugA = stateSlugFromCode(stateACode);
  const slugB = stateSlugFromCode(stateBCode);
  const barMetrics = stateCompareBarMetrics(rowA, rowB);
  const showSafetyNote =
    publicSafetyNote(rowA) != null || publicSafetyNote(rowB) != null;

  if (!hasAffordabilityContent(rowA, socialA) && !hasAffordabilityContent(rowB, socialB)) {
    return null;
  }

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

      {barMetrics.length ? (
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">Visual comparison</h3>
          <MetricComparisonBars
            className="mt-4"
            ariaLabel={`Affordability comparison between ${stateAName} and ${stateBName}`}
            leftSeriesLabel={stateAName}
            rightSeriesLabel={stateBName}
            metrics={barMetrics.map((metric) => ({
              key: metric.key,
              label: metric.label,
              leftValue: metric.leftValue,
              rightValue: metric.rightValue,
              hint: metric.hint
            }))}
            fractionMetrics={false}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-5">
        <StateAffordabilityColumn
          name={stateAName}
          row={rowA}
          social={socialA}
          notAvailable={notAvailable}
        />
        <StateAffordabilityColumn
          name={stateBName}
          row={rowB}
          social={socialB}
          notAvailable={notAvailable}
        />
      </div>

      <div className="mx-auto mt-6 max-w-3xl">
        <InsightCallout
          title="Why this matters for scholarship planning"
          body="Use these numbers to compare scholarship value, relocation costs, and likely out-of-pocket living expenses. A larger award in a higher-cost state may cover less than a smaller award elsewhere."
        />
        <InternalLinkCluster
          pageType="compare-state-detail"
          compareStateSlugA={slugA}
          compareStateSlugB={slugB}
        />
        <DataSourceFooter
          variant="state"
          showPublicSafetyNote={showSafetyNote}
          className="mt-5 text-center"
        />
      </div>
    </section>
  );
}
