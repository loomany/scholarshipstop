'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { ScholarshipSeoFaqItem } from '@/app/scholarships/scholarshipsData';
import ai from './aiInsightsLocked.module.css';
import {
  scholarshipDetailCardPrimaryClass,
  scholarshipDetailCardSupportClass
} from '@/lib/scholarships/scholarshipDetailLayoutClasses';

export function AiLowConfidenceNote() {
  return (
    <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950">
      AI summary is based on limited listing data. Double-check every detail on
      the official source before you apply.
    </p>
  );
}

const badgeBase =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide';

export function HeroDecisionBadges({
  matchBadge,
  urgencyBadge,
  difficultyBadge
}: {
  matchBadge: { label: string; title?: string } | null;
  urgencyBadge: { label: string; variant: 'slate' | 'sky' | 'amber' | 'rose' } | null;
  difficultyBadge: { label: string } | null;
}) {
  const urgencyClass =
    urgencyBadge?.variant === 'rose'
      ? 'bg-rose-100 text-rose-900'
      : urgencyBadge?.variant === 'amber'
        ? 'bg-amber-100 text-amber-950'
        : urgencyBadge?.variant === 'sky'
          ? 'bg-sky-100 text-sky-950'
          : 'bg-slate-100 text-slate-800';

  if (!matchBadge && !urgencyBadge && !difficultyBadge) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {matchBadge ? (
        <span
          className={`${badgeBase} bg-orange-50 text-orange-950 ring-1 ring-orange-200/70`}
          title={matchBadge.title}
        >
          {matchBadge.label}
        </span>
      ) : null}
      {urgencyBadge ? (
        <span className={`${badgeBase} ${urgencyClass}`}>
          Urgency: {urgencyBadge.label}
        </span>
      ) : null}
      {difficultyBadge ? (
        <span className={`${badgeBase} bg-zinc-100 text-zinc-800`}>
          {difficultyBadge.label}
        </span>
      ) : null}
    </div>
  );
}

function QuickCard({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone: 'teal' | 'violet' | 'sky' | 'amber';
}) {
  if (items.length === 0) return null;
  const ring =
    tone === 'teal'
      ? 'border-zinc-200/90 bg-white'
      : tone === 'violet'
        ? 'border-zinc-200/90 bg-zinc-50/60'
        : tone === 'sky'
          ? 'border-zinc-200/90 bg-white'
          : 'border-orange-100/80 bg-orange-50/25';

  return (
    <div className={`rounded-xl border p-4 shadow-sm ring-1 ring-zinc-100/40 ${ring}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-snug text-zinc-800">
        {items.map((line, i) => (
          <li key={`${title}-${i}-${line.slice(0, 24)}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function ScholarshipQuickDecisionGrid({
  bestFor,
  highlights,
  whyApply,
  importantChecks
}: {
  bestFor: string[];
  highlights: string[];
  whyApply: string[];
  importantChecks: string[];
}) {
  const any =
    bestFor.length ||
    highlights.length ||
    whyApply.length ||
    importantChecks.length;
  if (!any) return null;

  return (
    <div className={`mt-10 ${ai.card}`}>
      <div className={ai.header}>
        <h3 className={ai.title}>Quick decision</h3>
        <span className={ai.badge}>
          <Sparkles className="h-3 w-3 shrink-0 text-zinc-600" aria-hidden />
          AI insights
        </span>
      </div>

      <div className={ai.content}>
        <QuickCard title="Best for" items={bestFor} tone="teal" />
        <QuickCard title="Key highlights" items={highlights} tone="violet" />
        <QuickCard title="Why apply" items={whyApply} tone="sky" />
        <QuickCard
          title="Important checks"
          items={importantChecks}
          tone="amber"
        />
      </div>
    </div>
  );
}

export function AiInsightSection({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-950 ring-1 ring-orange-200/60">
          <Sparkles className="h-3 w-3" aria-hidden />
          AI guidance
        </span>
      </div>
      {subtitle ? (
        <p className="mb-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          {subtitle}
        </p>
      ) : null}
      <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 shadow-sm ring-1 ring-zinc-100/50 sm:p-6">
        {children}
      </div>
    </div>
  );
}

export function BulletList({
  items,
  className = ''
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul
      className={`list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-800 ${className}`}
    >
      {items.map((item, i) => (
        <li key={`${i}-${item.slice(0, 40)}`}>{item}</li>
      ))}
    </ul>
  );
}

export function ScholarshipWhyApplyBlock({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const show = items.slice(0, 5);
  return (
    <AiInsightSection
      title="Why this may be worth applying to"
      subtitle="Student-friendly angle based on the listing — not official rules."
    >
      <BulletList items={show} />
    </AiInsightSection>
  );
}

export function ScholarshipApplicationTipsBlock({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <AiInsightSection
      title="Application tips"
      subtitle="Listing-specific ideas from our AI layer — not official rules. Skip anything that does not match the program page."
    >
      <BulletList items={items.slice(0, 3)} />
    </AiInsightSection>
  );
}

export function ScholarshipNextStepsBlock({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <AiInsightSection
      title="Next steps"
      subtitle="A short checklist so you know what to do after reading the listing."
    >
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-800">
        {items.map((item, i) => (
          <li key={`ns-${i}-${item.slice(0, 36)}`}>{item}</li>
        ))}
      </ol>
    </AiInsightSection>
  );
}

export function ScholarshipBeforeYouApplyBlock({
  checks,
  missing,
  redFlags
}: {
  checks: string[];
  missing: string[];
  redFlags: string[];
}) {
  const hasChecks = checks.length > 0;
  const hasMissing = missing.length > 0;
  const hasFlags = redFlags.length > 0;
  if (!hasChecks && !hasMissing && !hasFlags) return null;

  return (
    <AiInsightSection
      title="Before you apply"
      subtitle="Things to double-check on the official page."
    >
      <div className="space-y-6">
        {hasChecks ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Important checks
            </p>
            <BulletList items={checks} />
          </div>
        ) : null}
        {hasMissing ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Missing or unclear on the listing
            </p>
            <BulletList items={missing} />
          </div>
        ) : null}
        {hasFlags ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
              Red flags
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-rose-900">
              {redFlags.map((item, i) => (
                <li key={`rf-${i}-${item.slice(0, 32)}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AiInsightSection>
  );
}

export function ScholarshipSeoApplicationBlock({ text }: { text: string }) {
  return (
    <div className="mt-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Applying
      </h2>
      <div className={scholarshipDetailCardSupportClass}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
          {text}
        </p>
      </div>
    </div>
  );
}

export function ScholarshipFaqAccordion({ items }: { items: ScholarshipSeoFaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-zinc-900">
        FAQ
      </h2>
      <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100/50">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={`faq-${i}-${item.question.slice(0, 20)}`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
                aria-expanded={isOpen}
              >
                <span className="min-w-0 flex-1">{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <div className="border-t border-zinc-100 px-4 pb-4 pt-2 text-sm leading-relaxed text-zinc-600">
                  {item.answer}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
