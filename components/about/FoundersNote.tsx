import Image from 'next/image';
import Link from 'next/link';
import { Code2, GraduationCap, Mail, ShieldCheck } from 'lucide-react';

const CONTACT_EMAIL = 'support@scholarshiptop.com';

const FOUNDER_SIGNALS = [
  {
    label: 'Founder-led product',
    value: 'Built by Daur, a programmer and scholarship student'
  },
  {
    label: 'Student background',
    value:
      'The workflow is shaped by the experience of studying with grant support'
  },
  {
    label: 'Engineering focus',
    value:
      'Designed around structured data, deadlines, source checks, and repeatable QA'
  }
] as const;

export default function FoundersNote() {
  return (
    <section
      id="founder"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_80px_-56px_rgba(15,23,42,0.55)]"
      aria-labelledby="founders-note-heading"
    >
      <div className="grid gap-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="relative min-h-[20rem] border-b border-zinc-200 bg-zinc-950 lg:border-b-0 lg:border-r">
          <Image
            src="/images/founder-daur.png"
            alt="Daur, founder of ScholarshipTop"
            fill
            sizes="(max-width: 1024px) 100vw, 22rem"
            className="object-cover object-center"
            quality={92}
            priority={false}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/86 via-zinc-950/24 to-transparent p-5 text-white">
            <p className="text-lg font-semibold tracking-tight">Daur</p>
            <p className="mt-1 text-sm text-zinc-200">
              Founder, software engineer, scholarship student
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-7 lg:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Human-built scholarship workflow
          </p>
          <h2
            id="founders-note-heading"
            className="mt-4 max-w-2xl text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl"
          >
            Built by someone who had to make scholarship decisions for real.
          </h2>
          <div className="mt-4 max-w-3xl space-y-4 text-sm leading-7 text-zinc-600 sm:text-base">
            <p>
              I am Daur, a programmer and the founder of ScholarshipTop. I
              studied with grant support, so I know how quickly scholarship
              search turns into a messy mix of deadlines, eligibility rules,
              document lists, provider pages, and uncertainty.
            </p>
            <p>
              ScholarshipTop is built as a practical workspace, not a generic
              directory. The product is designed to organize scholarship facts,
              show what still needs verification, and help students move from
              search to a realistic shortlist with less guesswork.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {FOUNDER_SIGNALS.map((item, index) => {
              const Icon =
                [ShieldCheck, GraduationCap, Code2][index] ?? ShieldCheck;
              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4"
                >
                  <Icon className="h-4 w-4 text-orange-600" aria-hidden />
                  <p className="mt-3 text-sm font-semibold text-zinc-950">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {CONTACT_EMAIL}
            </a>
            <Link
              href="/scholarship-verification-methodology"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
            >
              Verification methodology
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
