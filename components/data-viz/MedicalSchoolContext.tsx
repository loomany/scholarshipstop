import type { MedicalSchoolEnrichment } from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import { fmtEnrichmentCount } from '@/components/compare/compareExternalEnrichmentFormat';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';

type MedicalSchoolContextProps = {
  context: MedicalSchoolEnrichment | null;
  className?: string;
  compact?: boolean;
};

function hostFromUrl(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '');
  }
}

function medicalSchoolCards(row: MedicalSchoolEnrichment) {
  return [
    row.school_type && row.school_type !== 'unknown'
      ? {
          key: 'school_type',
          label: 'School type',
          value: row.school_type
        }
      : null,
    row.accreditor && row.accreditor !== 'unknown'
      ? {
          key: 'accreditor',
          label: 'Accreditor',
          value: row.accreditor
        }
      : null,
    row.accreditation_status
      ? {
          key: 'status',
          label: 'Status',
          value: row.accreditation_status
        }
      : null,
    row.city || row.state
      ? {
          key: 'location',
          label: 'Location',
          value: [row.city, row.state].filter(Boolean).join(', ')
        }
      : null,
    row.admit_applicant_count != null
      ? {
          key: 'applicants',
          label: 'Applicant volume',
          value: fmtEnrichmentCount(row.admit_applicant_count) ?? ''
        }
      : null,
    row.openalex_works_count != null
      ? {
          key: 'works',
          label: 'Works count',
          value: fmtEnrichmentCount(row.openalex_works_count) ?? ''
        }
      : null,
    row.nih_project_count != null
      ? {
          key: 'nih',
          label: 'NIH projects',
          value: fmtEnrichmentCount(row.nih_project_count) ?? ''
        }
      : null
  ].filter(
    (item): item is { key: string; label: string; value: string } =>
      item != null && item.value.trim().length > 0
  );
}

export function MedicalSchoolContext({
  context,
  className = '',
  compact = false
}: MedicalSchoolContextProps) {
  if (!context) return null;

  const cards = medicalSchoolCards(context);
  if (!cards.length) return null;

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-3.5 ${className}`.trim()}
    >
      <h3 className="text-sm font-semibold text-gray-900">
        Medical school context
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        Public medical-school identity and education context for planning. These
        indicators do not imply scholarship eligibility or admissions outcomes.
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

      {context.admit_acceptance_context || context.research_context || context.website ? (
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-600">
          {context.admit_acceptance_context ? (
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{context.admit_acceptance_context}</span>
            </li>
          ) : null}
          {context.research_context ? (
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{context.research_context}</span>
            </li>
          ) : null}
          {context.website ? (
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <a
                href={context.website}
                className="font-medium text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                {hostFromUrl(context.website)}
              </a>
            </li>
          ) : null}
        </ul>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        Data sources: WDOMS, LCME, COCA, AACOM, College Scorecard, OpenAlex,
        ROR, NIH RePORTER aggregate, and public admissions-summary data where
        strict matches are available.
      </p>
      <DataSourceFooter variant="mixed" className="mt-2" />
    </div>
  );
}
