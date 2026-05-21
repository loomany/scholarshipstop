import IqProductFooter from '@/components/iq/IqProductFooter';
import type { IqLocale } from '@/lib/iq/i18n/iqLocales';
import {
  getIqReportCopy,
  resolveIqReportLocale
} from '@/lib/iq/i18n/iqReportCopy';
import type { AssessmentResult } from '@/lib/iqAssessmentTypes';

function formatReportDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export default function UnlockedIqReport({
  result,
  email,
  onRestart,
  localPreview = false,
  locale: localeProp
}: {
  result: AssessmentResult;
  email?: string | null;
  onRestart?: () => void;
  localPreview?: boolean;
  locale?: IqLocale;
}) {
  const locale = localeProp ?? resolveIqReportLocale(result);
  const copy = getIqReportCopy(locale);
  const topDomains = [...result.domainScores].sort((a, b) => b.score - a.score);
  const normalizedEmail = email?.trim() || null;
  const totalDuration =
    typeof result.totalDurationSeconds === 'number' &&
    Number.isFinite(result.totalDurationSeconds)
      ? Math.max(0, Math.round(result.totalDurationSeconds))
      : null;
  const topPercent = Math.max(1, 100 - result.percentile);

  return (
    <main className="iq-product-shell min-h-screen bg-[#f8fafc] text-slate-950">
      <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.45)] sm:p-8 lg:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
            {localPreview ? copy.localPreviewBadge : copy.unlockedBadge}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            {copy.disclaimer}
          </p>
          {localPreview || onRestart ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {localPreview ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  {copy.localhostNotice}
                </span>
              ) : null}
              {onRestart ? (
                <button
                  type="button"
                  onClick={onRestart}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
                >
                  {copy.startAgain}
                </button>
              ) : null}
              {totalDuration !== null ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold tabular-nums text-slate-700">
                  {copy.totalTime(formatReportDuration(totalDuration))}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <ReportStat label={copy.stats.iqStyleScore} value={String(result.iqScore)} />
            <ReportStat
              label={copy.stats.percentileContext}
              value={copy.stats.topPercent(topPercent)}
            />
            <ReportStat label={copy.stats.brainArchetype} value={result.archetype} />
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {copy.domainBreakdown}
            </h2>
            <div className="mt-5 grid gap-4">
              {topDomains.map((domain) => (
                <div key={domain.domain}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
                    <span>{domain.label}</span>
                    <span>{domain.score}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-950"
                      style={{ width: `${domain.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <InsightCard
              title={copy.insights.howToReadTitle}
              text={copy.insights.howToReadText}
            />
            <InsightCard
              title={copy.insights.strongestTitle}
              text={copy.insights.strongestText(
                topDomains[0]?.label ?? copy.stats.brainArchetype
              )}
            />
          </div>

          {normalizedEmail ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">{copy.reportEmail}</p>
              <p className="mt-2 break-all text-base font-semibold text-slate-950">
                {normalizedEmail}
              </p>
            </div>
          ) : null}
        </div>
      </section>
      <IqProductFooter />
    </main>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function InsightCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
