import { matchProviderToSchool } from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  fmtEnrichmentCount,
  fmtEnrichmentPctFromFraction,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';

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
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {visible.map((card) => (
          <CompareExternalEnrichmentStatCard
            key={card.key}
            label={card.label}
            value={card.value!}
          />
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Data: College Scorecard / public reference data. Not a ScholarshipTop verification
        of provider programs.
      </p>
    </section>
  );
}
