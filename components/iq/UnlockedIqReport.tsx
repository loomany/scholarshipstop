import IqProductFooter from '@/components/iq/IqProductFooter';
import type { AssessmentResult } from '@/lib/iqAssessmentTypes';

export default function UnlockedIqReport({
  result,
  onRestart,
  localPreview = false
}: {
  result: AssessmentResult;
  onRestart?: () => void;
  localPreview?: boolean;
}) {
  const topDomains = [...result.domainScores].sort((a, b) => b.score - a.score);

  return (
    <main className="iq-product-shell min-h-screen bg-[#f8fafc] text-slate-950">
      <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.45)] sm:p-8 lg:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
            {localPreview ? 'Local preview unlocked' : 'Full report unlocked'}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Your IQ-style cognitive profile
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            This educational report summarizes your timed assessment result,
            domain profile, and Brain Archetype. It is not a clinical diagnosis
            or licensed psychological assessment.
          </p>
          {localPreview || onRestart ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {localPreview ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  Visible only on localhost. Production stays locked.
                </span>
              ) : null}
              {onRestart ? (
                <button
                  type="button"
                  onClick={onRestart}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
                >
                  Start again
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <ReportStat label="IQ-style score" value={String(result.iqScore)} />
            <ReportStat
              label="Percentile context"
              value={`Top ${Math.max(1, 100 - result.percentile)}%`}
            />
            <ReportStat label="Brain Archetype" value={result.archetype} />
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Domain breakdown
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
              title="How to read this"
              text="Your score combines accuracy, item difficulty, and timing across the assessment. The domain chart is often more useful than the single number because it shows how your reasoning style is distributed."
            />
            <InsightCard
              title="Your strongest signal"
              text={`${topDomains[0]?.label ?? 'Your top domain'} appears as your strongest relative area in this run. Use that as a practical clue about how you naturally approach new problems.`}
            />
          </div>
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
