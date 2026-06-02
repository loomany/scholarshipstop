import {
  fmtEnrichmentCount,
  fmtEnrichmentPctFromFraction,
  fmtEnrichmentUsd
} from '@/components/compare/compareExternalEnrichmentFormat';

export type MetricBarRow = {
  key: string;
  label: string;
  leftValue: number | null;
  rightValue: number | null;
  leftCaption?: string;
  rightCaption?: string;
  hint?: string;
};

type MetricComparisonBarsProps = {
  metrics: MetricBarRow[];
  leftSeriesLabel: string;
  rightSeriesLabel: string;
  ariaLabel: string;
  className?: string;
  /** When true, format values as percentages (0–1 fractions). */
  fractionMetrics?: boolean;
  /** When true, format as plain counts instead of currency. */
  countMetrics?: boolean;
};

function formatBarValue(
  value: number,
  fractionMetrics: boolean,
  countMetrics: boolean
): string {
  if (fractionMetrics)
    return fmtEnrichmentPctFromFraction(value) ?? String(value);
  if (countMetrics) return fmtEnrichmentCount(value) ?? String(value);
  if (value >= 0 && value <= 1)
    return fmtEnrichmentPctFromFraction(value) ?? String(value);
  if (value < 200) return `${value.toFixed(2)}/hr`;
  return fmtEnrichmentUsd(value) ?? String(value);
}

function barWidth(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(8, Math.round((value / max) * 100));
}

export function MetricComparisonBars({
  metrics,
  leftSeriesLabel,
  rightSeriesLabel,
  ariaLabel,
  className = '',
  fractionMetrics = false,
  countMetrics = false
}: MetricComparisonBarsProps) {
  const rows = metrics.filter(
    (m) =>
      (m.leftValue != null && Number.isFinite(m.leftValue)) ||
      (m.rightValue != null && Number.isFinite(m.rightValue))
  );
  if (!rows.length) return null;

  return (
    <div
      className={`space-y-3 ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
    >
      {rows.map((metric) => {
        const left = metric.leftValue ?? 0;
        const right = metric.rightValue ?? 0;
        const max = Math.max(left, right, 0.0001);
        const leftLabel = metric.leftCaption ?? leftSeriesLabel;
        const rightLabel = metric.rightCaption ?? rightSeriesLabel;

        return (
          <div
            key={metric.key}
            className="rounded-xl border border-slate-200/85 bg-slate-50/75 p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-950">
                {metric.label}
              </p>
              {metric.hint ? (
                <span className="max-w-[45%] text-right text-[11px] leading-snug text-gray-500">
                  {metric.hint}
                </span>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {metric.leftValue != null ? (
                <div className="rounded-lg bg-white p-2.5 ring-1 ring-slate-200/70">
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-gray-600">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500"
                        aria-hidden
                      />
                      <span className="truncate">{leftLabel}</span>
                    </span>
                    <span className="rounded-md bg-orange-50 px-1.5 py-0.5 font-semibold tabular-nums text-orange-950 ring-1 ring-orange-100">
                      {formatBarValue(
                        metric.leftValue,
                        fractionMetrics,
                        countMetrics
                      )}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${barWidth(left, max)}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {metric.rightValue != null ? (
                <div className="rounded-lg bg-white p-2.5 ring-1 ring-slate-200/70">
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-gray-600">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-500"
                        aria-hidden
                      />
                      <span className="truncate">{rightLabel}</span>
                    </span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold tabular-nums text-slate-900 ring-1 ring-slate-200">
                      {formatBarValue(
                        metric.rightValue,
                        fractionMetrics,
                        countMetrics
                      )}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-500"
                      style={{ width: `${barWidth(right, max)}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
