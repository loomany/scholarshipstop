import type { StateSocialContext } from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';

type StateSocialContextBlockProps = {
  context: StateSocialContext | null;
  className?: string;
  compact?: boolean;
};

function hasSocialContext(context: StateSocialContext | null): context is StateSocialContext {
  return Boolean(
    context &&
      (context.svi_context ||
        context.adi_context ||
        context.county_health_context ||
        context.counties_with_svi_data ||
        context.counties_with_adi_data ||
        context.counties_with_health_data)
  );
}

export function StateSocialContextBlock({
  context,
  className = '',
  compact = false
}: StateSocialContextBlockProps) {
  if (!hasSocialContext(context)) return null;

  const cards = [
    context.svi_percentile_band
      ? {
          key: 'svi_band',
          label: 'CDC SVI band',
          value: context.svi_percentile_band
        }
      : null,
    context.adi_percentile_band
      ? {
          key: 'adi_band',
          label: 'ADI band',
          value: context.adi_percentile_band
        }
      : null,
    context.counties_with_svi_data
      ? {
          key: 'svi_counties',
          label: 'SVI counties',
          value: context.counties_with_svi_data.toLocaleString()
        }
      : null,
    context.counties_with_adi_data
      ? {
          key: 'adi_counties',
          label: 'ADI counties',
          value: context.counties_with_adi_data.toLocaleString()
        }
      : null,
    context.counties_with_health_data
      ? {
          key: 'health_counties',
          label: 'County health data',
          value: context.counties_with_health_data.toLocaleString()
        }
      : null
  ].filter(
    (item): item is { key: string; label: string; value: string } =>
      item != null && item.value.trim().length > 0
  );

  const notes = [
    context.svi_context,
    context.adi_context,
    context.county_health_context
  ].filter((note): note is string => Boolean(note?.trim()));

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-3.5 ${className}`.trim()}
    >
      <h3 className="text-sm font-semibold text-gray-900">
        Public planning context
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        Community indicators vary by county and are included only as public
        planning context. Use this alongside scholarship amount, school cost,
        and living expenses — not as an eligibility rule.
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

      {notes.length ? (
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-600">
          {notes.slice(0, compact ? 2 : 3).map((note) => (
            <li key={note} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <DataSourceFooter variant="social" className="mt-3" />
    </div>
  );
}
