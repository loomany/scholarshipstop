import {
  getInstitutionResearchBySchool,
  getRentMetroContextForSchool,
  type CityRentMetroEnrichment,
  type InstitutionResearchEnrichment,
  matchSchoolForInstitution,
  schoolCompareBarMetrics,
  type SchoolEnrichment
} from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  enrichmentNotAvailableLabel,
  fmtEnrichmentCount,
  fmtEnrichmentPctFromFraction,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';
import { CityRentMetroContext } from '@/components/data-viz/CityRentMetroContext';
import { InsightCallout } from '@/components/data-viz/InsightCallout';
import { InstitutionResearchContext } from '@/components/data-viz/InstitutionResearchContext';
import { MetricComparisonBars } from '@/components/data-viz/MetricComparisonBars';
import { InternalLinkCluster } from '@/components/internal-links/InternalLinkCluster';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import {
  getPublicDataVizCopy,
  type PublicDataVizCopy
} from '@/lib/i18n/publicDataVizCopy';
import { stateSlugFromCode } from '@/lib/seo/stateCompareSlug';

type InstitutionLike = {
  name: string;
  state?: string | null;
};

type CompareExternalSchoolEnrichmentSectionProps = {
  institutionA: InstitutionLike;
  institutionB: InstitutionLike;
  noDataLabel?: string;
  locale?: LocalizedUiLocale;
};

type SchoolMetric = {
  key: string;
  label: string;
  value: string | null;
  hint?: string;
};

function schoolMetrics(
  row: SchoolEnrichment | null,
  copy: PublicDataVizCopy
): SchoolMetric[] {
  if (!row) return [];

  const metrics: SchoolMetric[] = [
    {
      key: 'tuition_in',
      label: copy.labels.in_state_tuition,
      value: fmtEnrichmentUsd(row.tuition_in_state),
      hint: copy.hints.annual_before_aid
    },
    {
      key: 'tuition_out',
      label: copy.labels.out_state_tuition,
      value: fmtEnrichmentUsd(row.tuition_out_of_state),
      hint: copy.hints.annual_before_aid
    },
    {
      key: 'admission',
      label: copy.labels.admission_rate,
      value: fmtEnrichmentPctFromFraction(row.admission_rate)
    },
    {
      key: 'completion',
      label: copy.labels.completion_rate,
      value: fmtEnrichmentPctFromFraction(row.completion_rate)
    },
    {
      key: 'earnings',
      label: copy.labels.median_earnings,
      value: fmtEnrichmentUsd(row.median_earnings),
      hint: copy.hints.ten_years_after_entry
    },
    {
      key: 'size',
      label: copy.labels.enrollment,
      value: fmtEnrichmentCount(row.student_size),
      hint: copy.hints.undergraduate_headcount
    }
  ];

  const withValues = metrics.filter((m) => m.value != null);

  return withValues.slice(0, 6);
}

function hasAnySchoolFacts(
  row: SchoolEnrichment | null,
  copy: PublicDataVizCopy
): boolean {
  return schoolMetrics(row, copy).length > 0;
}

function SchoolProfileColumn({
  name,
  row,
  cityRent,
  research,
  notAvailable,
  copy,
  locale
}: {
  name: string;
  row: SchoolEnrichment | null;
  cityRent: CityRentMetroEnrichment | null;
  research: InstitutionResearchEnrichment | null;
  notAvailable: string;
  copy: PublicDataVizCopy;
  locale: LocalizedUiLocale;
}) {
  const metrics = schoolMetrics(row, copy);

  if (!metrics.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {copy.schoolNoMatch}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-base font-semibold leading-snug text-gray-900">
        {name}
      </h3>
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
      <InstitutionResearchContext
        research={research}
        compact
        locale={locale}
        className="mt-4"
        showSourceFooter={false}
      />
      <CityRentMetroContext
        context={cityRent}
        compact
        locale={locale}
        className="mt-4"
        showSourceFooter={false}
      />
    </div>
  );
}

function researchCompareBarMetrics(
  rowA: InstitutionResearchEnrichment | null,
  rowB: InstitutionResearchEnrichment | null,
  copy: PublicDataVizCopy
) {
  return [
    {
      key: 'works',
      label: copy.labels.works_count,
      leftValue: rowA?.works_count ?? null,
      rightValue: rowB?.works_count ?? null,
      hint: 'OpenAlex'
    },
    {
      key: 'citations',
      label: copy.labels.citation_count,
      leftValue: rowA?.cited_by_count ?? null,
      rightValue: rowB?.cited_by_count ?? null,
      hint: 'OpenAlex'
    },
    {
      key: 'nih_projects',
      label: copy.labels.nih_projects,
      leftValue: rowA?.nih_project_count ?? null,
      rightValue: rowB?.nih_project_count ?? null,
      hint: 'NIH RePORTER aggregate'
    }
  ].filter((metric) => metric.leftValue != null || metric.rightValue != null);
}

function cityRentCompareBarMetrics(
  rowA: CityRentMetroEnrichment | null,
  rowB: CityRentMetroEnrichment | null,
  copy: PublicDataVizCopy
) {
  return [
    {
      key: 'zillow_rent',
      label: copy.labels.latest_rent_estimate,
      leftValue: rowA?.zillow_latest_rent ?? null,
      rightValue: rowB?.zillow_latest_rent ?? null,
      hint: 'Zillow ZORI'
    },
    {
      key: 'hud_1br',
      label: copy.labels.hud_1br_fmr,
      leftValue: rowA?.hud_fmr_1br ?? null,
      rightValue: rowB?.hud_fmr_1br ?? null,
      hint: 'HUD FMR'
    },
    {
      key: 'hud_2br',
      label: copy.labels.hud_2br_fmr,
      leftValue: rowA?.hud_fmr_2br ?? null,
      rightValue: rowB?.hud_fmr_2br ?? null,
      hint: 'HUD FMR'
    },
    {
      key: 'bls_median',
      label: copy.labels.median_wage,
      leftValue: rowA?.bls_median_wage ?? null,
      rightValue: rowB?.bls_median_wage ?? null,
      hint: 'BLS OEWS'
    }
  ].filter((metric) => metric.leftValue != null || metric.rightValue != null);
}

export function CompareExternalSchoolEnrichmentSection({
  institutionA,
  institutionB,
  noDataLabel,
  locale = 'en'
}: CompareExternalSchoolEnrichmentSectionProps) {
  const copy = getPublicDataVizCopy(locale);
  const notAvailable = enrichmentNotAvailableLabel(noDataLabel);
  const rowA = matchSchoolForInstitution(institutionA);
  const rowB = matchSchoolForInstitution(institutionB);
  const researchA = getInstitutionResearchBySchool({
    name: rowA?.school_name ?? institutionA.name,
    state: rowA?.state ?? institutionA.state,
    unitId: rowA?.unit_id,
    rorId: rowA?.ror_id,
    openAlexId: rowA?.openalex_id
  });
  const researchB = getInstitutionResearchBySchool({
    name: rowB?.school_name ?? institutionB.name,
    state: rowB?.state ?? institutionB.state,
    unitId: rowB?.unit_id,
    rorId: rowB?.ror_id,
    openAlexId: rowB?.openalex_id
  });
  const cityRentA = getRentMetroContextForSchool({
    city: rowA?.city,
    state: rowA?.state ?? institutionA.state
  });
  const cityRentB = getRentMetroContextForSchool({
    city: rowB?.city,
    state: rowB?.state ?? institutionB.state
  });
  const barMetrics = schoolCompareBarMetrics(rowA, rowB).map((metric) => ({
    ...metric,
    label:
      metric.key === 'tuition_in'
        ? copy.labels.in_state_tuition
        : metric.key === 'tuition_out'
          ? copy.labels.out_state_tuition
          : metric.key === 'admission'
            ? copy.labels.admission_rate
            : metric.key === 'completion'
              ? copy.labels.completion_rate
              : metric.key === 'earnings'
                ? copy.labels.median_earnings
                : metric.label,
    hint:
      metric.key === 'tuition_in' || metric.key === 'tuition_out'
        ? copy.hints.annual_before_aid
        : metric.key === 'earnings'
          ? copy.hints.ten_years_after_entry
          : metric.key === 'completion'
            ? copy.hints.completion_within_time
            : metric.key === 'admission'
              ? copy.hints.share_admitted
              : metric.hint
  }));
  const researchBarMetrics = researchCompareBarMetrics(
    researchA,
    researchB,
    copy
  );
  const cityRentBarMetrics = cityRentCompareBarMetrics(
    cityRentA,
    cityRentB,
    copy
  );
  const stateSlugA = institutionA.state
    ? stateSlugFromCode(institutionA.state)
    : null;
  const stateSlugB = institutionB.state
    ? stateSlugFromCode(institutionB.state)
    : null;

  if (
    !hasAnySchoolFacts(rowA, copy) &&
    !hasAnySchoolFacts(rowB, copy) &&
    !researchA &&
    !researchB &&
    !cityRentA &&
    !cityRentB
  ) {
    return null;
  }

  return (
    <section
      className="mt-10 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-6 shadow-sm sm:p-8"
      aria-labelledby="compare-uni-enrichment-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {copy.publicReferenceData}
        </p>
        <h2
          id="compare-uni-enrichment-heading"
          className="scroll-mt-28 mt-2 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24 sm:text-2xl"
        >
          {copy.collegeCostOutcomes}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {copy.collegeCostOutcomesBody}
        </p>
      </div>

      {barMetrics.length ? (
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            {copy.visualComparison}
          </h3>
          <MetricComparisonBars
            className="mt-4"
            ariaLabel={`College cost comparison between ${institutionA.name} and ${institutionB.name}`}
            leftSeriesLabel={institutionA.name}
            rightSeriesLabel={institutionB.name}
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

      {researchBarMetrics.length ? (
        <div className="mx-auto mt-5 max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            {copy.researchActivityComparison}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            {copy.researchActivityBody}
          </p>
          <MetricComparisonBars
            className="mt-4"
            ariaLabel={`Research activity comparison between ${institutionA.name} and ${institutionB.name}`}
            leftSeriesLabel={institutionA.name}
            rightSeriesLabel={institutionB.name}
            metrics={researchBarMetrics}
            fractionMetrics={false}
          />
        </div>
      ) : null}

      {cityRentBarMetrics.length ? (
        <div className="mx-auto mt-5 max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            {copy.cityRentWageComparison}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            {copy.cityRentWageBody}
          </p>
          <MetricComparisonBars
            className="mt-4"
            ariaLabel={`City rent and wage comparison between ${institutionA.name} and ${institutionB.name}`}
            leftSeriesLabel={
              cityRentA
                ? `${cityRentA.city}, ${cityRentA.state_code}`
                : institutionA.name
            }
            rightSeriesLabel={
              cityRentB
                ? `${cityRentB.city}, ${cityRentB.state_code}`
                : institutionB.name
            }
            metrics={cityRentBarMetrics}
            fractionMetrics={false}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-5">
        <SchoolProfileColumn
          name={institutionA.name}
          row={rowA}
          cityRent={cityRentA}
          research={researchA}
          notAvailable={notAvailable}
          copy={copy}
          locale={locale}
        />
        <SchoolProfileColumn
          name={institutionB.name}
          row={rowB}
          cityRent={cityRentB}
          research={researchB}
          notAvailable={notAvailable}
          copy={copy}
          locale={locale}
        />
      </div>

      <div className="mx-auto mt-6 max-w-3xl">
        <InsightCallout
          title={copy.schoolFitCalloutTitle}
          body={copy.schoolFitCalloutBody}
        />
        <InternalLinkCluster
          pageType="compare-university-detail"
          institutionStateSlugA={stateSlugA}
          institutionStateSlugB={stateSlugB}
        />
        <DataSourceFooter
          variant="college"
          locale={locale}
          className="mt-5 text-center"
        />
      </div>
    </section>
  );
}
