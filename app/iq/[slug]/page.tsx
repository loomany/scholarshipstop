import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BrainCircuit, CheckCircle2, Sparkles } from 'lucide-react';

import IqProductFooter from '@/components/iq/IqProductFooter';

type IqSeoLanding = {
  slug: string;
  intent: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  proof: string;
};

type StrategyPreview = {
  pathLabel: string;
  archetype: string;
  profileLine: string;
  iqRange: string;
  topDomain: string;
  topStrengths: Array<[string, string]>;
  summary: string;
  grants: Array<{
    title: string;
    reason: string;
    amount: string;
    match: string;
  }>;
  reading: string[];
  essays: string[];
};

const IQ_SEO_BASE_URL = 'https://scholarshiptop.com/iq';

const iqSeoLandings: Record<string, IqSeoLanding> = {
  'scholarship-match': {
    slug: 'scholarship-match',
    intent: 'scholarship_match',
    eyebrow: 'Scholarship match IQ',
    title: 'Find scholarships that fit how your brain works.',
    description:
      'Take a short IQ-style assessment, then use your cognitive profile to understand which scholarship applications may fit your strengths.',
    bullets: [
      'Connect reasoning style to scholarship strategy',
      'Identify whether essays, research awards, or fast applications fit you',
      'Continue into matched grants after your IQ profile is ready'
    ],
    proof:
      'Built as an educational cognitive profile, not a clinical diagnosis or official IQ certificate.'
  },
  'provider-research': {
    slug: 'provider-research',
    intent: 'provider_research',
    eyebrow: 'Provider research path',
    title: 'Prioritize scholarship providers with a clearer strategy.',
    description:
      'Use an IQ-style cognitive profile to decide whether provider research, essay-heavy awards, fast applications, or logic-based opportunities deserve attention first.',
    bullets: [
      'See how reasoning and decision speed affect provider selection',
      'Turn cognitive strengths into a scholarship research plan',
      'Move from profile insight into matched grants when ready'
    ],
    proof:
      'Designed for students comparing scholarship providers, not for medical or clinical assessment.'
  },
  'college-fit': {
    slug: 'college-fit',
    intent: 'college_fit',
    eyebrow: 'College fit IQ',
    title: 'Compare colleges through the way you think.',
    description:
      'A short IQ-style assessment can help you understand how you compare schools, weigh tradeoffs, and approach scholarship decisions.',
    bullets: [
      'Understand your school-comparison style',
      'Use cognitive strengths to frame college and scholarship fit',
      'Continue into a strategy path after the assessment'
    ],
    proof:
      'The report explains patterns in reasoning, speed, verbal logic, spatial thinking, and numerical logic.'
  },
  'essay-prep': {
    slug: 'essay-prep',
    intent: 'essay_prep',
    eyebrow: 'Essay prep IQ',
    title: 'Discover the thinking pattern behind stronger scholarship essays.',
    description:
      'Use your cognitive profile to understand whether structure, logic, verbal reasoning, or pattern recognition may shape stronger scholarship essays.',
    bullets: [
      'Find the essay angle that fits your strengths',
      'Connect Brain Archetype insights to writing strategy',
      'Use the profile before choosing essay next steps'
    ],
    proof:
      'Educational IQ-style insights only. The assessment is not a replacement for licensed evaluation.'
  },
  'deadline-strategy': {
    slug: 'deadline-strategy',
    intent: 'deadline_strategy',
    eyebrow: 'Deadline strategy IQ',
    title: 'Build an application plan around your execution style.',
    description:
      'Understand how speed, prioritization, and reasoning under constraints can shape a smarter scholarship deadline strategy.',
    bullets: [
      'Separate quick wins from high-effort applications',
      'Use decision-speed signals to plan deadlines',
      'Turn your IQ-style profile into practical next steps'
    ],
    proof:
      'Timed questions are used to build an interpretive cognitive profile, not a clinical diagnosis.'
  }
};

const strategyPreviews: Record<string, StrategyPreview> = {
  'scholarship-match': {
    pathLabel: 'Scholarship match report',
    archetype: 'Pattern Strategist',
    profileLine: 'Built for students who want the fastest path from cognitive profile to matched awards.',
    iqRange: '114-122',
    topDomain: 'Abstract Reasoning',
    topStrengths: [
      ['Abstract Reasoning', '92%'],
      ['Decision Speed', '81%'],
      ['Verbal Reasoning', '76%']
    ],
    summary:
      'Your strongest signal points toward awards where pattern recognition, strong framing, and quick filtering matter. The report prioritizes grants that fit your profile first, then shows what to read and write next.',
    grants: [
      {
        title: 'Future Scholars Merit Award',
        reason: 'Strong fit for high-achieving students with clear academic direction.',
        amount: '$10.000',
        match: '94% match'
      },
      {
        title: 'Student Opportunity Grant',
        reason: 'Good profile fit for broad eligibility and fast application paths.',
        amount: '$5.000',
        match: '91% match'
      },
      {
        title: 'Leadership Essay Scholarship',
        reason: 'Best when your essay can connect reasoning style to impact.',
        amount: '$2.500',
        match: '89% match'
      },
      {
        title: 'Community Achievement Fund',
        reason: 'Matches students who can show focused goals and consistent progress.',
        amount: '$1.000',
        match: '87% match'
      }
    ],
    reading: ['How to compare scholarship fit fast', 'Scholarship deadlines explained'],
    essays: ['Build a stronger scholarship story', 'Turn strengths into essay angles']
  },
  'provider-research': {
    pathLabel: 'Provider research report',
    archetype: 'Quantitative Analyst / Spatial Architect',
    profileLine: 'Built for students comparing providers, foundations, sponsors, and award patterns.',
    iqRange: '110-118',
    topDomain: 'Numerical Logic',
    topStrengths: [
      ['Numerical Logic', '90%'],
      ['Spatial Intelligence', '84%'],
      ['Abstract Reasoning', '79%']
    ],
    summary:
      'Your profile fits a research-first provider strategy: compare sponsors by eligibility density, award size, repeatability, and deadline effort before you spend time writing. The report turns provider discovery into a ranked action plan.',
    grants: [
      {
        title: 'STEM Provider Research Award',
        reason: 'Strong fit for students who can compare eligibility and award history.',
        amount: '$7.500',
        match: '93% match'
      },
      {
        title: 'Foundation Opportunity Grant',
        reason: 'Worth prioritizing because provider criteria are broad and repeatable.',
        amount: '$4.000',
        match: '90% match'
      },
      {
        title: 'Regional Sponsor Scholarship',
        reason: 'Matches provider research paths with state and community filters.',
        amount: '$2.000',
        match: '88% match'
      },
      {
        title: 'Industry Partner Tuition Fund',
        reason: 'Good fit when provider mission overlaps with your study direction.',
        amount: '$3.500',
        match: '86% match'
      }
    ],
    reading: ['How to research scholarship providers', 'How to spot repeatable awards'],
    essays: ['Write to a provider mission', 'Turn provider research into an essay']
  },
  'college-fit': {
    pathLabel: 'College fit strategy report',
    archetype: 'Systems Planner',
    profileLine: 'Built for students comparing school fit, scholarship fit, and tradeoffs.',
    iqRange: '108-116',
    topDomain: 'Verbal Reasoning',
    topStrengths: [
      ['Verbal Reasoning', '88%'],
      ['Abstract Reasoning', '80%'],
      ['Decision Speed', '74%']
    ],
    summary:
      'Your profile suggests a fit-first strategy: compare schools by scholarship opportunity, support systems, and application effort instead of relying on brand names alone. The report turns college comparison into a practical shortlist.',
    grants: [
      {
        title: 'College Fit Merit Scholarship',
        reason: 'Strong fit for students aligning academic goals with school-specific awards.',
        amount: '$8.000',
        match: '92% match'
      },
      {
        title: 'Transfer Pathway Grant',
        reason: 'Useful when comparing schools by affordability and completion path.',
        amount: '$3.000',
        match: '89% match'
      },
      {
        title: 'Campus Leadership Award',
        reason: 'Good match when your profile supports clear communication and planning.',
        amount: '$2.500',
        match: '87% match'
      },
      {
        title: 'First-Year Student Success Fund',
        reason: 'Fits students building a practical school and scholarship plan.',
        amount: '$1.500',
        match: '85% match'
      }
    ],
    reading: ['How to compare colleges by scholarships', 'Build a college affordability shortlist'],
    essays: ['Explain why this school fits', 'Write a focused college-fit essay']
  },
  'essay-prep': {
    pathLabel: 'Essay prep report',
    archetype: 'Narrative Strategist',
    profileLine: 'Built for students turning cognitive strengths into stronger scholarship essays.',
    iqRange: '112-120',
    topDomain: 'Verbal Reasoning',
    topStrengths: [
      ['Verbal Reasoning', '91%'],
      ['Abstract Reasoning', '83%'],
      ['Numerical Logic', '71%']
    ],
    summary:
      'Your report points toward essay-heavy scholarships where structure, clarity, and original framing can outperform generic applications. It shows which story angle to lead with and which prompts deserve your time first.',
    grants: [
      {
        title: 'Personal Story Scholarship',
        reason: 'Strong match for students who can turn experience into a clear narrative.',
        amount: '$5.000',
        match: '94% match'
      },
      {
        title: 'Future Leaders Essay Award',
        reason: 'Good fit for structured essays with specific goals and reflection.',
        amount: '$2.500',
        match: '91% match'
      },
      {
        title: 'Community Voice Grant',
        reason: 'Best when your writing connects service, growth, and impact.',
        amount: '$1.500',
        match: '89% match'
      },
      {
        title: 'Creative Problem Solver Scholarship',
        reason: 'Matches applicants who can explain how they think through problems.',
        amount: '$3.000',
        match: '87% match'
      }
    ],
    reading: ['Scholarship essay examples that stand out', 'How to choose your strongest essay angle'],
    essays: ['Open essay improvement tools', 'Start a scholarship essay draft']
  },
  'deadline-strategy': {
    pathLabel: 'Deadline strategy report',
    archetype: 'Execution Planner',
    profileLine: 'Built for students who need to decide what to submit first, next, and never.',
    iqRange: '106-114',
    topDomain: 'Decision Speed',
    topStrengths: [
      ['Decision Speed', '89%'],
      ['Numerical Logic', '78%'],
      ['Abstract Reasoning', '73%']
    ],
    summary:
      'Your profile supports a deadline-first plan: split quick wins from high-effort essays, protect your best deadlines, and avoid spending hours on low-match awards. The report turns urgency into a clean application sequence.',
    grants: [
      {
        title: 'Fast Application Grant',
        reason: 'High priority because effort is low and eligibility is broad.',
        amount: '$1.000',
        match: '93% match'
      },
      {
        title: 'Monthly Student Award',
        reason: 'Good fit for recurring deadlines and quick submission cycles.',
        amount: '$2.000',
        match: '90% match'
      },
      {
        title: 'Priority Deadline Scholarship',
        reason: 'Worth scheduling early because match is high and deadline is fixed.',
        amount: '$4.000',
        match: '88% match'
      },
      {
        title: 'Short Essay Tuition Fund',
        reason: 'Matches students who can execute quickly without losing quality.',
        amount: '$1.500',
        match: '86% match'
      }
    ],
    reading: ['How to plan scholarship deadlines', 'Quick wins vs high-effort applications'],
    essays: ['Draft faster without sounding generic', 'Reuse essay ideas across deadlines']
  }
};

type IqSeoLandingPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return Object.keys(iqSeoLandings).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: IqSeoLandingPageProps): Metadata {
  const page = iqSeoLandings[params.slug];
  if (!page) {
    return {};
  }

  const url = `${IQ_SEO_BASE_URL}/${page.slug}`;
  return {
    title: `${page.title} | IQ Profile`,
    description: page.description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: 'website',
      siteName: 'IQ Profile',
      images: [
        {
          url: '/logo-preview.png',
          width: 1200,
          height: 630,
          alt: page.title
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: ['/logo-preview.png']
    }
  };
}

export default function IqSeoLandingPage({ params }: IqSeoLandingPageProps) {
  const page = iqSeoLandings[params.slug];
  if (!page) notFound();
  const preview = strategyPreviews[page.slug] ?? strategyPreviews['scholarship-match'];

  return (
    <main className="iq-product-shell min-h-screen overflow-hidden bg-[#f8fafc] text-slate-950">
      <section className="relative isolate bg-[radial-gradient(circle_at_12%_8%,#dbeafe_0,transparent_32%),radial-gradient(circle_at_86%_12%,#ffedd5_0,transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden />
              {page.eyebrow}
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl">
              {page.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              {page.description}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/iq/assessment?intent=${encodeURIComponent(page.intent)}`}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start IQ test
                <ArrowRight
                  className="h-5 w-5 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href="/iq"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-lg"
              >
                View general IQ report
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[3.5rem] bg-gradient-to-br from-indigo-200 via-sky-100 to-orange-100 blur-3xl" />
            <div className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_30px_100px_-52px_rgba(15,23,42,0.55)] sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <BrainCircuit className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                    SaaS IQ profile
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    What this path unlocks
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {page.bullets.map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700"
                  >
                    <CheckCircle2
                      className="mt-1 h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    {item}
                  </div>
                ))}
              </div>

              <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                {page.proof}
              </p>
            </div>
          </div>
        </div>
      </section>
      <StrategyReportPreview preview={preview} />
      <IqProductFooter />
    </main>
  );
}

function StrategyReportPreview({ preview }: { preview: StrategyPreview }) {
  return (
    <section className="border-y border-slate-200 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
              Final strategy preview
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              See the kind of matched plan your IQ path can unlock.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            After the test, the profile becomes a scholarship strategy report:
            matched grants, money context, ranked strengths, reading steps, and
            essay moves in one clean SaaS-style dashboard.
          </p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_90px_-45px_rgba(15,23,42,0.5)]">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700 ring-1 ring-orange-100">
                <Sparkles className="h-4 w-4" aria-hidden />
                {preview.pathLabel}
              </div>

              <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                Brain Archetype
              </p>
              <h3 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                {preview.archetype}
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {preview.profileLine}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <PreviewStat label="Estimated IQ range" value={preview.iqRange} />
                <PreviewStat label="Top cognitive domain" value={preview.topDomain} />
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">Top strengths</p>
                <div className="mt-4 space-y-3">
                  {preview.topStrengths.map(([label, value]) => (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
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

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Strategy summary
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {preview.summary}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                    Recommended grants
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    4 matches
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  {preview.grants.map((grant, index) => (
                    <div
                      key={grant.title}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                              {index + 1}
                            </span>
                            <p className="text-sm font-semibold leading-5 text-slate-950">
                              {grant.title}
                            </p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {grant.reason}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {grant.match}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {grant.amount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <PreviewList title="Recommended reading path" items={preview.reading} />
                  <PreviewList title="Improve essays" items={preview.essays} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <ReportDecisionAnalytics />
      </div>
    </section>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportDecisionAnalytics() {
  return (
    <div className="mt-6 grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.45)] lg:grid-cols-[1fr_0.92fr_1fr]">
      <div className="bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
            Strategy decision layer
          </p>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/15">
            Saved plan
          </span>
        </div>
        <blockquote className="mt-8 text-2xl font-semibold leading-tight tracking-tight text-slate-100">
          “Prioritize the awards where fit, effort, and payoff line up first.”
        </blockquote>
        <div className="mt-8 grid gap-3 text-sm">
          {[
            ['Match', 'Cognitive profile + eligibility + award size'],
            ['Plan', 'Grants first, then reading, then essay moves'],
            ['Action', 'Clear next click instead of a static score']
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
          Application sequence
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          The report turns insight into a weekly action path.
        </h3>
        <div className="mt-8 flex h-44 items-end gap-4 border-b border-slate-200">
          {[
            ['Picks', '88%'],
            ['Read', '54%'],
            ['Draft', '72%'],
            ['Submit', '96%']
          ].map(([label, height]) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-36 w-full items-end rounded-t-2xl bg-slate-100 px-1">
                <div
                  className="w-full rounded-t-xl bg-slate-950 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.8)]"
                  style={{ height }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-500">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600">
          Instead of dumping recommendations, the dashboard shows what should
          happen first and what supports the same scholarship path.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
          Output matrix
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Three product layers, one unlock.
        </h3>
        <div className="mt-8 space-y-4">
          {[
            ['Grant picks', '4'],
            ['Reading steps', '2'],
            ['Essay moves', '2'],
            ['Saved strategy', '1']
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-950">{label}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  unlocked section
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
  );
}
