import {
  hasScholarshipUniversitySidebarContent,
  resolveScholarshipUniversityContext
} from '@/lib/external-data/scholarshipPageEnrichment';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import {
  fmtEnrichmentCount,
  fmtEnrichmentPctFromFraction,
  fmtEnrichmentRatePer100k,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';

type ScholarshipUniversityExternalContextSidebarProps = {
  stateSlug: string;
  universityDisplayName: string;
};

export function ScholarshipUniversityExternalContextSidebar({
  stateSlug,
  universityDisplayName
}: ScholarshipUniversityExternalContextSidebarProps) {
  const context = resolveScholarshipUniversityContext({
    stateSlugOrCode: stateSlug,
    universityDisplayName
  });
  if (!hasScholarshipUniversitySidebarContent(context)) return null;

  const school = context.schoolRow;
  const state = context.stateContext;

  const schoolCards =
    school ?
      [
        school.city && school.state ?
          { key: 'location', label: 'Location', value: `${school.city}, ${school.state}` }
        : null,
        school.tuition_in_state != null ?
          {
            key: 'tuition_in',
            label: 'In-state tuition',
            value: fmtEnrichmentUsd(school.tuition_in_state)
          }
        : null,
        school.tuition_out_of_state != null ?
          {
            key: 'tuition_out',
            label: 'Out-of-state tuition',
            value: fmtEnrichmentUsd(school.tuition_out_of_state)
          }
        : null,
        school.avg_net_price != null ?
          {
            key: 'net_price',
            label: 'Avg net price',
            value: fmtEnrichmentUsd(school.avg_net_price)
          }
        : null,
        school.admission_rate != null ?
          {
            key: 'admission',
            label: 'Admission rate',
            value: fmtEnrichmentPctFromFraction(school.admission_rate)
          }
        : null,
        school.completion_rate != null ?
          {
            key: 'completion',
            label: 'Completion rate',
            value: fmtEnrichmentPctFromFraction(school.completion_rate)
          }
        : null,
        school.median_earnings != null ?
          {
            key: 'earnings',
            label: 'Median earnings',
            value: fmtEnrichmentUsd(school.median_earnings)
          }
        : null,
        school.student_size != null ?
          {
            key: 'size',
            label: 'Enrollment',
            value: fmtEnrichmentCount(school.student_size)
          }
        : null
      ].filter(
        (item): item is { key: string; label: string; value: string | null } => item != null
      )
    : [];

  const visibleSchool = schoolCards.filter((c) => c.value != null);
  const safetyRate = state ?
    fmtEnrichmentRatePer100k(state.stateRow.public_safety_context?.value)
  : null;

  return (
    <aside
      className="mt-6 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6"
      aria-label="College cost and affordability context"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Public reference data
      </p>

      {visibleSchool.length && school ? (
        <div>
          <h2 className="mt-1 text-lg font-bold text-gray-900">
            {school.school_name} — college cost context
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Matched from College Scorecard by school name and state. Hidden when
            the match is ambiguous.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {visibleSchool.map((card) => (
              <CompareExternalEnrichmentStatCard
                key={card.key}
                label={card.label}
                value={card.value!}
              />
            ))}
          </div>
        </div>
      ) : null}

      {state ? (
        <div className={visibleSchool.length ? 'mt-6 border-t border-slate-200/80 pt-5' : ''}>
          <h3 className="text-base font-semibold text-gray-900">
            {state.stateName} affordability
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            State-level cost and wage context for planning. Estimates vary by city
            and household.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
            {state.highlights.map((item) => (
              <CompareExternalEnrichmentStatCard
                key={item.key}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
          {safetyRate ? (
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              Reported violent crime rate (state aggregate): {safetyRate}. Public
              reference context only — not a safety rating.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Data: College Scorecard, Census ACS, HUD FMR, MIT Living Wage, and BLS where
        available. Not a ScholarshipTop verification of linked scholarships.
      </p>
    </aside>
  );
}
