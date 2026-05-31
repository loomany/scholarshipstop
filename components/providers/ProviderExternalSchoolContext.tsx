import { matchProviderToSchool, schoolSingleBarMetrics } from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  fmtEnrichmentCount,
  fmtEnrichmentPctFromFraction,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';
import { RelatedScholarshipContextLinks } from '@/components/content-hub/RelatedScholarshipContextLinks';
import { CompactMetricGrid } from '@/components/data-viz/CompactMetricGrid';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';
import { MetricComparisonBars } from '@/components/data-viz/MetricComparisonBars';

type ProviderExternalSchoolContextProps = {
  displayName: string;
  hqState?: string | null;
};

export function ProviderExternalSchoolContext({
  displayName,
  hqState
}: ProviderExternalSchoolContextProps) {
  const row = matchProviderToSchool({ displayName, hqState });
  if (!row) return null;

  const cards = [
    row.city && row.state ?
      {
        key: 'location',
        label: 'Location',
        value: `${row.city}, ${row.state}`
      }
    : null,
    row.tuition_in_state != null ?
      {
        key: 'tuition_in',
        label: 'In-state tuition',
        value: fmtEnrichmentUsd(row.tuition_in_state)
      }
    : null,
    row.avg_net_price != null ?
      {
        key: 'net_price',
        label: 'Avg net price',
        value: fmtEnrichmentUsd(row.avg_net_price)
      }
    : null,
    row.admission_rate != null ?
      {
        key: 'admission',
        label: 'Admission rate',
        value: fmtEnrichmentPctFromFraction(row.admission_rate)
      }
    : null,
    row.completion_rate != null ?
      {
        key: 'completion',
        label: 'Completion rate',
        value: fmtEnrichmentPctFromFraction(row.completion_rate)
      }
    : null,
    row.median_earnings != null ?
      {
        key: 'earnings',
        label: 'Median earnings',
        value: fmtEnrichmentUsd(row.median_earnings)
      }
    : null,
    row.student_size != null ?
      {
        key: 'size',
        label: 'Enrollment',
        value: fmtEnrichmentCount(row.student_size)
      }
    : null
  ].filter(
    (item): item is { key: string; label: string; value: string | null } => item != null
  );

  const visible = cards.filter((c) => c.value != null);
  if (!visible.length) return null;

  const barMetrics = schoolSingleBarMetrics(row).filter((m) =>
    ['tuition_in', 'net_price', 'earnings', 'size'].includes(m.key)
  );
  const providerContext = {
    stateCode: row.state ?? null,
    stateRow: null,
    cityRow: null,
    schoolRow: row
  };

  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6"
      aria-labelledby="provider-school-context-heading"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Public reference data
      </p>
      <h2
        id="provider-school-context-heading"
        className="mt-1 text-lg font-bold text-gray-900"
      >
        College / provider context
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Matched to {row.school_name} from College Scorecard by name and state. Shown only
        when the match is unambiguous.
      </p>

      <CompactMetricGrid
        className="mt-4"
        items={visible.map((card) => ({
          key: card.key,
          label: card.label,
          value: card.value
        }))}
      />

      {barMetrics.length ? (
        <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-3.5">
          <h3 className="text-sm font-semibold text-gray-900">Cost & outcomes</h3>
          <MetricComparisonBars
            className="mt-3"
            ariaLabel={`Cost and outcomes for ${row.school_name}`}
            leftSeriesLabel="Value"
            rightSeriesLabel="Scale"
            metrics={barMetrics}
          />
        </div>
      ) : null}

      <RelatedScholarshipContextLinks
        cluster="provider"
        context={providerContext}
      />
      <DataSourceFooter variant="college" className="mt-4" />
    </section>
  );
}
