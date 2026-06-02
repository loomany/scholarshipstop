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
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import {
  getPublicDataVizCopy,
  type PublicDataVizCopy
} from '@/lib/i18n/publicDataVizCopy';
import { stateSlugFromCode } from '@/lib/seo/stateCompareSlug';

type CompareExternalStateAffordabilitySectionProps = {
  stateAName: string;
  stateACode: string;
  stateBName: string;
  stateBCode: string;
  noDataLabel?: string;
  locale?: LocalizedUiLocale;
};

type StateMetric = {
  key: string;
  label: string;
  value: string | null;
  hint?: string;
};

function stateMetrics(
  row: StateAffordability | null,
  copy: PublicDataVizCopy
): StateMetric[] {
  if (!row) return [];

  const income = isPlausibleHouseholdIncome(row.median_household_income)
    ? fmtEnrichmentUsd(row.median_household_income)
    : null;

  const metrics: StateMetric[] = [
    {
      key: 'income',
      label: copy.labels.median_household_income,
      value: income,
      hint: copy.hints.census_acs
    },
    {
      key: 'fmr2',
      label: copy.labels.fair_market_rent_2br,
      value: fmtEnrichmentUsd(row.hud_fmr_2br),
      hint: copy.hints.hud_monthly
    },
    {
      key: 'living_wage',
      label: copy.labels.living_wage,
      value: fmtEnrichmentHourly(row.living_wage_single_adult),
      hint: copy.hints.single_adult_mit
    },
    {
      key: 'bls',
      label: copy.labels.bls_median_wage,
      value: fmtEnrichmentUsd(row.bls_median_wage),
      hint: copy.hints.state_occupational
    }
  ];

  return metrics.filter((m) => m.value != null);
}

function publicSafetyNote(
  row: StateAffordability | null,
  copy: PublicDataVizCopy
): string | null {
  const ctx = row?.public_safety_context;
  const rate = fmtEnrichmentRatePer100k(ctx?.value);
  if (!rate) return null;
  return copy.stateSafetyNote(rate);
}

function StateAffordabilityColumn({
  name,
  row,
  social,
  notAvailable,
  copy,
  locale
}: {
  name: string;
  row: StateAffordability | null;
  social: StateSocialContext | null;
  notAvailable: string;
  copy: PublicDataVizCopy;
  locale: LocalizedUiLocale;
}) {
  const metrics = stateMetrics(row, copy);
  const safetyNote = publicSafetyNote(row, copy);

  if (!metrics.length && !safetyNote && !social) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        <p className="mt-2 text-sm text-gray-600">
          {notAvailable} {copy.stateNoDataSuffix}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-base font-semibold leading-snug text-gray-900">
        {name}
      </h3>

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

      <StateSocialContextBlock
        context={social}
        compact
        locale={locale}
        className="mt-4"
        showSourceFooter={false}
      />
    </div>
  );
}

function hasAffordabilityContent(
  row: StateAffordability | null,
  social: StateSocialContext | null,
  copy: PublicDataVizCopy
): boolean {
  return (
    stateMetrics(row, copy).length > 0 ||
    publicSafetyNote(row, copy) != null ||
    social != null
  );
}

export function CompareExternalStateAffordabilitySection({
  stateAName,
  stateACode,
  stateBName,
  stateBCode,
  noDataLabel,
  locale = 'en'
}: CompareExternalStateAffordabilitySectionProps) {
  const copy = getPublicDataVizCopy(locale);
  const notAvailable = enrichmentNotAvailableLabel(noDataLabel);
  const rowA = getStateAffordability(stateACode);
  const rowB = getStateAffordability(stateBCode);
  const socialA = getStateSocialContext(stateACode);
  const socialB = getStateSocialContext(stateBCode);
  const slugA = stateSlugFromCode(stateACode);
  const slugB = stateSlugFromCode(stateBCode);
  const barMetrics = stateCompareBarMetrics(rowA, rowB).map((metric) => ({
    ...metric,
    label:
      metric.key === 'income'
        ? copy.labels.median_household_income
        : metric.key === 'fmr2'
          ? copy.labels.fair_market_rent_2br
          : metric.key === 'living_wage'
            ? copy.labels.living_wage
            : metric.key === 'bls'
              ? copy.labels.bls_median_wage
              : metric.label,
    hint:
      metric.key === 'income'
        ? copy.hints.census_acs
        : metric.key === 'fmr2'
          ? copy.hints.hud_monthly
          : metric.key === 'living_wage'
            ? copy.hints.single_adult_mit
            : metric.key === 'bls'
              ? copy.hints.state_occupational
              : metric.hint
  }));
  const showSafetyNote =
    publicSafetyNote(rowA, copy) != null ||
    publicSafetyNote(rowB, copy) != null;

  if (
    !hasAffordabilityContent(rowA, socialA, copy) &&
    !hasAffordabilityContent(rowB, socialB, copy)
  ) {
    return null;
  }

  return (
    <section
      className="mt-10 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-6 shadow-sm sm:p-8"
      aria-labelledby="compare-state-affordability-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {copy.publicReferenceData}
        </p>
        <h2
          id="compare-state-affordability-heading"
          className="scroll-mt-28 mt-2 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24 sm:text-2xl"
        >
          {copy.costLivingWages}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {copy.stateAffordabilityBody}
        </p>
      </div>

      {barMetrics.length ? (
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            {copy.visualComparison}
          </h3>
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
          copy={copy}
          locale={locale}
        />
        <StateAffordabilityColumn
          name={stateBName}
          row={rowB}
          social={socialB}
          notAvailable={notAvailable}
          copy={copy}
          locale={locale}
        />
      </div>

      <div className="mx-auto mt-6 max-w-3xl">
        <InsightCallout
          title={copy.statePlanningCalloutTitle}
          body={copy.statePlanningCalloutBody}
        />
        <InternalLinkCluster
          pageType="compare-state-detail"
          compareStateSlugA={slugA}
          compareStateSlugB={slugB}
        />
        <DataSourceFooter
          variant="state"
          showPublicSafetyNote={showSafetyNote}
          locale={locale}
          className="mt-5 text-center"
        />
      </div>
    </section>
  );
}
