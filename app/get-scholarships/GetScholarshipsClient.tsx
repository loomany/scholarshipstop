'use client';

import Link from 'next/link';

/** Match `app/HomePageClient.tsx` section rhythm (hero + “How it works”). */
const homeSectionPadX =
  'pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6';

const homeY = {
  hero: 'pt-10 pb-8 sm:pt-12 sm:pb-9 lg:pt-14 lg:pb-10',
  block: 'py-7 sm:py-8 lg:py-9'
} as const;

const h2Section =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

const HOW_IT_WORKS_STEPS = [
  {
    n: 1,
    title: 'Create a free account',
    body: 'Sign up with email and password — quick and secure'
  },
  {
    n: 2,
    title: 'Complete your profile',
    body: 'Tell us about your background so we can surface scholarships you qualify for'
  },
  {
    n: 3,
    title: 'Apply before deadlines',
    body: 'Apply directly through official links before deadlines close'
  }
] as const;

export default function GetScholarshipsClient() {
  return (
    <>
      <section
        className={`border-b border-gray-100 bg-white ${homeY.hero} ${homeSectionPadX}`}
      >
        <div className="mx-auto w-full max-w-4xl text-center">
          <h1 className="text-pretty text-[clamp(1.8125rem,5.25vw+0.8rem,2.25rem)] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl sm:leading-[1.06] lg:text-[3rem] lg:leading-[1.05]">
            Get matched with scholarships in 2 minutes
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-gray-600 sm:mt-6 sm:text-xl sm:leading-relaxed">
            Create a free account and find scholarships you can actually apply
            for today
          </p>

          <div className="mx-auto mt-8 flex w-full max-w-lg justify-center sm:mt-9">
            <Link
              href="/signin/signup"
              className="inline-flex h-12 min-h-[48px] items-center justify-center rounded-xl bg-zinc-950 px-8 text-sm font-bold text-white shadow-md transition hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
            >
              Get My Matches
            </Link>
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-gray-500 sm:mt-6 sm:text-[0.9375rem]">
            7000+ scholarships • No essay options • Verified listings • Free to
            start
          </p>
        </div>
      </section>

      <section
        className={`border-b border-gray-100 bg-white ${homeY.block} ${homeSectionPadX}`}
      >
        <div className="mx-auto w-full max-w-5xl">
          <h2 className={`text-center text-pretty ${h2Section}`}>
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed">
            Find and apply to scholarships in minutes — no guesswork
          </p>

          <ul className="mx-auto mt-8 grid max-w-lg gap-6 sm:mt-10 sm:max-w-none sm:grid-cols-3 sm:gap-6 lg:gap-7">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <li
                key={item.n}
                className="rounded-2xl border border-gray-200 bg-gray-50/80 p-7 text-center shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)] transition hover:border-gray-300 hover:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.09)] sm:p-8 sm:text-left"
              >
                <div
                  className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-sm font-semibold tabular-nums leading-none text-gray-900 sm:mx-0"
                  aria-hidden
                >
                  {item.n}
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-snug text-pretty text-gray-900 sm:text-[1.125rem]">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-pretty text-gray-600 sm:text-base sm:leading-relaxed">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-2xl text-center text-pretty text-sm leading-relaxed text-gray-500 sm:mt-10 sm:text-[0.9375rem]">
            Sign up in about a minute — then finish your profile for the best
            matches
          </p>
        </div>
      </section>
    </>
  );
}
