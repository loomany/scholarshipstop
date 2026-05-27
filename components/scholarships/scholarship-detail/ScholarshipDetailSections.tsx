'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ScholarshipSeoFaqItem } from '@/app/scholarships/scholarshipsData';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import ai from './aiInsightsLocked.module.css';
import type {
  ScholarshipDeadlineUrgency,
  ScholarshipDifficulty,
  ScholarshipMissingDataFlag,
  ScholarshipSourceStatus
} from '@/lib/seo/scholarshipSeoQualityPolicy';
import {
  scholarshipDetailCardPrimaryClass,
  scholarshipDetailCardSupportClass
} from '@/lib/scholarships/scholarshipDetailLayoutClasses';
import type { ScholarshipDetailUiCopy } from '@/lib/i18n/scholarshipDetailUiCopy';

export function AiLowConfidenceNote({ copy }: { copy: ScholarshipDetailUiCopy }) {
  return (
    <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950">
      {copy.ai.lowConfidenceNote}
    </p>
  );
}

const badgeBase =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide';

export function HeroDecisionBadges({
  copy,
  matchBadge,
  urgencyBadge,
  difficultyBadge
}: {
  copy: ScholarshipDetailUiCopy;
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
          {copy.urgencyPrefix} {urgencyBadge.label}
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
  tone,
  renderLine
}: {
  title: string;
  items: string[];
  tone: 'teal' | 'violet' | 'sky' | 'amber';
  renderLine?: (text: string) => ReactNode;
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
          <li key={`${title}-${i}-${line.slice(0, 24)}`}>
            {renderLine ? renderLine(line) : line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScholarshipQuickDecisionGrid({
  copy,
  bestFor,
  highlights,
  whyApply,
  importantChecks,
  renderLine
}: {
  copy: ScholarshipDetailUiCopy;
  bestFor: string[];
  highlights: string[];
  whyApply: string[];
  importantChecks: string[];
  renderLine?: (text: string) => ReactNode;
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
        <h3 className={ai.title}>{copy.quickDecision.title}</h3>
        <span className={ai.badge}>
          <Sparkles className="h-3 w-3 shrink-0 text-zinc-600" aria-hidden />
          {copy.quickDecision.badge}
        </span>
      </div>

      <div className={ai.content}>
        <QuickCard
          title={copy.quickDecision.bestFor}
          items={bestFor}
          tone="teal"
          renderLine={renderLine}
        />
        <QuickCard
          title={copy.quickDecision.highlights}
          items={highlights}
          tone="violet"
          renderLine={renderLine}
        />
        <QuickCard
          title={copy.quickDecision.whyApply}
          items={whyApply}
          tone="sky"
          renderLine={renderLine}
        />
        <QuickCard
          title={copy.quickDecision.importantChecks}
          items={importantChecks}
          tone="amber"
          renderLine={renderLine}
        />
      </div>
    </div>
  );
}

export function ScholarshipTrustSignalsBlock({
  copy,
  sourceStatus,
  difficulty,
  urgency,
  missingDataFlags,
  lastReviewedLabel
}: {
  copy: ScholarshipDetailUiCopy;
  sourceStatus: ScholarshipSourceStatus;
  difficulty: ScholarshipDifficulty;
  urgency: ScholarshipDeadlineUrgency;
  missingDataFlags: ScholarshipMissingDataFlag[];
  lastReviewedLabel: string | null;
}) {
  const cards = [
    {
      label: copy.trust.officialSourceStatus,
      value: sourceStatus.label,
      body: sourceStatus.description
    },
    {
      label: copy.trust.reviewStatus,
      value: lastReviewedLabel ?? copy.trust.reviewValueMissing,
      body: lastReviewedLabel
        ? copy.trust.reviewBodyWhenPresent
        : copy.trust.reviewBodyWhenMissing
    },
    {
      label: copy.trust.deadlineUrgency,
      value: urgency.label,
      body: urgency.description
    },
    {
      label: copy.trust.applicationDifficulty,
      value: difficulty.level,
      body: difficulty.reason
    }
  ];

  return (
    <section
      className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-zinc-100/50 sm:p-6"
      aria-labelledby="scholarshiptop-trust-signals-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            {copy.trust.kicker}
          </p>
          <h2
            id="scholarshiptop-trust-signals-heading"
            className="mt-1 text-lg font-semibold tracking-tight text-zinc-900"
          >
            {copy.trust.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            {copy.trust.intro}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link
            href="/scholarship-verification-methodology"
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-zinc-700 transition hover:border-zinc-300 hover:bg-white"
          >
            {copy.trust.methodology}
          </Link>
          <Link
            href="/scholarships/hub/matches"
            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
          >
            {copy.trust.disclaimer}
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {card.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">
              {card.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-600">{card.body}</p>
          </div>
        ))}
      </div>

      {missingDataFlags.length > 0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/75 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            {copy.trust.missingDetails}
          </p>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-amber-950 sm:grid-cols-2">
            {missingDataFlags.slice(0, 6).map((flag) => (
              <li key={flag.key} className="flex gap-2">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"
                  aria-hidden
                />
                <span>
                  <span className="font-semibold">{flag.label}:</span>{' '}
                  {flag.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm leading-6 text-emerald-950">
          {copy.trust.completeListingNote}
        </p>
      )}
    </section>
  );
}

export function AiInsightSection({
  copy,
  title,
  subtitle,
  children
}: {
  copy: ScholarshipDetailUiCopy;
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
          {copy.ai.guidanceBadge}
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
  className = '',
  renderLine
}: {
  items: string[];
  className?: string;
  renderLine?: (text: string) => ReactNode;
}) {
  return (
    <ul
      className={`list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-800 ${className}`}
    >
      {items.map((item, i) => (
        <li key={`${i}-${item.slice(0, 40)}`}>
          {renderLine ? renderLine(item) : item}
        </li>
      ))}
    </ul>
  );
}

export function ScholarshipWhyApplyBlock({
  copy,
  items,
  renderLine
}: {
  copy: ScholarshipDetailUiCopy;
  items: string[];
  renderLine?: (text: string) => ReactNode;
}) {
  if (items.length === 0) return null;
  const show = items.slice(0, 5);
  return (
    <AiInsightSection
      copy={copy}
      title={copy.ai.whyApplyTitle}
      subtitle={copy.ai.whyApplySubtitle}
    >
      <BulletList items={show} renderLine={renderLine} />
    </AiInsightSection>
  );
}

export function ScholarshipApplicationTipsBlock({
  copy,
  items,
  renderLine
}: {
  copy: ScholarshipDetailUiCopy;
  items: string[];
  renderLine?: (text: string) => ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <AiInsightSection
      copy={copy}
      title={copy.ai.applicationTipsTitle}
      subtitle={copy.ai.applicationTipsSubtitle}
    >
      <BulletList items={items.slice(0, 3)} renderLine={renderLine} />
    </AiInsightSection>
  );
}

export function ScholarshipNextStepsBlock({
  copy,
  items,
  renderLine
}: {
  copy: ScholarshipDetailUiCopy;
  items: string[];
  renderLine?: (text: string) => ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <AiInsightSection
      copy={copy}
      title={copy.ai.nextStepsTitle}
      subtitle={copy.ai.nextStepsSubtitle}
    >
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-800">
        {items.map((item, i) => (
          <li key={`ns-${i}-${item.slice(0, 36)}`}>
            {renderLine ? renderLine(item) : item}
          </li>
        ))}
      </ol>
    </AiInsightSection>
  );
}

export function ScholarshipBeforeYouApplyBlock({
  copy,
  checks,
  detailsToConfirm,
  redFlags,
  renderLine
}: {
  copy: ScholarshipDetailUiCopy;
  checks: string[];
  detailsToConfirm: string[];
  redFlags: string[];
  renderLine?: (text: string) => ReactNode;
}) {
  const hasChecks = checks.length > 0;
  const hasDetailsToConfirm = detailsToConfirm.length > 0;
  const hasFlags = redFlags.length > 0;
  if (!hasChecks && !hasDetailsToConfirm && !hasFlags) return null;

  return (
    <AiInsightSection
      copy={copy}
      title={copy.ai.beforeApplyTitle}
      subtitle={copy.ai.beforeApplySubtitle}
    >
      <div className="space-y-6">
        {hasChecks ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {copy.ai.importantChecks}
            </p>
            <BulletList items={checks} renderLine={renderLine} />
          </div>
        ) : null}
        {hasDetailsToConfirm ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {copy.ai.detailsToConfirm}
            </p>
            <BulletList items={detailsToConfirm} renderLine={renderLine} />
          </div>
        ) : null}
        {hasFlags ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
              {copy.ai.redFlags}
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-rose-900">
              {redFlags.map((item, i) => (
                <li key={`rf-${i}-${item.slice(0, 32)}`}>
                  {renderLine ? renderLine(item) : item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AiInsightSection>
  );
}

export function ScholarshipSeoApplicationBlock({
  copy,
  text
}: {
  copy: ScholarshipDetailUiCopy;
  text: string;
}) {
  return (
    <div className="mt-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {copy.sections.applying}
      </h2>
      <div className={scholarshipDetailCardSupportClass}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
          {text}
        </p>
      </div>
    </div>
  );
}

export function ScholarshipFaqAccordion({
  copy,
  items
}: {
  copy: ScholarshipDetailUiCopy;
  items: ScholarshipSeoFaqItem[];
}) {
  if (items.length === 0) return null;

  return (
    <SiteFaqAccordion
      items={items}
      heading={copy.faqHeading}
      as="div"
      headingId="scholarship-useful-faq-heading"
      headingClassName="mb-3 text-lg font-semibold tracking-tight text-zinc-900"
      headingToAccordionClassName="mt-0"
      idPrefix="scholarship-faq"
      accordionClassName="shadow-sm ring-1 ring-zinc-100/50"
    />
  );
}
