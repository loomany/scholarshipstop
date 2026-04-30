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
  Target,
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
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-12 sm:pb-24 sm:pt-18 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden />
              Online IQ-style cognitive assessment
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              A smarter IQ test for people who want to understand their mind.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Take a short, timed cognitive assessment inspired by modern online
              psychometrics and classic reasoning traditions. See your IQ-style
              score band, percentile context, five-domain profile, and Brain
              Archetype in one clean report.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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
              <a
                href="#science"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-lg"
              >
                View scientific basis
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
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

          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[3.5rem] bg-gradient-to-br from-indigo-200 via-sky-100 to-emerald-100 blur-3xl" />
            <div className="rounded-[2.35rem] border border-white/80 bg-white/85 p-3 shadow-2xl shadow-slate-950/15 backdrop-blur">
              <div className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-slate-950 text-white">
                <div className="border-b border-white/10 bg-white/5 px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        Cognitive report preview
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold">
                        Pattern Strategist
                      </h2>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                      <BrainCircuit className="h-7 w-7" aria-hidden />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="rounded-3xl bg-white p-5 text-slate-950">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">
                          Estimated IQ-style band
                        </p>
                        <p className="mt-2 text-6xl font-semibold tracking-[-0.06em]">
                          118
                        </p>
                      </div>
                      <div className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                        Example result
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {[
                        ['Abstract reasoning', '92%'],
                        ['Spatial intelligence', '84%'],
                        ['Decision speed', '78%']
                      ].map(([label, width]) => (
                        <div key={label}>
                          <div className="flex justify-between text-sm font-medium text-slate-600">
                            <span>{label}</span>
                            <span>{width}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-slate-950"
                              style={{ width }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniPanel
                      icon={Target}
                      title="Your strongest pattern"
                      text="High rule discovery with strong spatial support."
                    />
                    <MiniPanel
                      icon={FileText}
                      title="Full report"
                      text="Score context, domain chart, and explanations."
                    />
                  </div>
                </div>
              </div>
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

      <section
        id="science"
        className="border-y border-slate-200 bg-slate-950 py-16 text-white sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="relative">
              <div className="absolute -inset-8 rounded-[3rem] bg-indigo-500/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur">
                <div className="rounded-[1.75rem] border border-white/10 bg-white text-slate-950">
                  <div className="border-b border-slate-200 px-6 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                      Final IQ report
                    </p>
                    <div className="mt-3 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-3xl font-semibold tracking-tight">
                          Pattern Strategist
                        </h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Five-domain cognitive profile
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
                        <p className="text-xs font-semibold text-slate-300">
                          IQ-style band
                        </p>
                        <p className="text-3xl font-semibold leading-none">118</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-6 sm:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                      <p className="text-sm font-bold text-slate-950">
                        Strength profile
                      </p>
                      <div className="mt-5 space-y-4">
                        {[
                          ['Abstract reasoning', '92%'],
                          ['Spatial intelligence', '84%'],
                          ['Decision speed', '78%']
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
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

                    <div className="space-y-3">
                      {[
                        'Plain-English score interpretation',
                        'Brain Archetype explanation',
                        'Domain ranking and strongest area',
                        'Personal strengths summary'
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden
                          />
                          {item}
                        </div>
                      ))}
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
                A polished final report, not just a score.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                After the assessment, your answers become a clean IQ-style report
                with score context, a five-domain breakdown, Brain Archetype, and
                a practical explanation of how you solve problems.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  'See the exact cognitive pattern behind your score band',
                  'Understand your strongest domain and where speed affects performance',
                  'Get a private report link delivered to your email after unlock'
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
          <p className="mx-auto mt-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-indigo-100 ring-1 ring-white/15">
            Full report unlock: $9.99 one-time payment
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

function MiniPanel({
  icon: Icon,
  title,
  text
}: {
  icon: typeof Target;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
      <Icon className="h-5 w-5 text-indigo-200" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-300">{text}</p>
    </div>
  );
}
