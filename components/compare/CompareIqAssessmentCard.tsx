import Link from 'next/link';
import { ArrowRight, BrainCircuit } from 'lucide-react';

type CompareIqAssessmentCardProps = {
  variant?: 'all' | 'universities' | 'states';
};

const copy = {
  all: {
    badge: 'IQ',
    title: 'Compare schools. Understand yourself first.',
    description:
      'See how your logic, speed, and pattern recognition shape the way you evaluate scholarship options.'
  },
  universities: {
    badge: 'College fit',
    title: 'Compare colleges through your strengths',
    description:
      'Use your Brain Archetype to understand how you evaluate schools, essays, and scholarship tradeoffs.'
  },
  states: {
    badge: 'Market fit',
    title: 'Find the market that fits your thinking style',
    description:
      'See how your logic, speed, and pattern recognition shape the way you compare scholarship climates.'
  }
} as const;

const intentByVariant = {
  all: 'college_fit',
  universities: 'college_fit',
  states: 'college_fit'
} as const;

export default function CompareIqAssessmentCard({
  variant = 'all'
}: CompareIqAssessmentCardProps) {
  const c = copy[variant];
  const href = `/iq/assessment?intent=${intentByVariant[variant]}`;

  return (
    <Link
      href={href}
      aria-label="Start IQ assessment"
      className="group relative block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.58)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-34px_rgba(234,88,12,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 lg:min-h-[13.25rem]"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
        aria-hidden
      />
      <div
        className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#FF7A1A]/16 blur-3xl"
        aria-hidden
      />
      <div className="relative flex h-full min-w-0 flex-col justify-between pl-1">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB875] bg-white/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3 w-3 text-[#F97316]" aria-hidden />
              Featured Tool
            </span>
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              {c.badge}
            </span>
          </div>
          <p className="text-xl font-semibold leading-snug tracking-tight text-slate-950">
            {c.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {c.description}
          </p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-orange-100 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Assessment
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 transition group-hover:text-[#B45309]">
            Start IQ test
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
