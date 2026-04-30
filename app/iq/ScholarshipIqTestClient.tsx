'use client';

import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  Globe2,
  Layers3,
  LineChart,
  Lock,
  Network,
  ShieldCheck,
  Sparkles,
  Timer,
  AlertTriangle,
  Users,
  Zap
} from 'lucide-react';

import IqProductFooter from '@/components/iq/IqProductFooter';

type ScholarshipIqTestClientProps = {
  onStartAssessment: () => void;
};

const proofPoints = [
  {
    value: '30',
    label: 'focused items',
    detail: 'short enough to finish, structured enough to reveal a pattern'
  },
  {
    value: '5',
    label: 'cognitive domains',
    detail: 'reasoning, spatial, verbal, numerical, and decision speed'
  },
  {
    value: '1',
    label: 'personal profile',
    detail: 'an IQ-style result plus a cognitive archetype explanation'
  }
];

const domains = [
  {
    title: 'Abstract reasoning',
    description:
      'Pattern discovery, rule induction, and visual matrix-style thinking.',
    icon: Network
  },
  {
    title: 'Numerical logic',
    description:
      'Series, proportions, and symbolic relationships without heavy school math.',
    icon: LineChart
  },
  {
    title: 'Spatial intelligence',
    description:
      'Mental rotation, visual structure, and shape-based problem solving.',
    icon: Layers3
  },
  {
    title: 'Verbal reasoning',
    description:
      'Analogies, deductive logic, and conceptual relationships in language.',
    icon: FileText
  },
  {
    title: 'Decision speed',
    description:
      'Timed prioritization and how efficiently you choose under constraints.',
    icon: Gauge
  }
];

const reportFeatures = [
  'Estimated IQ-style score band with plain-language interpretation',
  'Percentile-style context based on your performance pattern',
  'Five-domain cognitive profile instead of a single flat number',
  'Brain Archetype label based on relative strengths',
  'Question-by-question reasoning review in the full report',
  'Clear caveats on what the test does and does not claim'
];

const trustStandards = [
  {
    title: 'Inspired, not falsely certified',
    text: 'The page references established psychometric traditions without claiming to be WAIS, Raven, ICAR, or a clinical diagnostic instrument.',
    icon: ShieldCheck
  },
  {
    title: 'Mobile-first timing',
    text: 'Different item types use different time budgets because spatial and complex reasoning tasks often need more time than quick symbolic tasks.',
    icon: Timer
  },
  {
    title: 'Transparent limitations',
    text: 'Archetypes are interpretive profiles. Percentiles and IQ-style bands depend on reference samples and should be read as guidance, not diagnosis.',
    icon: AlertTriangle
  }
];

export default function ScholarshipIqTestClient({
  onStartAssessment
}: ScholarshipIqTestClientProps) {
  return (
    <main className="iq-product-shell min-h-screen overflow-hidden bg-[#f8fafc] text-slate-950">
      <section className="relative isolate bg-[radial-gradient(circle_at_12%_8%,#dbeafe_0,transparent_32%),radial-gradient(circle_at_86%_12%,#e0e7ff_0,transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-12 text-center sm:pb-24 sm:pt-18 lg:px-8">
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden />
              Online IQ-style cognitive assessment
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              A smarter IQ test for people who want to understand their mind.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Take a short, timed cognitive assessment inspired by modern online
              psychometrics and classic reasoning traditions. See your IQ-style
              score band, percentile context, five-domain profile, and Brain
              Archetype in one clean report.
            </p>

            <div className="mt-9 flex justify-center">
              <button
                type="button"
                onClick={onStartAssessment}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start assessment
                <ArrowRight
                  className="h-5 w-5 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-slate-400" aria-hidden />
                Timed, mobile-friendly
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden />
                Transparent claims
              </span>
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400" aria-hidden />
                Private by design
              </span>
            </div>
          </div>

        </div>

        <div className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
          <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
            {proofPoints.map((point) => (
              <div key={point.label} className="rounded-3xl bg-slate-50 p-5">
                <p className="text-4xl font-semibold tracking-tight text-slate-950">
                  {point.value}
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {point.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {point.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="science"
        className="border-y border-slate-200 bg-slate-950 py-16 text-white sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="relative">
              <div className="absolute -inset-8 rounded-[3rem] bg-indigo-500/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/25 backdrop-blur sm:p-5">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.65)] sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
                    Full report unlocked
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                    Your IQ-style cognitive profile
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
                    A clear report with your score context, domain profile, Brain
                    Archetype, and plain-English interpretation.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      ['IQ-style score', '118'],
                      ['Percentile context', 'Top 9%'],
                      ['Brain Archetype', 'Pattern Strategist']
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-xs font-semibold text-slate-500">
                          {label}
                        </p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">
                      Domain breakdown
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        ['Abstract Reasoning', '92%'],
                        ['Spatial Intelligence', '84%'],
                        ['Numerical Logic', '76%'],
                        ['Verbal Reasoning', '68%'],
                        ['Decision Speed', '61%']
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span>{label}</span>
                            <span>{value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white ring-1 ring-slate-200">
                            <div
                              className="h-full rounded-full bg-slate-950"
                              style={{ width: value }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-950">
                        How to read this
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Accuracy, difficulty, and timing become a profile you can
                        understand in minutes.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-950">
                        Your strongest signal
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        The report highlights the domain that best explains your
                        problem-solving style.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-indigo-100 ring-1 ring-white/15">
                <FileText className="h-4 w-4" aria-hidden />
                Report preview
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                See the full report before it ever reaches your inbox.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                This is the exact kind of outcome users unlock after the test: a
                premium, readable IQ-style profile that turns raw answers into a
                score band, percentile context, cognitive domains, and a clear
                explanation of how their mind attacks hard problems.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  'A real report layout with score, percentile, archetype, and ranked domains',
                  'Plain-English interpretation instead of a cold number with no context',
                  'Private email access link so the result feels saved, personal, and premium'
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-semibold leading-6 text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pt-16 sm:pt-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.45)] lg:grid-cols-[1fr_0.92fr_1fr]">
            <div className="bg-slate-950 p-6 text-white sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
                  Executive IQ analysis
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/15">
                  Elite band
                </span>
              </div>
              <blockquote className="mt-8 text-2xl font-semibold leading-tight tracking-tight text-slate-100">
                “Strong pattern discovery with fast rule compression under
                timed pressure.”
              </blockquote>
              <div className="mt-8 grid gap-3 text-sm">
                {[
                  ['Signal', 'Abstract reasoning and spatial mapping'],
                  ['Risk', 'Speed dips on verbal-heavy items'],
                  ['Next move', 'Use structured prompts and focused review']
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[5rem_1fr] gap-3">
                    <span className="font-bold uppercase tracking-[0.16em] text-emerald-300">
                      {label}
                    </span>
                    <span className="leading-6 text-slate-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-y border-slate-200 bg-white p-6 sm:p-8 lg:border-x lg:border-y-0">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Domain pacing
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Accuracy and speed become a readable pattern.
              </h3>
              <div className="mt-8 flex h-44 items-end gap-4 border-b border-slate-200">
                {[
                  ['AR', '58%'],
                  ['NL', '72%'],
                  ['SI', '91%'],
                  ['VR', '76%'],
                  ['DS', '63%']
                ].map(([label, height]) => (
                  <div key={label} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-36 w-full items-end rounded-t-2xl bg-slate-100 px-1">
                      <div
                        className="w-full rounded-t-xl bg-slate-950 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.8)]"
                        style={{ height }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                The final report translates raw answers into score context,
                strongest domains, and the areas where timing changed the profile.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Cognitive sync matrix
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Five signals, one clear profile.
              </h3>
              <div className="mt-8 space-y-4">
                {[
                  ['Pattern strategy', '96%'],
                  ['Spatial mapping', '91%'],
                  ['Numerical logic', '88%'],
                  ['Verbal clarity', '74%']
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {label}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        report signal
                      </p>
                    </div>
                    <span className="text-2xl font-semibold tracking-tight text-slate-950">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
                What it measures
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                One number gets attention. The profile explains it.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              The assessment is built around multiple cognitive task families,
              so the result can show whether your strength is visual reasoning,
              verbal logic, speed, symbolic patterning, or a mix of all five.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {domains.map((domain) => {
              const Icon = domain.icon;
              return (
                <article
                  key={domain.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">
                    {domain.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {domain.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
              <Zap className="h-4 w-4" aria-hidden />
              Result experience
            </p>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Built for curiosity first, then clarity.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Most people arrive because they are curious about IQ. The product
              keeps that curiosity, then turns the result into a structured
              explanation of how they solve problems.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {reportFeatures.map((feature) => (
                <div
                  key={feature}
                  className="flex gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                >
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                  <p className="text-sm font-medium leading-6 text-slate-700">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Trust by design
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Premium does not mean exaggerated.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              The strongest version of this product is confident and honest:
              it can be fascinating, useful, and beautifully presented without
              claiming to replace a licensed psychological assessment.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {trustStandards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm ring-1 ring-slate-200">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative isolate bg-slate-950 px-6 py-16 text-white sm:py-20 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.32),transparent_38%)]" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Globe2 className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Take the test. See the pattern behind your score.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Start with a focused assessment, then unlock a report that explains
            your cognitive profile in a way that feels clear, modern, and useful.
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={onStartAssessment}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Start the IQ test
              <ArrowRight
                className="h-5 w-5 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-400">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden />
              Made for curious adults and students
            </span>
            <span className="inline-flex items-center gap-2">
              <BrainCircuit className="h-4 w-4" aria-hidden />
              Five-domain cognitive profile
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Clear scientific caveats
            </span>
          </div>
        </div>
      </section>
      <IqProductFooter />
    </main>
  );
}

