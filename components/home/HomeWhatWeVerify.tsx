import Link from 'next/link';
import { FileCheck2, Link2, UserCheck } from 'lucide-react';

const h2Class =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

const items = [
  {
    icon: UserCheck,
    title: 'Eligibility signals',
    body:
      'We summarize degree level, residency, field, and other common requirements so you can spot fit faster.'
  },
  {
    icon: FileCheck2,
    title: 'Deadlines and award details',
    body:
      'We track dates and amounts as stated by the provider when the listing was last reviewed — and flag when details look incomplete.'
  },
  {
    icon: Link2,
    title: 'Where to apply next',
    body:
      'We prioritize pathways that point to official program pages and provider-hosted applications.'
  }
] as const;

type HomeWhatWeVerifyProps = {
  sectionPadX: string;
  sectionY: string;
};

export default function HomeWhatWeVerify({ sectionPadX, sectionY }: HomeWhatWeVerifyProps) {
  return (
    <section
      className={`border-b border-gray-100 bg-white ${sectionY} ${sectionPadX}`}
      aria-labelledby="home-what-we-verify-heading"
    >
      <div className="mx-auto w-full max-w-5xl">
        <h2
          id="home-what-we-verify-heading"
          className={`text-center text-pretty ${h2Class}`}
        >
          What we verify
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed">
          Clear signals so you can evaluate opportunities quickly — before you invest time in an
          application.
        </p>
        <ul className="mx-auto mt-8 grid max-w-lg gap-6 sm:mt-10 sm:max-w-none sm:grid-cols-3 sm:gap-6 lg:gap-7">
          {items.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-2xl border border-gray-200 bg-gray-50/80 p-7 text-center shadow-[0_4px_20px_-10px_rgba(15,23,42,0.06)] sm:p-8 sm:text-left"
            >
              <span
                className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-900 ring-1 ring-gray-200 sm:mx-0"
                aria-hidden
              >
                <Icon className="h-6 w-6" strokeWidth={1.85} />
              </span>
              <h3 className="mt-5 text-lg font-semibold leading-snug text-pretty text-gray-900 sm:text-[1.125rem]">
                {title}
              </h3>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-pretty text-gray-600 sm:text-base sm:leading-relaxed">
                {body}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center">
          <Link
            href="/how-scholarshiptop-works"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-2"
          >
            See how ScholarshipTop works
          </Link>
        </div>
      </div>
    </section>
  );
}
