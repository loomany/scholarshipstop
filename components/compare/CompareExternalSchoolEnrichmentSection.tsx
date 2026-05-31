import {
  matchSchoolForInstitution,
  type SchoolEnrichment
} from '@/lib/external-data';

type InstitutionLike = {
  name: string;
  state?: string | null;
};

type CompareExternalSchoolEnrichmentSectionProps = {
  institutionA: InstitutionLike;
  institutionB: InstitutionLike;
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

function fmtPctFraction(value: number | null | undefined, noData: string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return noData;
  return `${(value * 100).toFixed(1)}%`;
}

function fmtNum(value: number | null | undefined, noData: string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return noData;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function hasAnySchoolFacts(row: SchoolEnrichment | null): boolean {
  if (!row) return false;
  return [
    row.tuition_in_state,
    row.tuition_out_of_state,
    row.admission_rate,
    row.completion_rate,
    row.median_earnings,
    row.student_size,
    row.research_signal
  ].some((v) => v != null);
}

function SchoolFactsTable({
  name,
  row,
  noData
}: {
  name: string;
  row: SchoolEnrichment | null;
  noData: string;
}) {
  if (!hasAnySchoolFacts(row)) {
    return (
      <p className="text-sm text-gray-600">
        No College Scorecard match for {name} in static enrichment data.
      </p>
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <caption className="mb-2 text-left text-sm font-semibold text-gray-900">{name}</caption>
      <tbody className="divide-y divide-gray-100">
        <tr>
          <th className="py-2 pr-3 font-medium text-gray-600">In-state tuition</th>
          <td className="py-2 tabular-nums text-gray-900">
            {fmtUsd(row?.tuition_in_state, noData)}
          </td>
        </tr>
        <tr>
          <th className="py-2 pr-3 font-medium text-gray-600">Out-of-state tuition</th>
          <td className="py-2 tabular-nums text-gray-900">
            {fmtUsd(row?.tuition_out_of_state, noData)}
          </td>
        </tr>
        <tr>
          <th className="py-2 pr-3 font-medium text-gray-600">Admission rate</th>
          <td className="py-2 tabular-nums text-gray-900">
            {fmtPctFraction(row?.admission_rate, noData)}
          </td>
        </tr>
        <tr>
          <th className="py-2 pr-3 font-medium text-gray-600">Completion rate</th>
          <td className="py-2 tabular-nums text-gray-900">
            {fmtPctFraction(row?.completion_rate, noData)}
          </td>
        </tr>
        <tr>
          <th className="py-2 pr-3 font-medium text-gray-600">Median earnings</th>
          <td className="py-2 tabular-nums text-gray-900">
            {fmtUsd(row?.median_earnings, noData)}
          </td>
        </tr>
        <tr>
          <th className="py-2 pr-3 font-medium text-gray-600">Student size</th>
          <td className="py-2 tabular-nums text-gray-900">
            {fmtNum(row?.student_size, noData)}
          </td>
        </tr>
        {row?.research_signal != null ? (
          <tr>
            <th className="py-2 pr-3 font-medium text-gray-600">Research signal</th>
            <td className="py-2 text-gray-900">{String(row.research_signal)}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

export function CompareExternalSchoolEnrichmentSection({
  institutionA,
  institutionB,
  noDataLabel = '—'
}: CompareExternalSchoolEnrichmentSectionProps) {
  const rowA = matchSchoolForInstitution(institutionA);
  const rowB = matchSchoolForInstitution(institutionB);

  if (!hasAnySchoolFacts(rowA) && !hasAnySchoolFacts(rowB)) return null;

  return (
    <section
      className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
      aria-labelledby="compare-uni-enrichment-heading"
    >
      <h2
        id="compare-uni-enrichment-heading"
        className="scroll-mt-28 text-center text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
      >
        College profile (public data)
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
        Matched from College Scorecard static enrichment by school name and state — separate
        from ScholarshipTop scholarship catalog totals above.
      </p>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <SchoolFactsTable name={institutionA.name} row={rowA} noData={noDataLabel} />
        <SchoolFactsTable name={institutionB.name} row={rowB} noData={noDataLabel} />
      </div>
    </section>
  );
}
