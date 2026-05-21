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
import { useIqLocale } from '@/components/iq/IqLocaleProvider';
import { getIqLandingCopy } from '@/lib/iq/i18n/iqLandingCopy';

type ScholarshipIqTestClientProps = {
  onStartAssessment: () => void;
};

const DOMAIN_ICONS = [Network, LineChart, Layers3, FileText, Gauge] as const;
const TRUST_ICONS = [ShieldCheck, Timer, AlertTriangle] as const;

export default function ScholarshipIqTestClient({
  onStartAssessment
}: ScholarshipIqTestClientProps) {
  const { locale } = useIqLocale();
  const copy = getIqLandingCopy(locale);

  return (
    <main className="iq-product-shell min-h-screen overflow-hidden bg-[#f8fafc] text-slate-950">
      <section className="relative isolate bg-[radial-gradient(circle_at_12%_8%,#dbeafe_0,transparent_32%),radial-gradient(circle_at_86%_12%,#e0e7ff_0,transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-12 text-center sm:pb-24 sm:pt-18 lg:px-8">
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden />
              {copy.hero.badge}
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              {copy.hero.title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              {copy.hero.subtitle}
            </p>

            <div className="mt-9 flex justify-center">
              <button
                type="button"
                onClick={onStartAssessment}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                {copy.hero.cta}
                <ArrowRight
                  className="h-5 w-5 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-500">
              {copy.hero.trustChips.map((chip) => (
                <span key={chip} className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-400" aria-hidden />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
          <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
            {copy.proofPoints.map((point) => (
              <div key={point.label} className="rounded-3xl bg-slate-50 p-5">
                <p className="text-4xl font-semibold tracking-tight text-slate-950">
                  {point.value}
                </p>
                <p className="mt-1 font-semibold text-slate-800">{point.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{point.detail}</p>
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
                    {copy.reportPreview.badge}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                    {copy.reportPreview.title}
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
                    {copy.reportPreview.subtitle}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {copy.reportPreview.statLabels.map((label, index) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-xs font-semibold text-slate-500">{label}</p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                          {copy.reportPreview.sampleStats[index]}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">
                      {copy.reportPreview.domainBreakdown}
                    </p>
                    <div className="mt-4 space-y-3">
                      {copy.reportPreview.sampleDomains.map(([label, value]) => (
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
                    {copy.reportPreview.insightTitles.map((title, index) => (
                      <div
                        key={title}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-slate-950">{title}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {copy.reportPreview.insightBodies[index]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-indigo-100 ring-1 ring-white/15">
                <FileText className="h-4 w-4" aria-hidden />
                {copy.reportPreview.sectionBadge}
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                {copy.reportPreview.sectionTitle}
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                {copy.reportPreview.sectionBody}
              </p>
              <div className="mt-8 grid gap-3">
                {copy.reportPreview.sectionBullets.map((item) => (
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
                  {copy.executive.badge}
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/15">
                  {copy.executive.eliteBand}
                </span>
              </div>
              <blockquote className="mt-8 text-2xl font-semibold leading-tight tracking-tight text-slate-100">
                {copy.executive.quote}
              </blockquote>
              <div className="mt-8 grid gap-3 text-sm">
                {copy.executive.rows.map(([label, value]) => (
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
                {copy.executive.domainPacingTitle}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {copy.executive.domainPacingHeading}
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
                    <span className="text-xs font-semibold text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                {copy.executive.domainPacingBody}
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                {copy.executive.matrixTitle}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {copy.executive.matrixHeading}
              </h3>
              <div className="mt-8 space-y-4">
                {copy.executive.matrixSignals.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{label}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {copy.executive.reportSignal}
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
                {copy.domainsSection.eyebrow}
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                {copy.domainsSection.title}
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              {copy.domainsSection.body}
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {copy.domainsSection.domains.map((domain, index) => {
              const Icon = DOMAIN_ICONS[index]!;
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
              {copy.resultExperience.badge}
            </p>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {copy.resultExperience.title}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              {copy.resultExperience.body}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {copy.resultExperience.features.map((feature) => (
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
              {copy.trust.eyebrow}
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {copy.trust.title}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">{copy.trust.body}</p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {copy.trust.standards.map((item, index) => {
              const Icon = TRUST_ICONS[index]!;
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
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
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
            {copy.finalCta.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            {copy.finalCta.body}
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={onStartAssessment}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              {copy.finalCta.cta}
              <ArrowRight
                className="h-5 w-5 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-400">
            {copy.finalCta.chips.map((chip) => (
              <span key={chip} className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" aria-hidden />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>
      <IqProductFooter />
    </main>
  );
}
