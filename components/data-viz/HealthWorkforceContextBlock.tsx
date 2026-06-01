import type { HealthWorkforceContext } from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  fmtEnrichmentCount,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';

type HealthWorkforceContextBlockProps = {
  context: HealthWorkforceContext | null;
  className?: string;
  compact?: boolean;
};

function healthWorkforceCards(row: HealthWorkforceContext) {
  return [
    row.healthcare_median_wage != null
      ? {
          key: 'healthcare',
          label: 'Healthcare median wage',
          value: fmtEnrichmentUsd(row.healthcare_median_wage) ?? ''
        }
      : null,
    row.nursing_median_wage != null
      ? {
          key: 'nursing',
          label: 'Nursing median wage',
          value: fmtEnrichmentUsd(row.nursing_median_wage) ?? ''
        }
      : null,
    row.physician_assistant_median_wage != null
      ? {
          key: 'pa',
          label: 'PA median wage',
          value: fmtEnrichmentUsd(row.physician_assistant_median_wage) ?? ''
        }
      : null,
    row.medical_assistant_median_wage != null
      ? {
          key: 'ma',
          label: 'Medical assistant wage',
          value: fmtEnrichmentUsd(row.medical_assistant_median_wage) ?? ''
        }
      : null,
    row.hpsa_count != null
      ? {
          key: 'hpsa',
          label: 'HPSA areas',
          value: fmtEnrichmentCount(row.hpsa_count) ?? ''
        }
      : null
  ].filter(
    (item): item is { key: string; label: string; value: string } =>
      item != null && item.value.trim().length > 0
  );
}

export function HealthWorkforceContextBlock({
  context,
  className = '',
  compact = false
}: HealthWorkforceContextBlockProps) {
  if (!context) return null;

  const cards = healthWorkforceCards(context);
  if (!cards.length && !context.workforce_context && !context.hpsa_context) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-3.5 ${className}`.trim()}
    >
      <h3 className="text-sm font-semibold text-gray-900">
        Health workforce context
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        Public workforce indicators can support healthcare scholarship planning.
        They do not create eligibility or funding guarantees.
      </p>

      {cards.length ? (
        <div
          className={`mt-3 grid gap-2.5 ${
            compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {cards.slice(0, compact ? 4 : 5).map((card) => (
            <CompareExternalEnrichmentStatCard
              key={card.key}
              label={card.label}
              value={card.value}
            />
          ))}
        </div>
      ) : null}

      {context.workforce_context || context.hpsa_context ? (
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-600">
          {context.workforce_context ? (
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{context.workforce_context}</span>
            </li>
          ) : null}
          {context.hpsa_context ? (
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{context.hpsa_context}</span>
            </li>
          ) : null}
        </ul>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        Data sources: BLS OEWS and HRSA HPSA public data aggregated to
        state-level health workforce planning context.
      </p>
      <DataSourceFooter variant="mixed" className="mt-2" />
    </div>
  );
}
