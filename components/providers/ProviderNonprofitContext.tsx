import { matchProviderToNonprofit } from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';

type ProviderNonprofitContextProps = {
  displayName: string;
  hqState?: string | null;
};

function hasValue(value: unknown): value is string | number | boolean {
  return value != null && value !== '';
}

function formatFiling(value: boolean | null | undefined): string | null {
  if (value == null) return null;
  return value ? 'Recent filing available' : 'No recent filing shown';
}

function formatUsaspending(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

export function ProviderNonprofitContext({
  displayName,
  hqState
}: ProviderNonprofitContextProps) {
  const nonprofit = matchProviderToNonprofit({ displayName, hqState });
  if (!nonprofit) return null;

  const cards = [
    nonprofit.ein ? { key: 'ein', label: 'EIN', value: nonprofit.ein } : null,
    nonprofit.ntee_description || nonprofit.ntee_code
      ? {
          key: 'category',
          label: 'Category',
          value: nonprofit.ntee_description ?? nonprofit.ntee_code ?? null
        }
      : null,
    nonprofit.organization_type
      ? {
          key: 'type',
          label: 'Organization type',
          value: nonprofit.organization_type
        }
      : null,
    nonprofit.ruling_year
      ? {
          key: 'ruling',
          label: 'Ruling year',
          value: String(nonprofit.ruling_year)
        }
      : null,
    nonprofit.revenue_band
      ? {
          key: 'revenue',
          label: 'Revenue band',
          value: nonprofit.revenue_band
        }
      : null,
    nonprofit.assets_band
      ? {
          key: 'assets',
          label: 'Assets band',
          value: nonprofit.assets_band
        }
      : null,
    formatFiling(nonprofit.has_recent_filing)
      ? {
          key: 'filing',
          label: 'Public filing',
          value: formatFiling(nonprofit.has_recent_filing)
        }
      : null,
    nonprofit.usaspending_award_count
      ? {
          key: 'usaspending_count',
          label: 'USAspending awards',
          value: nonprofit.usaspending_award_count.toLocaleString()
        }
      : null,
    formatUsaspending(nonprofit.usaspending_total_obligated)
      ? {
          key: 'usaspending_total',
          label: 'USAspending total',
          value: formatUsaspending(nonprofit.usaspending_total_obligated)
        }
      : null
  ].filter(
    (item): item is { key: string; label: string; value: string } =>
      item != null && hasValue(item.value)
  );

  if (!cards.length) return null;

  const location =
    nonprofit.city && nonprofit.state
      ? `${nonprofit.city}, ${nonprofit.state}`
      : nonprofit.state ?? null;

  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="provider-nonprofit-context-heading"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Public nonprofit context
      </p>
      <h2
        id="provider-nonprofit-context-heading"
        className="mt-1 text-lg font-bold text-gray-900"
      >
        Nonprofit organization context
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Matched to {nonprofit.name}
        {location ? ` in ${location}` : ''} using strict public nonprofit identity
        fields. Hidden when the match is ambiguous.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {cards.map((card) => (
          <CompareExternalEnrichmentStatCard
            key={card.key}
            label={card.label}
            value={card.value}
          />
        ))}
      </div>

      {nonprofit.propublica_url ? (
        <a
          href={nonprofit.propublica_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-white"
        >
          ProPublica Nonprofit Explorer
        </a>
      ) : null}

      <DataSourceFooter variant="nonprofit" className="mt-4" />
    </section>
  );
}
