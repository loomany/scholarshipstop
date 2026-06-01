import type { ResolvedContentEnrichmentContext } from '@/lib/external-data';
import {
  getInstitutionResearchBySchool,
  getRentMetroContextForSchool,
  getStateSocialContext,
  getTopStateAffordabilityHighlights,
  resolveContentEnrichmentLinkCluster,
  stateDisplayName
} from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  fmtEnrichmentPctFromFraction,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';
import { CityRentMetroContext } from '@/components/data-viz/CityRentMetroContext';
import { InstitutionResearchContext } from '@/components/data-viz/InstitutionResearchContext';
import { StateSocialContextBlock } from '@/components/data-viz/StateSocialContextBlock';
import { RelatedScholarshipContextLinks } from '@/components/content-hub/RelatedScholarshipContextLinks';

type ExternalReferenceContextCardProps = {
  heading: string;
  intro: string;
  context: ResolvedContentEnrichmentContext;
  contentType: 'resource' | 'essay';
};

export function ExternalReferenceContextCard({
  heading,
  intro,
  context,
  contentType
}: ExternalReferenceContextCardProps) {
  const stateHighlights = getTopStateAffordabilityHighlights(context.stateRow);
  const school = context.schoolRow;
  const stateSocial = context.stateCode
    ? getStateSocialContext(context.stateCode)
    : null;
  const research = school
    ? getInstitutionResearchBySchool({
        name: school.school_name,
        state: school.state,
        unitId: school.unit_id,
        rorId: school.ror_id,
        openAlexId: school.openalex_id
      })
    : null;
  const cityRent = school
    ? getRentMetroContextForSchool({ city: school.city, state: school.state })
    : context.cityRow
      ? getRentMetroContextForSchool({
          city: context.cityRow.city,
          state: context.cityRow.state
        })
      : null;

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

  const cluster = resolveContentEnrichmentLinkCluster(context, contentType);

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
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Use these figures to compare scholarship amounts with typical living costs
            in {stateDisplayName(context.stateCode)} — not as essay filler on its own.
          </p>
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
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            College Scorecard reference only — verify current tuition and aid on the
            institution site before citing numbers in your application.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
            {visibleSchool.map((item) => (
              <CompareExternalEnrichmentStatCard
                key={item.key}
                label={item.label}
                value={item.value!}
              />
            ))}
          </div>
          <InstitutionResearchContext research={research} compact className="mt-4" />
          <CityRentMetroContext context={cityRent} compact className="mt-4" />
        </div>
      ) : null}

      {!visibleSchool.length && cityRent ? (
        <CityRentMetroContext
          context={cityRent}
          compact
          className={hasState ? 'mt-5' : 'mt-4'}
        />
      ) : null}

      {stateSocial ? (
        <StateSocialContextBlock
          context={stateSocial}
          compact
          className={hasState || visibleSchool.length ? 'mt-5' : 'mt-4'}
        />
      ) : null}

      {cluster ? (
        <RelatedScholarshipContextLinks cluster={cluster} context={context} />
      ) : null}

      <DataSourceFooter variant="mixed" className="mt-4" />
    </aside>
  );
}
