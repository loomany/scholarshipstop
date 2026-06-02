import type { StateSocialContext } from '@/lib/external-data';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getPublicDataVizCopy } from '@/lib/i18n/publicDataVizCopy';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';

type StateSocialContextBlockProps = {
  context: StateSocialContext | null;
  className?: string;
  compact?: boolean;
  showSourceFooter?: boolean;
  locale?: LocalizedUiLocale;
};

function hasSocialContext(
  context: StateSocialContext | null
): context is StateSocialContext {
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
  compact = false,
  showSourceFooter = true,
  locale = 'en'
}: StateSocialContextBlockProps) {
  if (!hasSocialContext(context)) return null;
  const copy = getPublicDataVizCopy(locale);

  const cards = [
    context.svi_percentile_band
      ? {
          key: 'svi_band',
          label: copy.labels.cdc_svi_band,
          value: context.svi_percentile_band
        }
      : null,
    context.adi_percentile_band
      ? {
          key: 'adi_band',
          label: copy.labels.adi_band,
          value: context.adi_percentile_band
        }
      : null,
    context.counties_with_svi_data
      ? {
          key: 'svi_counties',
          label: copy.labels.svi_counties,
          value: context.counties_with_svi_data.toLocaleString()
        }
      : null,
    context.counties_with_adi_data
      ? {
          key: 'adi_counties',
          label: copy.labels.adi_counties,
          value: context.counties_with_adi_data.toLocaleString()
        }
      : null,
    context.counties_with_health_data
      ? {
          key: 'health_counties',
          label: copy.labels.county_health_data,
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
        {copy.publicPlanningContext}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        {copy.publicPlanningBody}
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

      {showSourceFooter ? (
        <DataSourceFooter variant="social" locale={locale} className="mt-3" />
      ) : null}
    </div>
  );
}
