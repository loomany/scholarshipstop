import type { ResolvedContentEnrichmentContext } from '@/lib/external-data';
import {
  getTopStateAffordabilityHighlights,
  stateDisplayName
} from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  fmtEnrichmentPctFromFraction,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';
import { RelatedContextLinks } from '@/components/data-viz/RelatedContextLinks';
import { stateSlugFromCode } from '@/lib/seo/stateCompareSlug';

type ExternalReferenceContextCardProps = {
  heading: string;
  intro: string;
  context: ResolvedContentEnrichmentContext;
  /** When set, adds state-specific scholarship and compare links. */
  stateSlugHint?: string | null;
};

export function ExternalReferenceContextCard({
  heading,
  intro,
  context,
  stateSlugHint = null
}: ExternalReferenceContextCardProps) {
  const stateHighlights = getTopStateAffordabilityHighlights(context.stateRow);
  const school = context.schoolRow;

  const schoolCards =
    school ?
      [
        school.tuition_in_state != null ?
          {
            key: 'tuition',
            label: 'In-state tuition',
            value: fmtEnrichmentUsd(school.tuition_in_state)
          }
        : null,
        school.median_earnings != null ?
          {
            key: 'earnings',
            label: 'Median earnings',
            value: fmtEnrichmentUsd(school.median_earnings)
          }
        : null,
        school.admission_rate != null ?
          {
            key: 'admission',
            label: 'Admission rate',
            value: fmtEnrichmentPctFromFraction(school.admission_rate)
          }
        : null
      ].filter((item): item is { key: string; label: string; value: string | null } => item != null)
    : [];

  const visibleSchool = schoolCards.filter((c) => c.value != null);
  const hasState = stateHighlights.length > 0;
  if (!hasState && !visibleSchool.length) return null;

  const stateSlug =
    stateSlugHint ??
    (context.stateCode ? stateSlugFromCode(context.stateCode) : null);

  const relatedLinks =
    stateSlug ?
      [
        {
          href: `/scholarships/${encodeURIComponent(stateSlug)}`,
          label: `${stateDisplayName(context.stateCode!)} scholarships`
        },
        {
          href: `/compare/states`,
          label: 'Compare states'
        },
        {
          href: '/resources/how-to-find-scholarships',
          label: 'How to find scholarships'
        }
      ]
    : [];

  return (
    <aside
      className="mt-8 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6"
      aria-label={heading}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Planning context
      </p>
      <h2 className="mt-1 text-lg font-bold text-gray-900">{heading}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{intro}</p>

      {hasState && context.stateCode ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {stateDisplayName(context.stateCode)} affordability
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
            {stateHighlights.map((item) => (
              <CompareExternalEnrichmentStatCard
                key={item.key}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </div>
      ) : null}

      {visibleSchool.length && school ? (
        <div className={hasState ? 'mt-5' : 'mt-4'}>
          <h3 className="text-sm font-semibold text-gray-900">{school.school_name}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
            {visibleSchool.map((item) => (
              <CompareExternalEnrichmentStatCard
                key={item.key}
                label={item.label}
                value={item.value!}
              />
            ))}
          </div>
        </div>
      ) : null}

      {relatedLinks.length ? (
        <RelatedContextLinks title="Related scholarship planning" links={relatedLinks} />
      ) : null}

      <DataSourceFooter variant="mixed" className="mt-4" />
    </aside>
  );
}
