import {
  resolveScholarshipStateContext,
  type ScholarshipStateContext
} from '@/lib/external-data/scholarshipPageEnrichment';
import { fmtEnrichmentRatePer100k } from '@/components/compare/compareExternalEnrichmentFormat';
import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';

type ScholarshipStateExternalContextSidebarProps = {
  stateSlug: string;
};

function publicSafetyFootnote(context: ScholarshipStateContext): string | null {
  const rate = fmtEnrichmentRatePer100k(
    context.stateRow.public_safety_context?.value
  );
  if (!rate) return null;
  return `Reported violent crime rate (state aggregate): ${rate}. Public reference context only — not a safety rating.`;
}

export function ScholarshipStateExternalContextSidebar({
  stateSlug
}: ScholarshipStateExternalContextSidebarProps) {
  const context = resolveScholarshipStateContext(stateSlug);
  if (!context) return null;

  const safetyNote = publicSafetyFootnote(context);

  return (
    <aside
      className="mt-6 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6"
      aria-labelledby="scholarship-state-context-heading"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Planning context
      </p>
      <h2
        id="scholarship-state-context-heading"
        className="mt-1 text-lg font-bold text-gray-900"
      >
        Cost of living in {context.stateName}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Public reference data for planning context. Cost and wage estimates vary
        by city and household.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        {context.highlights.map((item) => (
          <CompareExternalEnrichmentStatCard
            key={item.key}
            label={item.label}
            value={item.value}
          />
        ))}
      </div>
      {safetyNote ? (
        <p className="mt-4 text-xs leading-relaxed text-gray-500">{safetyNote}</p>
      ) : null}
      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Data: Census ACS, HUD FMR, MIT Living Wage, and BLS where available.
        Reference only — not ScholarshipTop eligibility rules.
      </p>
    </aside>
  );
}
