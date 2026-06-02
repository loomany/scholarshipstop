import type { InstitutionResearchEnrichment } from '@/lib/external-data';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import {
  getPublicDataVizCopy,
  type PublicDataVizCopy
} from '@/lib/i18n/publicDataVizCopy';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import { fmtEnrichmentCount } from '@/components/compare/compareExternalEnrichmentFormat';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';

type InstitutionResearchContextProps = {
  research: InstitutionResearchEnrichment | null;
  className?: string;
  compact?: boolean;
  showSourceFooter?: boolean;
  locale?: LocalizedUiLocale;
};

function researchCards(
  row: InstitutionResearchEnrichment,
  copy: PublicDataVizCopy
) {
  return [
    row.works_count != null
      ? {
          key: 'works',
          label: copy.labels.works_count,
          value: fmtEnrichmentCount(row.works_count)
        }
      : null,
    row.cited_by_count != null
      ? {
          key: 'citations',
          label: copy.labels.citation_count,
          value: fmtEnrichmentCount(row.cited_by_count)
        }
      : null,
    row.nih_project_count != null
      ? {
          key: 'nih_projects',
          label: copy.labels.nih_projects,
          value: fmtEnrichmentCount(row.nih_project_count)
        }
      : null,
    row.nih_total_funding_band
      ? {
          key: 'nih_funding',
          label: copy.labels.nih_funding_band,
          value: row.nih_total_funding_band
        }
      : null,
    row.nih_latest_year
      ? {
          key: 'nih_year',
          label: copy.labels.latest_nih_year,
          value: String(row.nih_latest_year)
        }
      : null,
    row.ror_id
      ? {
          key: 'ror',
          label: copy.labels.ror_identity,
          value: row.ror_id.replace('https://ror.org/', '')
        }
      : null,
    row.openalex_id
      ? {
          key: 'openalex',
          label: copy.labels.openalex_identity,
          value: row.openalex_id.replace('https://openalex.org/', '')
        }
      : null
  ].filter(
    (item): item is { key: string; label: string; value: string } =>
      item != null && String(item.value ?? '').trim().length > 0
  );
}

export function InstitutionResearchContext({
  research,
  className = '',
  compact = false,
  showSourceFooter = true,
  locale = 'en'
}: InstitutionResearchContextProps) {
  if (!research) return null;

  const copy = getPublicDataVizCopy(locale);
  const cards = researchCards(research, copy);
  if (!cards.length) return null;

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-3.5 ${className}`.trim()}
    >
      <h3 className="text-sm font-semibold text-gray-900">
        {copy.researchInstitutionContext}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        {copy.researchActivityBody}
      </p>
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
          />
        ))}
      </div>
      {research.research_summary ? (
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          {research.research_summary}
        </p>
      ) : null}
      {showSourceFooter ? (
        <DataSourceFooter variant="research" locale={locale} className="mt-3" />
      ) : null}
    </div>
  );
}
