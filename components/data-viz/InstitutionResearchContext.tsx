import type { InstitutionResearchEnrichment } from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import { fmtEnrichmentCount } from '@/components/compare/compareExternalEnrichmentFormat';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';

type InstitutionResearchContextProps = {
  research: InstitutionResearchEnrichment | null;
  className?: string;
  compact?: boolean;
  showSourceFooter?: boolean;
};

function researchCards(row: InstitutionResearchEnrichment) {
  return [
    row.works_count != null
      ? {
          key: 'works',
          label: 'Works count',
          value: fmtEnrichmentCount(row.works_count)
        }
      : null,
    row.cited_by_count != null
      ? {
          key: 'citations',
          label: 'Citation count',
          value: fmtEnrichmentCount(row.cited_by_count)
        }
      : null,
    row.nih_project_count != null
      ? {
          key: 'nih_projects',
          label: 'NIH projects',
          value: fmtEnrichmentCount(row.nih_project_count)
        }
      : null,
    row.nih_total_funding_band
      ? {
          key: 'nih_funding',
          label: 'NIH funding band',
          value: row.nih_total_funding_band
        }
      : null,
    row.nih_latest_year
      ? {
          key: 'nih_year',
          label: 'Latest NIH year',
          value: String(row.nih_latest_year)
        }
      : null,
    row.ror_id
      ? {
          key: 'ror',
          label: 'ROR identity',
          value: row.ror_id.replace('https://ror.org/', '')
        }
      : null,
    row.openalex_id
      ? {
          key: 'openalex',
          label: 'OpenAlex identity',
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
  showSourceFooter = true
}: InstitutionResearchContextProps) {
  if (!research) return null;

  const cards = researchCards(research);
  if (!cards.length) return null;

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-3.5 ${className}`.trim()}
    >
      <h3 className="text-sm font-semibold text-gray-900">
        Research and institution context
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        Public research indicators can help compare academic activity; they do not
        imply scholarship eligibility.
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
        <DataSourceFooter variant="research" className="mt-3" />
      ) : null}
    </div>
  );
}
