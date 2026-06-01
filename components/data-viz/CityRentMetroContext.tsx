import type { CityRentMetroEnrichment } from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  fmtEnrichmentCount,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';

type CityRentMetroContextProps = {
  context: CityRentMetroEnrichment | null;
  className?: string;
  compact?: boolean;
  showSourceFooter?: boolean;
};

type CityMetricCard = {
  key: string;
  label: string;
  value: string;
  hint?: string;
};

function fmtPct(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function cityCards(row: CityRentMetroEnrichment): CityMetricCard[] {
  const cards: Array<CityMetricCard | null> = [
    row.zillow_latest_rent != null
      ? {
          key: 'zillow_rent',
          label: 'Latest rent estimate',
          value: fmtEnrichmentUsd(row.zillow_latest_rent) ?? '',
          hint: row.zillow_latest_month ?? 'Zillow ZORI'
        }
      : null,
    row.zillow_rent_12mo_change_pct != null
      ? {
          key: 'zillow_change',
          label: '12-mo rent change',
          value: fmtPct(row.zillow_rent_12mo_change_pct) ?? '',
          hint: 'Zillow ZORI'
        }
      : null,
    row.hud_fmr_1br != null
      ? {
          key: 'hud_1br',
          label: 'HUD 1BR FMR',
          value: fmtEnrichmentUsd(row.hud_fmr_1br) ?? '',
          hint: 'Planning estimate'
        }
      : null,
    row.hud_fmr_2br != null
      ? {
          key: 'hud_2br',
          label: 'HUD 2BR FMR',
          value: fmtEnrichmentUsd(row.hud_fmr_2br) ?? '',
          hint: 'Planning estimate'
        }
      : null,
    row.bls_median_wage != null
      ? {
          key: 'bls_median',
          label: 'Median wage',
          value: fmtEnrichmentUsd(row.bls_median_wage) ?? '',
          hint: row.bls_year ? `BLS ${row.bls_year}` : 'BLS OEWS'
        }
      : null,
    row.bls_mean_wage != null
      ? {
          key: 'bls_mean',
          label: 'Mean wage',
          value: fmtEnrichmentUsd(row.bls_mean_wage) ?? '',
          hint: row.bls_year ? `BLS ${row.bls_year}` : 'BLS OEWS'
        }
      : null,
    row.bls_employment != null
      ? {
          key: 'bls_employment',
          label: 'Metro employment',
          value: fmtEnrichmentCount(row.bls_employment) ?? '',
          hint: 'All occupations'
        }
      : null
  ];

  return cards.filter((item): item is CityMetricCard => item != null && Boolean(item.value));
}

export function CityRentMetroContext({
  context,
  className = '',
  compact = false,
  showSourceFooter = true
}: CityRentMetroContextProps) {
  if (!context) return null;

  const cards = cityCards(context);
  if (!cards.length) return null;

  const locationLine = [
    `${context.city}, ${context.state_code}`,
    context.metro_name ? context.metro_name : null
  ]
    .filter(Boolean)
    .join(' | ');

  const notes = [context.rent_context, context.wage_context].filter(
    (note): note is string => Boolean(note?.trim())
  );

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-3.5 ${className}`.trim()}
    >
      <h3 className="text-sm font-semibold text-gray-900">
        City rent and wage context
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        Public rent and wage estimates can help compare cost of attendance and
        relocation planning.
      </p>
      <p className="mt-2 text-xs font-medium text-gray-500">{locationLine}</p>
      <div
        className={`mt-3 grid gap-2.5 ${
          compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {cards.slice(0, compact ? 4 : 7).map((card) => (
          <CompareExternalEnrichmentStatCard
            key={card.key}
            label={card.label}
            value={card.value}
            hint={card.hint ?? undefined}
          />
        ))}
      </div>
      {notes.length ? (
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-600">
          {notes.slice(0, compact ? 1 : 2).map((note) => (
            <li key={note} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {showSourceFooter ? (
        <DataSourceFooter variant="city" className="mt-3" />
      ) : null}
    </div>
  );
}
