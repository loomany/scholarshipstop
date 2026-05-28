import Link from 'next/link';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import type { HubSpecificIqPromoCopy } from '@/lib/i18n/hubIqPromoByHub';
import type { HubIqPromoUiCopy } from '@/lib/i18n/hubUiCopy';
import { isIqSitePromoVisible } from '@/lib/iq/iqSitePromoVisibility';

type HubIqPromoAssessmentCardProps = {
  href: string;
  iq: HubIqPromoUiCopy | HubSpecificIqPromoCopy;
  className?: string;
};

export function HubIqPromoAssessmentCard({
  href,
  iq,
  className = 'group relative block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.58)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-34px_rgba(234,88,12,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 lg:min-h-[13.25rem]'
}: HubIqPromoAssessmentCardProps) {
  if (!isIqSitePromoVisible()) return null;

  const title =
    'title' in iq && iq.title ? iq.title : iq.buildSmarterStrategy;
  const body =
    'body' in iq && iq.body ? iq.body : iq.buildSmarterStrategyBody;
  const aria =
    'intentAria' in iq && iq.intentAria ? iq.intentAria : iq.startIqAria;

  return (
    <Link href={href} aria-label={aria} className={className}>
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
              {iq.featuredTool}
            </span>
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              {iq.iqBadge}
            </span>
          </div>
          <p className="text-xl font-semibold leading-snug tracking-tight text-slate-950">
            {title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-orange-100 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {iq.assessment}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 transition group-hover:text-[#B45309]">
            {iq.startIqTest}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
