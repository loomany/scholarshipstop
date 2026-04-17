'use client';

import Link from 'next/link';

import { AiMentorHowItWorksVideo } from '@/components/essay/AiMentorHowItWorksVideo';
import { homeEssayCtaClass } from '@/components/home/homeMarketingCtaClasses';

const steps = [
  'Understand the prompt',
  'Build your angle',
  'Create a strong outline',
  'Refine your draft'
] as const;

type HomeGuidedEssaySupportProps = {
  sectionPadX: string;
  sectionY: string;
};

export default function HomeGuidedEssaySupport({
  sectionPadX,
  sectionY
}: HomeGuidedEssaySupportProps) {
  return (
    <section
      className={`border-b border-gray-100 bg-gray-50 ${sectionY} ${sectionPadX}`}
      aria-labelledby="home-guided-essay-heading"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-11 xl:gap-14">
          <div className="flex min-w-0 flex-col gap-3 sm:gap-3.5">
            <AiMentorHowItWorksVideo
              className="relative aspect-video w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100"
              playButtonAriaLabel="Play video: guided essay support for scholarship applications"
            />
            <Link href="/essay" className={`group ${homeEssayCtaClass}`}>
              <span>Try Essay Mentor</span>
              <span
                className="text-orange-600 transition group-hover:translate-x-0.5 group-hover:text-orange-700"
                aria-hidden
              >
                →
              </span>
            </Link>
          </div>

          <div className="min-w-0">
            <h2
              id="home-guided-essay-heading"
              className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
            >
              Guided essay support for scholarship applications
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg sm:leading-relaxed">
              Use AI tools to brainstorm, structure, and refine your ideas based on your own
              experiences and goals.
            </p>
            <ol className="mt-6 list-none space-y-4 sm:mt-7 sm:space-y-4">
              {steps.map((label, i) => (
                <li key={label} className="flex gap-4">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-sm font-semibold tabular-nums text-gray-900"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-base font-medium leading-snug text-gray-900 sm:text-[1.0625rem]">
                    {label}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm leading-relaxed text-gray-500 sm:mt-7 sm:text-base sm:leading-relaxed">
              Designed to support your writing process, not replace your judgment or your voice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
