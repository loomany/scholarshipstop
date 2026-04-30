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

const IQ_SEO_BASE_URL = 'https://iq.scholarshiptop.com';

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
      <IqProductFooter />
    </main>
  );
}
