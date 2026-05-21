'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import type { ProviderHubRow } from '@/lib/providers/providerHubTypes';
import type { ProvidersHubGridIqCopy } from '@/lib/i18n/hubUiCopy';

import { ProvidersHubCard } from './ProvidersHubCard';

type Props = {
  rows: ProviderHubRow[];
  gridIq?: ProvidersHubGridIqCopy;
  iqHref?: string;
};

function ProvidersGridIqAssessmentCard({
  iq,
  href
}: {
  iq: ProvidersHubGridIqCopy;
  href: string;
}) {
  return (
    <li className="h-full">
      <Link
        href={href}
        aria-label={iq.startIqAria}
        className="group relative flex h-full min-h-[17rem] flex-col overflow-hidden rounded-2xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-6 text-left shadow-[0_12px_40px_-18px_rgba(234,88,12,0.58)] ring-1 ring-[#FFE2C2] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:p-8"
      >
        <div
          className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
          aria-hidden
        />
        <div
          className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[#FF7A1A]/16 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute bottom-0 right-10 h-24 w-24 rounded-full bg-sky-300/20 blur-2xl"
          aria-hidden
        />

        <article className="relative flex min-h-0 flex-1 flex-col pl-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB875] bg-white/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3 w-3 text-[#F97316]" aria-hidden />
              {iq.featuredTool}
            </span>
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              {iq.badge}
            </span>
          </div>
          <h2 className="text-xl font-bold leading-snug tracking-tight text-slate-950 sm:text-2xl">
            {iq.title}
          </h2>
          <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            {iq.body}
          </p>
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-orange-100 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {iq.assessmentLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 transition group-hover:text-[#B45309]">
              {iq.startIqTest}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </article>
      </Link>
    </li>
  );
}

const DEFAULT_GRID_IQ: ProvidersHubGridIqCopy = {
  featuredTool: 'Featured Tool',
  badge: 'Provider fit',
  title: 'Not sure which providers to prioritize?',
  body: 'Take a cognitive assessment and use your logic, speed, and pattern strengths to plan a smarter scholarship search.',
  assessmentLabel: 'IQ assessment',
  startIqTest: 'Start IQ test',
  startIqAria: 'Start IQ assessment'
};

export function ProvidersHubCardsGrid({
  rows,
  gridIq = DEFAULT_GRID_IQ,
  iqHref = '/iq/assessment?intent=provider_research'
}: Props) {
  return (
    <ul className="mt-10 grid list-none grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((row, index) => (
        <Fragment key={row.slug}>
          <ProvidersHubCard row={row} />
          {index === 2 ? (
            <ProvidersGridIqAssessmentCard iq={gridIq} href={iqHref} />
          ) : null}
        </Fragment>
      ))}
    </ul>
  );
}
