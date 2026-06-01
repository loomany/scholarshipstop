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
import { stateSlugFromCode } from '@/lib/seo/stateCompareSlug';

type InstitutionLike = {
  name: string;
  state?: string | null;
};

type CompareExternalSchoolEnrichmentSectionProps = {
  institutionA: InstitutionLike;
  institutionB: InstitutionLike;
  noDataLabel?: string;
};

type SchoolMetric = {
  key: string;
  label: string;
  value: string | null;
  hint?: string;
};

function schoolMetrics(row: SchoolEnrichment | null): SchoolMetric[] {
  if (!row) return [];

  const metrics: SchoolMetric[] = [
    {
      key: 'tuition_in',
      label: 'In-state tuition',
      value: fmtEnrichmentUsd(row.tuition_in_state),
      hint: 'Annual, before aid'
    },
    {
      key: 'tuition_out',
      label: 'Out-of-state tuition',
      value: fmtEnrichmentUsd(row.tuition_out_of_state),
      hint: 'Annual, before aid'
    },
    {
      key: 'admission',
      label: 'Admission rate',
      value: fmtEnrichmentPctFromFraction(row.admission_rate)
    },
    {
      key: 'completion',
      label: 'Completion rate',
      value: fmtEnrichmentPctFromFraction(row.completion_rate)
    },
    {
      key: 'earnings',
      label: 'Median earnings',
      value: fmtEnrichmentUsd(row.median_earnings),
      hint: '10 years after entry'
    },
    {
      key: 'size',
      label: 'Enrollment',
      value: fmtEnrichmentCount(row.student_size),
      hint: 'Undergraduate headcount'
    }
  ];

  const withValues = metrics.filter((m) => m.value != null);

  return withValues.slice(0, 6);
}

function hasAnySchoolFacts(row: SchoolEnrichment | null): boolean {
  return schoolMetrics(row).length > 0;
}

function SchoolProfileColumn({
  name,
  row,
  cityRent,
  research,
  notAvailable
}: {
  name: string;
  row: SchoolEnrichment | null;
  cityRent: CityRentMetroEnrichment | null;
  research: InstitutionResearchEnrichment | null;
  notAvailable: string;
}) {
  const metrics = schoolMetrics(row);

  if (!metrics.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          No public College Scorecard match for this school name and state.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-base font-semibold leading-snug text-gray-900">{name}</h3>
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
      <InstitutionResearchContext research={research} compact className="mt-4" showSourceFooter={false} />
      <CityRentMetroContext context={cityRent} compact className="mt-4" showSourceFooter={false} />
    </div>
  );
}

function researchCompareBarMetrics(
  rowA: InstitutionResearchEnrichment | null,
  rowB: InstitutionResearchEnrichment | null
) {
  return [
    {
      key: 'works',
      label: 'Works count',
      leftValue: rowA?.works_count ?? null,
      rightValue: rowB?.works_count ?? null,
      hint: 'OpenAlex'
    },
    {
      key: 'citations',
      label: 'Citation count',
      leftValue: rowA?.cited_by_count ?? null,
      rightValue: rowB?.cited_by_count ?? null,
      hint: 'OpenAlex'
    },
    {
      key: 'nih_projects',
      label: 'NIH projects',
      leftValue: rowA?.nih_project_count ?? null,
      rightValue: rowB?.nih_project_count ?? null,
      hint: 'NIH RePORTER aggregate'
    }
  ].filter((metric) => metric.leftValue != null || metric.rightValue != null);
}

function cityRentCompareBarMetrics(
  rowA: CityRentMetroEnrichment | null,
  rowB: CityRentMetroEnrichment | null
) {
  return [
    {
      key: 'zillow_rent',
      label: 'Latest rent estimate',
      leftValue: rowA?.zillow_latest_rent ?? null,
      rightValue: rowB?.zillow_latest_rent ?? null,
      hint: 'Zillow ZORI'
    },
    {
      key: 'hud_1br',
      label: 'HUD 1BR FMR',
      leftValue: rowA?.hud_fmr_1br ?? null,
      rightValue: rowB?.hud_fmr_1br ?? null,
      hint: 'HUD FMR'
    },
    {
      key: 'hud_2br',
      label: 'HUD 2BR FMR',
      leftValue: rowA?.hud_fmr_2br ?? null,
      rightValue: rowB?.hud_fmr_2br ?? null,
      hint: 'HUD FMR'
    },
    {
      key: 'bls_median',
      label: 'Median wage',
      leftValue: rowA?.bls_median_wage ?? null,
      rightValue: rowB?.bls_median_wage ?? null,
      hint: 'BLS OEWS'
    }
  ].filter((metric) => metric.leftValue != null || metric.rightValue != null);
}

export function CompareExternalSchoolEnrichmentSection({
  institutionA,
  institutionB,
  noDataLabel
}: CompareExternalSchoolEnrichmentSectionProps) {
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
  const barMetrics = schoolCompareBarMetrics(rowA, rowB);
  const researchBarMetrics = researchCompareBarMetrics(researchA, researchB);
  const cityRentBarMetrics = cityRentCompareBarMetrics(cityRentA, cityRentB);
  const stateSlugA = institutionA.state ? stateSlugFromCode(institutionA.state) : null;
  const stateSlugB = institutionB.state ? stateSlugFromCode(institutionB.state) : null;

  if (
    !hasAnySchoolFacts(rowA) &&
    !hasAnySchoolFacts(rowB) &&
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
          Public reference data
        </p>
        <h2
          id="compare-uni-enrichment-heading"
          className="scroll-mt-28 mt-2 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24 sm:text-2xl"
        >
          College cost &amp; outcomes
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Official-style college facts matched by school name and state. These figures are
          separate from ScholarshipTop scholarship totals in the comparison table above.
        </p>
      </div>

      {barMetrics.length ? (
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">Visual comparison</h3>
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
            Research activity comparison
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            Public research indicators can help compare academic activity; they do not
            imply scholarship eligibility.
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
            City rent and wage comparison
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            Public rent and wage estimates can help compare cost of attendance
            and relocation planning.
          </p>
          <MetricComparisonBars
            className="mt-4"
            ariaLabel={`City rent and wage comparison between ${institutionA.name} and ${institutionB.name}`}
            leftSeriesLabel={cityRentA ? `${cityRentA.city}, ${cityRentA.state_code}` : institutionA.name}
            rightSeriesLabel={cityRentB ? `${cityRentB.city}, ${cityRentB.state_code}` : institutionB.name}
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
        />
        <SchoolProfileColumn
          name={institutionB.name}
          row={rowB}
          cityRent={cityRentB}
          research={researchB}
          notAvailable={notAvailable}
        />
      </div>

      <div className="mx-auto mt-6 max-w-3xl">
        <InsightCallout
          title="Cost, outcomes, and scholarship fit"
          body="Compare tuition, net price, and earnings alongside scholarship totals above. A higher sticker price may still fit if aid and outcomes align with your goals."
        />
        <InternalLinkCluster
          pageType="compare-university-detail"
          institutionStateSlugA={stateSlugA}
          institutionStateSlugB={stateSlugB}
        />
        <DataSourceFooter variant="college" className="mt-5 text-center" />
      </div>
    </section>
  );
}
