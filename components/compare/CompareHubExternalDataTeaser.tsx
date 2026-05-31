import {
  getSchoolEnrichmentCoverageStats,
  getStateAffordabilityCoverageStats
} from '@/lib/external-data';

type CompareHubExternalDataTeaserProps = {
  variant: 'universities' | 'states';
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export function CompareHubExternalDataTeaser({
  variant
}: CompareHubExternalDataTeaserProps) {
  if (variant === 'universities') {
    const stats = getSchoolEnrichmentCoverageStats();
    return (
      <aside
        className="mt-6 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5"
        aria-label="Public college reference data coverage"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Reference data
        </p>
        <h2 className="mt-1 text-base font-semibold text-gray-900 sm:text-lg">
          Compare colleges with tuition, admissions, outcomes, and earnings context
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Published comparisons can include College Scorecard facts matched by school
          name and state — separate from ScholarshipTop catalog totals.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatPill label="Schools enriched" value={stats.totalSchools.toLocaleString('en-US')} />
          <StatPill
            label="Tuition data"
            value={stats.withTuitionInState.toLocaleString('en-US')}
          />
          <StatPill
            label="Earnings data"
            value={stats.withMedianEarnings.toLocaleString('en-US')}
          />
          <StatPill
            label="Research signal"
            value={stats.withResearchSignal.toLocaleString('en-US')}
          />
        </div>
      </aside>
    );
  }

  const stats = getStateAffordabilityCoverageStats();
  return (
    <aside
      className="mt-6 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5"
      aria-label="Public state affordability reference data coverage"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Reference data
      </p>
      <h2 className="mt-1 text-base font-semibold text-gray-900 sm:text-lg">
        Compare states by affordability, wages, rent, and public reference data
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        State comparison pages can include Census, HUD, MIT Living Wage, and BLS context
        alongside scholarship climate summaries.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatPill label="States covered" value={String(stats.statesCovered)} />
        <StatPill label="Rent data" value={String(stats.withRentData)} />
        <StatPill label="Living wage" value={String(stats.withLivingWage)} />
        <StatPill label="Public context" value={String(stats.withPublicSafetyContext)} />
      </div>
    </aside>
  );
}
