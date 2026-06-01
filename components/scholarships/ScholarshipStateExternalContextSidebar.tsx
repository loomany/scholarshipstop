import {
  getStateSocialContext,
  resolveScholarshipStateContext,
  type ScholarshipStateContext
} from '@/lib/external-data';
import { statePlanningPairMetrics } from '@/lib/external-data';
import { fmtEnrichmentRatePer100k } from '@/components/compare/compareExternalEnrichmentFormat';
import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';
import { InsightCallout } from '@/components/data-viz/InsightCallout';
import { MetricComparisonBars } from '@/components/data-viz/MetricComparisonBars';
import { StateSocialContextBlock } from '@/components/data-viz/StateSocialContextBlock';
import { InternalLinkCluster } from '@/components/internal-links/InternalLinkCluster';

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
  const pairMetrics = statePlanningPairMetrics(context.stateRow);
  const currentPath = `/scholarships/${encodeURIComponent(stateSlug)}`;
  const social = getStateSocialContext(context.stateCode);

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
        Scholarship value can feel different depending on rent, wages, and cost
        of attendance in the state. Use this planning context alongside award
        amount, eligibility rules, school costs, and application deadlines.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        The figures below are state-level estimates. Actual costs vary by city,
        campus, and household.
      </p>

      <InsightCallout
        title="Why this matters for scholarship planning"
        body={`When comparing awards in ${context.stateName}, look at income, rent, and wage context together — not the award amount alone. A smaller scholarship in a lower-cost area may cover more of your expenses than a larger award elsewhere.`}
        className="mt-4"
      />

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        {context.highlights.map((item) => (
          <CompareExternalEnrichmentStatCard
            key={item.key}
            label={item.label}
            value={item.value}
          />
        ))}
      </div>

      {pairMetrics.length ? (
        <div className="mt-5 rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4">
          <h3 className="text-sm font-semibold text-gray-900">Quick comparisons</h3>
          <MetricComparisonBars
            className="mt-3"
            ariaLabel={`Planning comparisons for ${context.stateName}`}
            leftSeriesLabel={context.stateName}
            rightSeriesLabel={context.stateName}
            metrics={pairMetrics.map((metric) => ({
              key: metric.key,
              label: metric.label,
              leftValue: metric.leftValue,
              rightValue: metric.rightValue,
              leftCaption: metric.leftLabel,
              rightCaption: metric.rightLabel,
              hint: metric.hint
            }))}
          />
        </div>
      ) : null}

      {safetyNote ? (
        <p className="mt-4 text-xs leading-relaxed text-gray-500">{safetyNote}</p>
      ) : null}

      <StateSocialContextBlock context={social} compact className="mt-5" showSourceFooter={false} />

      <InternalLinkCluster
        pageType="scholarship-state"
        stateSlug={stateSlug}
        stateCode={context.stateCode}
        stateName={context.stateName}
        excludeHref={currentPath}
      />

      <DataSourceFooter
        variant="state"
        showPublicSafetyNote={Boolean(safetyNote)}
        className="mt-4"
      />
    </aside>
  );
}
