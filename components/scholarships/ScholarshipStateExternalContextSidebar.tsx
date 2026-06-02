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
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import {
  getPublicDataVizCopy,
  type PublicDataVizCopy
} from '@/lib/i18n/publicDataVizCopy';

type ScholarshipStateExternalContextSidebarProps = {
  stateSlug: string;
  locale?: LocalizedUiLocale;
};

function publicSafetyFootnote(
  context: ScholarshipStateContext,
  copy: PublicDataVizCopy
): string | null {
  const rate = fmtEnrichmentRatePer100k(
    context.stateRow.public_safety_context?.value
  );
  if (!rate) return null;
  return copy.stateSafetyNote(rate);
}

export function ScholarshipStateExternalContextSidebar({
  stateSlug,
  locale = 'en'
}: ScholarshipStateExternalContextSidebarProps) {
  const context = resolveScholarshipStateContext(stateSlug);
  if (!context) return null;

  const copy = getPublicDataVizCopy(locale);
  const safetyNote = publicSafetyFootnote(context, copy);
  const pairMetrics = statePlanningPairMetrics(context.stateRow).map(
    (metric) => ({
      ...metric,
      label:
        metric.key === 'income_rent'
          ? copy.labels.monthly_income_vs_rent
          : metric.key === 'wage_compare'
            ? copy.labels.living_wage_vs_bls
            : metric.label,
      leftLabel:
        metric.key === 'income_rent'
          ? copy.labels.income_est_monthly
          : metric.key === 'wage_compare'
            ? copy.labels.living_wage_annual_est
            : metric.leftLabel,
      rightLabel:
        metric.key === 'income_rent'
          ? copy.labels.hud_2br_fmr
          : metric.key === 'wage_compare'
            ? copy.labels.bls_median_wage
            : metric.rightLabel
    })
  );
  const currentPath = `/scholarships/${encodeURIComponent(stateSlug)}`;
  const social = getStateSocialContext(context.stateCode);
  const localizedHighlights = context.highlights.map((item) => ({
    ...item,
    label:
      item.key === 'income'
        ? copy.labels.median_household_income
        : item.key === 'fmr2'
          ? copy.labels.fair_market_rent_2br
          : item.key === 'living_wage'
            ? copy.labels.living_wage
            : item.key === 'bls'
              ? copy.labels.bls_median_wage
              : item.label
  }));

  return (
    <aside
      className="mt-6 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6"
      aria-labelledby="scholarship-state-context-heading"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {copy.planningContext}
      </p>
      <h2
        id="scholarship-state-context-heading"
        className="mt-1 text-lg font-bold text-gray-900"
      >
        Cost of living in {context.stateName}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {copy.stateAffordabilityBody}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {copy.dataAvailability}
      </p>

      <InsightCallout
        title={copy.costLivingWages}
        body={copy.stateAffordabilityBody}
        className="mt-4"
      />

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        {localizedHighlights.map((item) => (
          <CompareExternalEnrichmentStatCard
            key={item.key}
            label={item.label}
            value={item.value}
          />
        ))}
      </div>

      {pairMetrics.length ? (
        <div className="mt-5 rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {copy.visualComparison}
          </h3>
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
        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          {safetyNote}
        </p>
      ) : null}

      <StateSocialContextBlock
        context={social}
        compact
        locale={locale}
        className="mt-5"
        showSourceFooter={false}
      />

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
        locale={locale}
        className="mt-4"
      />
    </aside>
  );
}
