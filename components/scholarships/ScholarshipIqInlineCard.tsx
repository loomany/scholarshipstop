import Link from 'next/link';
import { ArrowRight, BrainCircuit } from 'lucide-react';

export default function ScholarshipIqInlineCard() {
  return (
    <Link
      href="/iq/assessment?intent=scholarship_match"
      className="group relative block overflow-hidden rounded-xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] text-left shadow-[0_18px_45px_-28px_rgba(234,88,12,0.65)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-30px_rgba(234,88,12,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2"
      aria-label="Start IQ test"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
        aria-hidden
      />
      <div
        className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#FF7A1A]/18 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-24 h-24 w-24 rounded-full bg-sky-300/20 blur-2xl"
        aria-hidden
      />

      <div className="relative grid min-w-0 grid-cols-1 content-start gap-x-4 gap-y-3 px-4 py-4 pl-5 sm:px-5 sm:py-4 sm:pl-6 xl:grid-cols-[minmax(0,1fr)_140px_170px] xl:items-center">
        <div className="min-w-0 text-left">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FFB875] bg-white/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3.5 w-3.5 text-[#F97316]" aria-hidden />
              Featured Tool
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              IQ assessment
            </span>
          </div>
          <h3 className="text-balance text-lg font-semibold leading-snug tracking-tight text-slate-950 sm:text-xl">
            Find scholarships that fit how you think
          </h3>
          <p className="mt-1.5 line-clamp-2 max-w-[430px] text-sm leading-5 text-slate-500">
            See whether your strengths point toward essays, research-heavy
            awards, fast applications, or logic-based opportunities.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Logic', 'Spatial', 'Speed'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/80 bg-white/75 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full min-w-0 rounded-2xl border border-white/80 bg-white/70 p-3 shadow-sm backdrop-blur xl:w-[140px] xl:shrink-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Preview
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="min-w-0 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-1.5">
              <p className="text-[10px] font-medium text-slate-500">IQ</p>
              <p className="mt-1 truncate text-base font-bold leading-none text-slate-950">
                --
              </p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-1.5">
              <p className="text-[10px] font-medium text-slate-500">Type</p>
              <p className="mt-1 truncate text-sm font-bold leading-none text-slate-950">
                ???
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 border-t border-orange-200/70 pt-3 xl:w-[170px] xl:shrink-0 xl:border-t-0 xl:pt-0">
          <p className="text-sm font-bold leading-snug text-slate-950">
            Scholarship strategy unlocked
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200">
            <div className="h-full w-0 rounded-full bg-slate-300" />
          </div>
          <span className="relative z-10 mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2 text-center text-xs font-bold text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.9)] transition group-hover:bg-slate-900">
            Start IQ test
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
