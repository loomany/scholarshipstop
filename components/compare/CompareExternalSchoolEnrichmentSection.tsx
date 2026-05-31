import {
  matchSchoolForInstitution,
  type SchoolEnrichment
} from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  enrichmentNotAvailableLabel,
  fmtEnrichmentCount,
  fmtEnrichmentPctFromFraction,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';

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

  if (row.research_signal != null && String(row.research_signal).trim()) {
    withValues.push({
      key: 'research',
      label: 'Research signal',
      value: String(row.research_signal),
      hint: 'OpenAlex / ROR where matched'
    });
  }

  return withValues.slice(0, row.research_signal != null ? 7 : 6);
}

function hasAnySchoolFacts(row: SchoolEnrichment | null): boolean {
  return schoolMetrics(row).length > 0;
}

function SchoolProfileColumn({
  name,
  row,
  notAvailable
}: {
  name: string;
  row: SchoolEnrichment | null;
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
    </div>
  );
}

export function CompareExternalSchoolEnrichmentSection({
  institutionA,
  institutionB,
  noDataLabel
}: CompareExternalSchoolEnrichmentSectionProps) {
  const notAvailable = enrichmentNotAvailableLabel(noDataLabel);
  const rowA = matchSchoolForInstitution(institutionA);
  const rowB = matchSchoolForInstitution(institutionB);

  if (!hasAnySchoolFacts(rowA) && !hasAnySchoolFacts(rowB)) return null;

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

      <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-5">
        <SchoolProfileColumn name={institutionA.name} row={rowA} notAvailable={notAvailable} />
        <SchoolProfileColumn name={institutionB.name} row={rowB} notAvailable={notAvailable} />
      </div>

      <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-relaxed text-gray-500">
        Data: College Scorecard / OpenAlex / ROR where available. Values may lag the current
        academic year; verify on the institution&apos;s site before decisions.
      </p>
    </section>
  );
}
